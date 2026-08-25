import { createHash, randomBytes as secureRandomBytes } from "node:crypto";
import { InMemoryOidcTransactionStore } from "./oidc-transaction-store.mjs";

const BASE64URL=/^[A-Za-z0-9_-]+$/;

export class OidcClientError extends Error{
  constructor(code,message=code){super(message);this.name="OidcClientError";this.code=code;}
}

function refuse(code,message){throw new OidcClientError(code,message);}
function required(value,label){if(typeof value!=="string"||value.length===0)throw new TypeError(`${label} required`);return value;}
function secret(randomBytes){const value=randomBytes(32);if(!Buffer.isBuffer(value)||value.length<32)throw new TypeError("randomBytes must return at least 32 bytes");return value.toString("base64url");}

export function createOidcClient({issuer,authorizationEndpoint,clientId,redirectUri,scope="openid",verifier,exchange,transactionStore=new InMemoryOidcTransactionStore(),clock=()=>new Date(),transactionTtlMs=10*60_000,randomBytes=secureRandomBytes}={}){
  const configuredIssuer=new URL(required(issuer,"issuer"));
  if(configuredIssuer.protocol!=="https:")throw new TypeError("issuer must use https");
  const configuredAuthorization=new URL(authorizationEndpoint??"authorize",`${configuredIssuer.href.replace(/\/$/,"")}/`);
  if(configuredAuthorization.protocol!=="https:")throw new TypeError("authorization endpoint must use https");
  const configuredRedirect=required(redirectUri,"redirectUri"),configuredClient=required(clientId,"clientId");
  if(typeof verifier?.verify!=="function")throw new TypeError("OIDC verifier required");
  if(typeof exchange!=="function")throw new TypeError("OIDC token exchange required");
  if(typeof clock!=="function"||typeof randomBytes!=="function")throw new TypeError("clock and randomBytes required");
  if(typeof transactionStore?.create!=="function"||typeof transactionStore?.claim!=="function")throw new TypeError("OIDC transaction store required");
  if(!Number.isSafeInteger(transactionTtlMs)||transactionTtlMs<=0)throw new TypeError("positive transactionTtlMs required");
  const inFlight=new Set();

  async function start(){
    const state=secret(randomBytes),nonce=secret(randomBytes),codeVerifier=secret(randomBytes);
    const codeChallenge=createHash("sha256").update(codeVerifier,"ascii").digest("base64url");
    if(!BASE64URL.test(state)||!BASE64URL.test(nonce)||!BASE64URL.test(codeVerifier))throw new TypeError("generated OIDC values must be base64url");
    const expiresAt=clock().getTime()+transactionTtlMs;
    const stored=await transactionStore.create(Object.freeze({state,nonce,codeVerifier,redirectUri:configuredRedirect,expiresAt,status:"pending"})); /* W1_1_OIDC_DURABLE_CREATE_BEFORE_REDIRECT */
    if(stored?.status!=="stored")refuse("OIDC_STATE_CONFLICT","state already exists");
    const url=new URL(configuredAuthorization);
    url.search=new URLSearchParams({response_type:"code",client_id:configuredClient,redirect_uri:configuredRedirect,scope,state,nonce,code_challenge:codeChallenge,code_challenge_method:"S256"}).toString();
    return Object.freeze({authorizationUrl:url.href,state,expiresAt});
  }

  async function take(state,consume){
    if(typeof state!=="string"||state.length===0)refuse("OIDC_STATE_REFUSED","state required");
    const claimed=await transactionStore.claim(state,clock().getTime(),async transaction=>{
      if(transaction.expiresAt<=clock().getTime() /* W1_1_OIDC_CLIENT_EXPIRY_GUARD */)refuse("OIDC_TRANSACTION_EXPIRED","OIDC transaction expired");
      return consume(transaction);
    });
    if(claimed?.status==="expired")refuse("OIDC_TRANSACTION_EXPIRED","OIDC transaction expired");
    if(claimed?.status!=="claimed")refuse("OIDC_STATE_REFUSED","state is unknown or already used");
    return claimed.value;
  }

  async function callback({state,code,redirectUri:actualRedirect}={}){
    return take(state,async transaction=>{ /* W1_1_OIDC_CLIENT_ONE_TIME_GUARD */
      const transient={code,tokenSet:null};inFlight.add(transient);
      try{
        if(actualRedirect!==transaction.redirectUri)refuse("OIDC_REDIRECT_URI_REFUSED","redirect URI mismatch");
        required(code,"authorization code");
        transient.tokenSet=await exchange(Object.freeze({code,codeVerifier:transaction.codeVerifier,redirectUri:transaction.redirectUri,clientId:configuredClient}));
        if(typeof transient.tokenSet?.id_token!=="string")refuse("OIDC_TOKEN_EXCHANGE_REFUSED","ID token required");
        return await verifier.verify({token:transient.tokenSet.id_token,nonce:transaction.nonce});
      }finally{inFlight.delete(transient);}
    });
  }

  function transientInventory(){return Object.freeze({transactions:typeof transactionStore.transientCount==="function"?transactionStore.transientCount():null,codes:inFlight.size,tokens:[...inFlight].filter(value=>value.tokenSet!==null).length,verifiers:inFlight.size});}
  return Object.freeze({start,callback,transientInventory});
}
