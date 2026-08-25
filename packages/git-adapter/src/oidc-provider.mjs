import { createPublicKey, verify as verifySignature } from "node:crypto";

export const GOOGLE_OIDC_ISSUER="https://accounts.google.com";
const BASE64URL=/^[A-Za-z0-9_-]*$/;

export class OidcProviderError extends Error{
  constructor(code,message=code){super(message);this.name="OidcProviderError";this.code=code;}
}

function refuse(code,message){throw new OidcProviderError(code,message);}
function required(value,label,code="OIDC_PROVIDER_CONFIGURATION_REFUSED"){if(typeof value!=="string"||value.length===0)refuse(code,`${label} required`);return value;}
function httpsEndpoint(value,label){let url;try{url=new URL(required(value,label));}catch(error){if(error instanceof OidcProviderError)throw error;refuse("OIDC_DISCOVERY_REFUSED",`${label} invalid`);}if(url.protocol!=="https:")refuse("OIDC_DISCOVERY_REFUSED",`${label} must use https`);return url.href;}
function decodeSegment(segment,label){if(typeof segment!=="string"||segment.length===0||!BASE64URL.test(segment))refuse("OIDC_TOKEN_MALFORMED",`${label} is not base64url`);try{return Buffer.from(segment,"base64url");}catch{return refuse("OIDC_TOKEN_MALFORMED",`${label} is not base64url`);}}
function parseJsonSegment(segment,label){try{const value=JSON.parse(decodeSegment(segment,label).toString("utf8"));if(!value||Array.isArray(value)||typeof value!=="object")refuse("OIDC_TOKEN_MALFORMED",`${label} is not an object`);return value;}catch(error){if(error instanceof OidcProviderError)throw error;return refuse("OIDC_TOKEN_MALFORMED",`${label} is not JSON`);}}
async function jsonResponse(response,code){if(!response?.ok)refuse(code,`${code} (${response?.status??"no response"})`);try{const value=await response.json();if(!value||Array.isArray(value)||typeof value!=="object")refuse(code,`${code} body refused`);return value;}catch(error){if(error instanceof OidcProviderError)throw error;return refuse(code,`${code} body refused`);}}

export function requireOidcClientSecret(env){
  return required(env?.OIDC_CLIENT_SECRET,"OIDC client secret","OIDC_CLIENT_SECRET_UNRESOLVED");
}

export async function discoverOidcProvider({issuer,fetchImpl=fetch}={}){
  const configured=required(issuer,"issuer");
  if(configured!==GOOGLE_OIDC_ISSUER)refuse("OIDC_PROVIDER_NOT_ALLOWED","only the configured Google issuer is allowed");
  const response=await fetchImpl(`${configured}/.well-known/openid-configuration`,{headers:{Accept:"application/json"},redirect:"manual"});
  const document=await jsonResponse(response,"OIDC_DISCOVERY_REFUSED");
  if(document.issuer!==configured /* W1_1_PROVIDER_DISCOVERY_ISSUER_PIN */)refuse("OIDC_DISCOVERY_ISSUER_REFUSED","discovered issuer mismatch");
  const configuration=Object.freeze({
    issuer:configured,
    authorizationEndpoint:httpsEndpoint(document.authorization_endpoint,"authorization_endpoint"), /* W1_1_PROVIDER_DISCOVERY_ENDPOINTS */
    tokenEndpoint:httpsEndpoint(document.token_endpoint,"token_endpoint"),
    jwksUri:httpsEndpoint(document.jwks_uri,"jwks_uri"),
  });
  return configuration;
}

function cacheLifetime(response,now){
  const match=/(?:^|,)\s*max-age=(\d+)\b/i.exec(response.headers?.get?.("cache-control")??"");
  if(match)return now+Number(match[1])*1000;
  const expires=Date.parse(response.headers?.get?.("expires")??"");
  return Number.isFinite(expires)&&expires>now?expires:now;
}

