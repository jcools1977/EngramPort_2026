import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import path from "node:path";
import test from "node:test";

const moduleRoot=process.env.W1_1_OIDC_PROVIDER_MODULE_ROOT??path.resolve(import.meta.dirname,"..");
const provider=await import(new URL(`file://${path.join(moduleRoot,"packages/git-adapter/src/oidc-provider.mjs")}`));
const selected=process.env.W1_1_OIDC_PROVIDER_CASE??"all";
const ISSUER=provider.GOOGLE_OIDC_ISSUER,CLIENT="engramport-provider-synthetic",NONCE="provider-synthetic-nonce",NOW=Date.parse("2026-08-25T16:00:00Z");
function check(name,operation){test(name,{skip:selected!=="all"&&selected!==name},operation);}
async function outcome(operation){try{return {outcome:"accepted",value:await operation()};}catch(error){return {outcome:error.code??error.name,error};}}
function response(body,{status=200,cacheControl="max-age=60"}={}){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":cacheControl}});}
function keyFixture(kid){const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});return {privateKey,jwk:{...publicKey.export({format:"jwk"}),kid,alg:"RS256",use:"sig"}};}
const encode=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
function token(key,payload){const head=encode({alg:"RS256",kid:key.jwk.kid,typ:"JWT"}),body=encode(payload),input=`${head}.${body}`;return `${input}.${sign("RSA-SHA256",Buffer.from(input),key.privateKey).toString("base64url")}`;}

check("discovery",async()=>{
  const document={issuer:ISSUER,authorization_endpoint:"https://accounts.google.com/o/oauth2/v2/auth",token_endpoint:"https://oauth2.googleapis.com/token",jwks_uri:"https://www.googleapis.com/oauth2/v3/certs"};
  let unresolvedFetches=0,discoveryRedirect=null;
  const positive=await provider.discoverOidcProvider({issuer:ISSUER,fetchImpl:async(_url,init)=>{discoveryRedirect=init.redirect;return response(document);}}),negative=await outcome(()=>provider.discoverOidcProvider({issuer:ISSUER,fetchImpl:async()=>response({...document,issuer:"https://foreign.invalid"})})),unresolved=await outcome(()=>provider.createGoogleOidcBoundaryFromEnv({OIDC_ISSUER:ISSUER,OIDC_CLIENT_ID:CLIENT},{fetchImpl:async()=>{unresolvedFetches+=1;return response(document);}}));
  const hosts=[new URL(positive.authorizationEndpoint).host,new URL(positive.tokenEndpoint).host,new URL(positive.jwksUri).host].join(",");
  console.log(`W1_1_OIDC_PROVIDER discovery issuer=${positive.issuer===ISSUER} hosts=${hosts} auth_path=${new URL(positive.authorizationEndpoint).pathname} mismatch=${negative.outcome} unresolved=${unresolved.outcome} before_fetch=${unresolvedFetches===0}`);
  assert.equal(positive.authorizationEndpoint,document.authorization_endpoint);assert.equal(positive.tokenEndpoint,document.token_endpoint);assert.equal(positive.jwksUri,document.jwks_uri);assert.equal(discoveryRedirect,"manual");assert.equal(negative.outcome,"OIDC_DISCOVERY_ISSUER_REFUSED");assert.equal(unresolved.outcome,"OIDC_CLIENT_SECRET_UNRESOLVED");assert.equal(unresolvedFetches,0);
});

