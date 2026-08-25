import { createPublicKey, verify as verifySignature } from "node:crypto";

const BASE64URL=/^[A-Za-z0-9_-]*$/;

export class OidcVerificationError extends Error{
  constructor(code,message=code){super(message);this.name="OidcVerificationError";this.code=code;}
}

function refuse(code,message){throw new OidcVerificationError(code,message);}

function decodeSegment(segment,label,{empty=false}={}){
  if(typeof segment!=="string"||(!empty&&segment.length===0)||!BASE64URL.test(segment))refuse("OIDC_TOKEN_MALFORMED",`${label} is not base64url`);
  try{return Buffer.from(segment,"base64url");}catch{return refuse("OIDC_TOKEN_MALFORMED",`${label} is not base64url`);}
}

function parseJson(segment,label){
  try{
    const value=JSON.parse(decodeSegment(segment,label).toString("utf8"));
    if(value===null||Array.isArray(value)||typeof value!=="object")refuse("OIDC_TOKEN_MALFORMED",`${label} is not an object`);
    return value;
  }
  catch(error){if(error instanceof OidcVerificationError)throw error;return refuse("OIDC_TOKEN_MALFORMED",`${label} is not JSON`);}
}

function exactAudience(actual,expected){return typeof actual==="string"?actual===expected:Array.isArray(actual)&&actual.length>0&&actual.every(value=>typeof value==="string")&&actual.includes(expected);}

function freezeClaims(payload){
  const aud=Array.isArray(payload.aud)?Object.freeze([...payload.aud]):payload.aud;
  return Object.freeze({iss:payload.iss,sub:payload.sub,aud,exp:payload.exp,nonce:payload.nonce});
}

export function createOidcVerifier({jwks,issuer,audience,clock=()=>new Date()}={}){
  if(typeof issuer!=="string"||issuer.length===0)throw new TypeError("issuer required");
  if(typeof audience!=="string"||audience.length===0)throw new TypeError("audience required");
  if(typeof clock!=="function")throw new TypeError("clock required");
  if(!Array.isArray(jwks?.keys)||jwks.keys.length===0)throw new TypeError("JWKS keys required");
  const keys=new Map();
  for(const supplied of jwks.keys){
    if(typeof supplied?.kid!=="string"||supplied.kid.length===0||keys.has(supplied.kid))throw new TypeError("each JWKS key requires a unique kid");
    if(!["active","retired"].includes(supplied.status))throw new TypeError("each JWKS key requires active or retired status");
    if(typeof supplied.d==="string")throw new TypeError("JWKS must contain public keys only");
    const key=Object.freeze({...supplied,key:createPublicKey({key:supplied,format:"jwk"})});
    keys.set(supplied.kid,key);
  }
  const inFlight=new Set();

  async function verify({token,nonce}={}){
    const transient={token,claims:null};inFlight.add(transient);
    try{
      if(typeof token!=="string")refuse("OIDC_TOKEN_MALFORMED","token required");
      const parts=token.split(".");
      if(parts.length!==3)refuse("OIDC_TOKEN_MALFORMED","compact token requires three segments");
      const [encodedHeader,encodedPayload,encodedSignature]=parts,header=parseJson(encodedHeader,"header"),payload=parseJson(encodedPayload,"payload");
      transient.claims=payload;
      if(header.alg==="none")refuse("OIDC_ALGORITHM_NONE_REFUSED","unsigned tokens are refused");
      if(header.alg!=="RS256")refuse("OIDC_ALGORITHM_CONFUSION_REFUSED","only RS256 is accepted");
      if(typeof header.kid!=="string")refuse("OIDC_KEY_NOT_FOUND","kid required");
      const selected=keys.get(header.kid);
      if(!selected)refuse("OIDC_KEY_NOT_FOUND","signing key not found");
      if(selected.status!=="active")refuse("OIDC_KEY_RETIRED","retired signing key refused");
      if(selected.kty!=="RSA"||selected.alg!=="RS256"||selected.use!=="sig")refuse("OIDC_KEY_TYPE_REFUSED","signing key metadata refused");
      const signingInput=Buffer.from(`${encodedHeader}.${encodedPayload}`),signature=decodeSegment(encodedSignature,"signature");
      if(!verifySignature("RSA-SHA256",signingInput,selected.key,signature))refuse("OIDC_SIGNATURE_REFUSED","signature verification failed");
      if(payload.iss!==issuer)refuse("OIDC_ISSUER_REFUSED","issuer mismatch");
      if(!exactAudience(payload.aud,audience))refuse("OIDC_AUDIENCE_REFUSED","audience mismatch");
      if(!Number.isInteger(payload.exp)||payload.exp*1000<=clock().getTime())refuse("OIDC_EXPIRED","token expired");
      if(typeof nonce!=="string"||nonce.length===0||payload.nonce!==nonce)refuse("OIDC_NONCE_REFUSED","nonce mismatch");
      if(typeof payload.sub!=="string"||payload.sub.length===0)refuse("OIDC_SUBJECT_REFUSED","subject required");
      return freezeClaims(payload);
    }finally{inFlight.delete(transient);}
  }

  return Object.freeze({verify,transientInventory:()=>Object.freeze({tokens:inFlight.size,claims:[...inFlight].filter(item=>item.claims!==null).length})});
}