export class OidcJwksCache{
  #jwksUri;#fetch;#clock;#keys=new Map();#expiresAt=0;#refreshing=null;
  constructor({jwksUri,fetchImpl=fetch,clock=()=>new Date()}={}){this.#jwksUri=httpsEndpoint(jwksUri,"jwks_uri");if(typeof fetchImpl!=="function"||typeof clock!=="function")throw new TypeError("JWKS fetch and clock required");this.#fetch=(...args)=>fetchImpl(...args);this.#clock=clock;}
  async #refresh(){
    if(this.#refreshing)return this.#refreshing;
    this.#refreshing=(async()=>{
      const now=this.#clock().getTime(),response=await this.#fetch(this.#jwksUri,{headers:{Accept:"application/json"},redirect:"manual"}),document=await jsonResponse(response,"OIDC_JWKS_REFUSED");
      if(!Array.isArray(document.keys)||document.keys.length===0)refuse("OIDC_JWKS_REFUSED","JWKS keys required");
      const replacement=new Map();
      for(const supplied of document.keys){
        if(typeof supplied?.kid!=="string"||supplied.kid.length===0||replacement.has(supplied.kid)||supplied.kty!=="RSA"||supplied.alg!=="RS256"||supplied.use!=="sig"||typeof supplied.d==="string")refuse("OIDC_JWKS_REFUSED","JWKS public signing key refused");
        let key;try{key=createPublicKey({key:supplied,format:"jwk"});}catch{return refuse("OIDC_JWKS_REFUSED","JWKS public key refused");}
        replacement.set(supplied.kid,Object.freeze({...supplied,key}));
      }
      this.#keys=replacement; /* W1_1_PROVIDER_JWKS_REPLACE */
      this.#expiresAt=cacheLifetime(response,now);
    })().finally(()=>{this.#refreshing=null;});
    return this.#refreshing;
  }
  async resolve(kid){
    if(typeof kid!=="string"||kid.length===0)refuse("OIDC_KEY_NOT_FOUND","kid required");
    if(this.#clock().getTime()>=this.#expiresAt)await this.#refresh(); /* W1_1_PROVIDER_JWKS_EXPIRY_REFRESH */
    let selected=this.#keys.get(kid);
    if(!selected){await this.#refresh();selected=this.#keys.get(kid);} /* W1_1_PROVIDER_JWKS_UNKNOWN_REFRESH */
    if(!selected)refuse("OIDC_KEY_NOT_FOUND","signing key not found");
    return selected;
  }
  inventory(){return Object.freeze({kids:Object.freeze([...this.#keys.keys()].sort()),expiresAt:this.#expiresAt});}
}

function audienceValues(value){if(typeof value==="string"&&value.length>0)return [value];if(Array.isArray(value)&&value.length>0&&value.every(item=>typeof item==="string"&&item.length>0))return value;return [];}
function freezeVerified(payload){const aud=Array.isArray(payload.aud)?Object.freeze([...payload.aud]):payload.aud;return Object.freeze({iss:payload.iss,sub:payload.sub,aud,azp:payload.azp??null,exp:payload.exp,nonce:payload.nonce});}

export function createProviderOidcVerifier({jwks,issuer,audience,clock=()=>new Date()}={}){
  const configuredIssuer=required(issuer,"issuer"),configuredAudience=required(audience,"audience");
  if(typeof jwks?.resolve!=="function"||typeof clock!=="function")throw new TypeError("JWKS resolver and clock required");
  const inFlight=new Set();
  async function verify({token,nonce}={}){
    const transient={token,claims:null};inFlight.add(transient);
    try{
      if(typeof token!=="string")refuse("OIDC_TOKEN_MALFORMED","token required");
      const parts=token.split(".");if(parts.length!==3)refuse("OIDC_TOKEN_MALFORMED","compact token requires three segments");
      const [encodedHeader,encodedPayload,encodedSignature]=parts,header=parseJsonSegment(encodedHeader,"header"),payload=parseJsonSegment(encodedPayload,"payload");transient.claims=payload;
      if(header.alg==="none")refuse("OIDC_ALGORITHM_NONE_REFUSED","unsigned tokens are refused");
      if(header.alg!=="RS256")refuse("OIDC_ALGORITHM_CONFUSION_REFUSED","only RS256 is accepted");
      const selected=await jwks.resolve(header.kid);
      const signingInput=Buffer.from(`${encodedHeader}.${encodedPayload}`),signature=decodeSegment(encodedSignature,"signature");
      if(!verifySignature("RSA-SHA256",signingInput,selected.key,signature))refuse("OIDC_SIGNATURE_REFUSED","signature verification failed");
      if(payload.iss!==configuredIssuer)refuse("OIDC_ISSUER_REFUSED","issuer mismatch");
      const audiences=audienceValues(payload.aud);if(!audiences.includes(configuredAudience))refuse("OIDC_AUDIENCE_REFUSED","audience mismatch");
      if((audiences.length>1||payload.azp!==undefined)&&payload.azp!==configuredAudience /* W1_1_PROVIDER_AZP_GUARD */)refuse("OIDC_AUTHORIZED_PARTY_REFUSED","authorized party mismatch");
      if(!Number.isInteger(payload.exp)||payload.exp*1000<=clock().getTime())refuse("OIDC_EXPIRED","token expired");
      if(typeof nonce!=="string"||nonce.length===0||payload.nonce!==nonce)refuse("OIDC_NONCE_REFUSED","nonce mismatch");
      if(typeof payload.sub!=="string"||payload.sub.length===0)refuse("OIDC_SUBJECT_REFUSED","subject required");
      return freezeVerified(payload);
    }finally{inFlight.delete(transient);}
  }
  return Object.freeze({verify,transientInventory:()=>Object.freeze({tokens:inFlight.size,claims:[...inFlight].filter(item=>item.claims!==null).length})});
}

export function createOidcTokenExchange({tokenEndpoint,clientId,clientSecret,fetchImpl=fetch}={}){
  const endpoint=httpsEndpoint(tokenEndpoint,"token_endpoint"),configuredClient=required(clientId,"clientId"),secret=required(clientSecret,"clientSecret","OIDC_CLIENT_SECRET_UNRESOLVED");
  if(typeof fetchImpl!=="function")throw new TypeError("token fetch required");
  const inFlight=new Set();
  async function exchange({code,codeVerifier,redirectUri,clientId:requestedClient}={}){
    if(requestedClient!==configuredClient)refuse("OIDC_CLIENT_REFUSED","client mismatch");
    const transient={code,response:null};inFlight.add(transient);
    try{
      const body=new URLSearchParams({code:required(code,"authorization code"),client_id:configuredClient,client_secret:secret,redirect_uri:required(redirectUri,"redirectUri"),grant_type:"authorization_code",code_verifier:required(codeVerifier,"codeVerifier") /* W1_1_PROVIDER_EXCHANGE_PKCE */});
      const response=await fetchImpl(endpoint,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body,redirect:"manual"});
      transient.response=await jsonResponse(response,"OIDC_TOKEN_EXCHANGE_REFUSED");
      if(typeof transient.response.refresh_token==="string")refuse("OIDC_REFRESH_TOKEN_REFUSED","refresh token refused");
      if(typeof transient.response.id_token!=="string")refuse("OIDC_TOKEN_EXCHANGE_REFUSED","ID token required");
      return Object.freeze({id_token:transient.response.id_token});
    }finally{inFlight.delete(transient);}
  }
  exchange.transientInventory=()=>Object.freeze({exchanges:inFlight.size,responses:[...inFlight].filter(item=>item.response!==null).length});
  return exchange;
}

export function captureOidcSubject(claims){
  if(typeof claims?.iss!=="string"||typeof claims?.sub!=="string")refuse("OIDC_SUBJECT_REFUSED","verified subject required");
  return Object.freeze({iss:claims.iss,sub:claims.sub}); /* W1_1_PROVIDER_SUBJECT_EXACT_SURFACE */
}

export async function createGoogleOidcBoundaryFromEnv(env,{fetchImpl=fetch,clock=()=>new Date()}={}){
  const issuer=env?.OIDC_ISSUER??GOOGLE_OIDC_ISSUER,clientId=required(env?.OIDC_CLIENT_ID,"OIDC client id"),clientSecret=requireOidcClientSecret(env);
  const configuration=await discoverOidcProvider({issuer,fetchImpl});
  const jwks=new OidcJwksCache({jwksUri:configuration.jwksUri,fetchImpl,clock});
  return Object.freeze({
    ...configuration,
    verifier:createProviderOidcVerifier({jwks,issuer,audience:clientId,clock}),
    exchange:createOidcTokenExchange({tokenEndpoint:configuration.tokenEndpoint,clientId,clientSecret,fetchImpl}),
  });
}