check("jwks-lifecycle",async()=>{
  const a=keyFixture("a"),b=keyFixture("b"),c=keyFixture("c"),d=keyFixture("d");let generation=0,now=NOW;const receivers=[];
  const documents=[[a.jwk,b.jwk],[b.jwk,c.jwk],[c.jwk,d.jwk]],cache=new provider.OidcJwksCache({jwksUri:"https://www.googleapis.com/oauth2/v3/certs",clock:()=>new Date(now),fetchImpl:async function(){receivers.push(this);return response({keys:documents[generation]},{cacheControl:"max-age=1"});}});
  const first=(await cache.resolve("a")).kid,overlap=(await cache.resolve("b")).kid;generation=1;const unknown=(await cache.resolve("c")).kid,disappeared=await outcome(()=>cache.resolve("a"));generation=2;now+=2000;const afterExpiry=(await cache.resolve("d")).kid,inventory=cache.inventory();
  console.log(`W1_1_OIDC_PROVIDER jwks first=${first} overlap=${overlap} unknown=${unknown} disappeared=${disappeared.outcome} expired_refresh=${afterExpiry} kids=${inventory.kids.join(",")}`);
  assert.deepEqual({first,overlap,unknown,disappeared:disappeared.outcome,afterExpiry,kids:inventory.kids},{first:"a",overlap:"b",unknown:"c",disappeared:"OIDC_KEY_NOT_FOUND",afterExpiry:"d",kids:["c","d"]});assert.equal(receivers.every(receiver=>receiver===undefined),true);
});

check("exchange",async()=>{
  let observed=null;
  const exchange=provider.createOidcTokenExchange({tokenEndpoint:"https://oauth2.googleapis.com/token",clientId:CLIENT,clientSecret:"synthetic-client-secret",fetchImpl:async(_url,init)=>{observed=Object.fromEntries(init.body);return response({id_token:"synthetic-id-token",access_token:"synthetic-discarded"});}});
  const accepted=await exchange({code:"synthetic-code",codeVerifier:"synthetic-verifier",redirectUri:"http://localhost:8787/auth/callback",clientId:CLIENT}),negative=await outcome(()=>exchange({code:"foreign",codeVerifier:"synthetic-verifier",redirectUri:"http://localhost:8787/auth/callback",clientId:"foreign-client"})),inventory=exchange.transientInventory();
  const exact=Object.keys(accepted).join(","),verifier=observed.code_verifier==="synthetic-verifier";
  console.log(`W1_1_OIDC_PROVIDER exchange id_only=${exact} verifier=${verifier} client=${observed.client_id===CLIENT} negative=${negative.outcome} retained=${inventory.exchanges}/${inventory.responses}`);
  assert.deepEqual(accepted,{id_token:"synthetic-id-token"});assert.equal(verifier,true);assert.equal(observed.grant_type,"authorization_code");assert.equal(observed.client_secret,"synthetic-client-secret");assert.equal(negative.outcome,"OIDC_CLIENT_REFUSED");assert.deepEqual(inventory,{exchanges:0,responses:0});
});

check("azp",async()=>{
  const signing=keyFixture("azp"),jwks={resolve:async()=>Object.freeze({...signing.jwk,key:(await import("node:crypto")).createPublicKey({key:signing.jwk,format:"jwk"})})},verifier=provider.createProviderOidcVerifier({jwks,issuer:ISSUER,audience:CLIENT,clock:()=>new Date(NOW)}),base={iss:ISSUER,sub:"synthetic-sub",aud:[CLIENT,"companion-client"],azp:CLIENT,exp:Math.floor((NOW+60_000)/1000),nonce:NONCE};
  const positive=await outcome(()=>verifier.verify({token:token(signing,base),nonce:NONCE})),negative=await outcome(()=>verifier.verify({token:token(signing,{...base,azp:"foreign-client"}),nonce:NONCE}));
  console.log(`W1_1_OIDC_PROVIDER azp positive=${positive.outcome} foreign=${negative.outcome}`);
  assert.equal(positive.outcome,"accepted");assert.equal(negative.outcome,"OIDC_AUTHORIZED_PARTY_REFUSED");
});

check("subject",()=>{
  const captured=provider.captureOidcSubject({iss:ISSUER,sub:"recorded-synthetic-sub",aud:CLIENT,azp:null,exp:1,nonce:"discarded",email:"not-authority"}),surface=Object.keys(captured).sort().join(",");
  console.log(`W1_1_OIDC_PROVIDER subject surface=${surface} issuer=${captured.iss===ISSUER} value=${captured.sub}`);
  assert.deepEqual(captured,{iss:ISSUER,sub:"recorded-synthetic-sub"});
});
