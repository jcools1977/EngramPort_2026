import { createHash, randomBytes as secureRandomBytes } from "node:crypto";

const BASE64URL=/^[A-Za-z0-9_-]+$/;

export class OidcClientError extends Error{
  constructor(code,message=code){super(message);this.name="OidcClientError";this.code=code;}
}

function refuse(code,message){throw new OidcClientError(code,message);}
function required(value,label){if(typeof value!=="string"||value.length===0)throw new TypeError(`${label} required`);return value;}
function secret(randomBytes){const value=randomBytes(32);if(!Buffer.isBuffer(value)||value.length<32)throw new TypeError("randomBytes must return at least 32 bytes");return value.toString("base64url");}

export function createOidcClient({issuer,clientId,redirectUri,scope="openid",verifier,exchange,clock=()=>new Date(),transactionTtlMs=10*60_000,randomBytes=secureRandomBytes}={}){
  const configuredIssuer=new URL(required(issuer,"issuer"));
  if(configuredIssuer.protocol!=="https:")throw new TypeError("issuer must use https");
  const configuredRedirect=required(redirectUri,"redirectUri"),configuredClient=required(clientId,"clientId");
  if(typeof verifier?.verify!=="function")throw new TypeError("OIDC verifier required");
  if(typeof exchange!=="function")throw new TypeError("OIDC token exchange required");
  if(typeof clock!=="function"||typeof randomBytes!=="function")throw new TypeError("clock and randomBytes required");
  if(!Number.isSafeInteger(transactionTtlMs)||transactionTtlMs<=0)throw new TypeError("positive transactionTtlMs required");
  const transactions=new Map(),inFlight=new Set();

  function start(){
    const state=secret(randomBytes),nonce=secret(randomBytes),codeVerifier=secret(randomBytes);
    const codeChallenge=createHash("sha256").update(codeVerifier,"ascii").digest("base64url");
    if(!BASE64URL.test(state)||!BASE64URL.test(nonce)||!BASE64URL.test(codeVerifier))throw new TypeError("generated OIDC values must be base64url");
    const expiresAt=clock().getTime()+transactionTtlMs;
    transactions.set(state,Object.freeze({state,nonce,codeVerifier,redirectUri:configuredRedirect,expiresAt}));
    const url=new URL("authorize",`${configuredIssuer.href.replace(/\/$/,"")}/`);
    url.search=new URLSearchParams({response_type:"code",client_id:configuredClient,redirect_uri:configuredRedirect,scope,state,nonce,code_challenge:codeChallenge,code_challenge_method:"S256"}).toString();
    return Object.freeze({authorizationUrl:url.href,state,expiresAt});
  }

  function take(state){
    if(typeof state!=="string"||state.length===0)refuse("OIDC_STATE_REFUSED","state required");
    const transaction=transactions.get(state);
    if(!transaction)refuse("OIDC_STATE_REFUSED","state is unknown or already used");
    transactions.delete(state); /* W1_1_OIDC_CLIENT_ONE_TIME_GUARD */
    if(transaction.expiresAt<=clock().getTime() /* W1_1_OIDC_CLIENT_EXPIRY_GUARD */)refuse("OIDC_TRANSACTION_EXPIRED","OIDC transaction expired");
    return transaction;
  }

  async function callback({state,code,redirectUri:actualRedirect}={}){
    const transaction=take(state),transient={code,tokenSet:null};inFlight.add(transient);
    try{
      if(actualRedirect!==transaction.redirectUri)refuse("OIDC_REDIRECT_URI_REFUSED","redirect URI mismatch");
      required(code,"authorization code");
      transient.tokenSet=await exchange(Object.freeze({code,codeVerifier:transaction.codeVerifier,redirectUri:transaction.redirectUri,clientId:configuredClient}));
      if(typeof transient.tokenSet?.id_token!=="string")refuse("OIDC_TOKEN_EXCHANGE_REFUSED","ID token required");
      return await verifier.verify({token:transient.tokenSet.id_token,nonce:transaction.nonce});
    }finally{inFlight.delete(transient);}
  }

  function transientInventory(){return Object.freeze({transactions:transactions.size,codes:inFlight.size,tokens:[...inFlight].filter(value=>value.tokenSet!==null).length,verifiers:inFlight.size});}
  return Object.freeze({start,callback,transientInventory});
}
