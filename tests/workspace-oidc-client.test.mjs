import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root=process.env.W1_1_OIDC_CLIENT_MODULE_ROOT??path.resolve(import.meta.dirname,"..");
const moduleUrl=relative=>pathToFileURL(path.join(root,relative)).href;
const {createOidcClient}=await import(moduleUrl("packages/git-adapter/src/oidc-client.mjs"));
const {createFounderSetupComposition,PostgresFounderResolver}=await import(moduleUrl("packages/git-adapter/src/founder-setup-composition.mjs"));
const {createOidcVerifier}=await import(moduleUrl("packages/git-adapter/src/oidc-verifier.mjs"));

const selected=process.env.W1_1_OIDC_CLIENT_CASE??"all";
const ISSUER="https://synthetic-issuer.invalid",CLIENT="engramport-synthetic",REDIRECT="https://engramport.synthetic.invalid/oidc/callback";
const PRINCIPAL="54000000-0000-0000-0000-000000000001",BINDING="52000000-0000-0000-0000-000000000001";
const NOW=Date.parse("2026-08-25T14:00:00Z"),SESSION_EXPIRY=new Date(NOW+60*60_000).toISOString(),AUTHORITY_EXPIRY=new Date(NOW+2*60*60_000).toISOString();
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk={...publicKey.export({format:"jwk"}),kid:"synthetic",alg:"RS256",use:"sig",status:"active"};
const encode=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
function token(nonce){const header=encode({alg:"RS256",kid:jwk.kid,typ:"JWT"}),payload=encode({iss:ISSUER,sub:"founder-subject",aud:CLIENT,exp:Math.floor((NOW+30*60_000)/1000),nonce,principal_id:"caller-asserted"}),input=`${header}.${payload}`;return `${input}.${sign("RSA-SHA256",Buffer.from(input),privateKey).toString("base64url")}`;}
const verifier=()=>createOidcVerifier({jwks:{keys:[jwk]},issuer:ISSUER,audience:CLIENT,clock:()=>new Date(NOW)});
const outcome=async operation=>{try{return {outcome:"accepted",value:await operation()};}catch(error){return {outcome:error.code??error.message,error};}};

function syntheticClient({clock=()=>new Date(NOW)}={}){
  const nonces=new Map(),verifiers=new Map();
  const client=createOidcClient({issuer:ISSUER,clientId:CLIENT,redirectUri:REDIRECT,verifier:verifier(),clock,transactionTtlMs:60_000,exchange:async request=>{verifiers.set(request.code,request.codeVerifier);return {id_token:token(nonces.get(request.code)),access_token:"synthetic-transient-access",refresh_token:"synthetic-transient-refresh"};}});
  async function begin(code){const attempt=await client.start(),url=new URL(attempt.authorizationUrl);nonces.set(code,url.searchParams.get("nonce"));return {attempt,url};}
  return {client,begin,verifiers};
}

class SyntheticPool{
  constructor({extraIdentity=false}={}){this.extraIdentity=extraIdentity;this.createCalls=0;this.queries=[];}
  async query(sql,params){this.queries.push(sql);if(sql.includes("resolve_founder_principal"))return {rows:[this.extraIdentity?{principal_id:PRINCIPAL,identity_id:"51000000-0000-0000-0000-000000000001"}:{principal_id:PRINCIPAL}]};if(sql.includes("resolve_founder_authority"))return {rows:[{principal_id:PRINCIPAL,scopes:["setup:repository"],expires_at:AUTHORITY_EXPIRY}]};throw new Error(`unexpected pool query: ${sql} ${params}`);}
  async connect(){
    return {
      query:async sql=>{
        this.queries.push(sql);
        if(sql==="SELECT session_user")return {rows:[{session_user:"engram_maintenance"}]};
        if(sql.includes("create_setup_session_delegation")){this.createCalls++;return {rows:[{session_id:"61000000-0000-4000-8000-000000000001"}]};}
        return {rows:[]};
      },
      release(){},
    };
  }
  async end(){}
}

function check(name,operation){test(name,{skip:selected!=="all"&&selected!==name},operation);}

check("auth-start",async()=>{
  const fixture=syntheticClient(),a=await fixture.begin("auth-a"),b=await fixture.begin("auth-b");
  await fixture.client.callback({state:a.attempt.state,code:"auth-a",redirectUri:REDIRECT});
  await fixture.client.callback({state:b.attempt.state,code:"auth-b",redirectUri:REDIRECT});
  const challenge=a.url.searchParams.get("code_challenge"),method=a.url.searchParams.get("code_challenge_method"),expected=createHash("sha256").update(fixture.verifiers.get("auth-a"),"ascii").digest("base64url");
  const configured=a.url.origin===new URL(ISSUER).origin,unique=a.attempt.state!==b.attempt.state&&a.url.searchParams.get("nonce")!==b.url.searchParams.get("nonce"),pkce=method==="S256"&&challenge===expected?"S256":"plain";
  console.log(`W1_1_OIDC_CLIENT auth_start configured=${configured} unique=${unique} pkce=${pkce}`);
  assert.deepEqual({configured,unique,pkce},{configured:true,unique:true,pkce:"S256"});
});

check("transaction-state",async()=>{
  let now=NOW;const fixture=syntheticClient({clock:()=>new Date(now)}),positive=await fixture.begin("fresh");
  const accepted=(await outcome(()=>fixture.client.callback({state:positive.attempt.state,code:"fresh",redirectUri:REDIRECT}))).outcome;
  const expired=await fixture.begin("expired");now=NOW+61_000;
  const refusal=(await outcome(()=>fixture.client.callback({state:expired.attempt.state,code:"expired",redirectUri:REDIRECT}))).outcome,retained=fixture.client.transientInventory().transactions;
  console.log(`W1_1_OIDC_CLIENT transaction positive=${accepted} expired=${refusal} retained=${retained}`);
  assert.deepEqual({accepted,refusal,retained},{accepted:"accepted",refusal:"OIDC_TRANSACTION_EXPIRED",retained:0});
});

check("callback",async()=>{
  const fixture=syntheticClient(),positive=await fixture.begin("positive");
  const accepted=(await outcome(()=>fixture.client.callback({state:positive.attempt.state,code:"positive",redirectUri:REDIRECT}))).outcome;
  const mismatch=(await outcome(()=>fixture.client.callback({state:"unknown-state",code:"mismatch",redirectUri:REDIRECT}))).outcome;
  const redirect=await fixture.begin("redirect"),redirectOutcome=(await outcome(()=>fixture.client.callback({state:redirect.attempt.state,code:"redirect",redirectUri:"https://foreign.invalid/callback"}))).outcome;
  const replay=(await outcome(()=>fixture.client.callback({state:positive.attempt.state,code:"positive",redirectUri:REDIRECT}))).outcome,inventory=fixture.client.transientInventory();
  console.log(`W1_1_OIDC_CLIENT callback positive=${accepted} mismatch=${mismatch} redirect=${redirectOutcome} replay=${replay} retained=${inventory.transactions}/${inventory.codes}/${inventory.tokens}/${inventory.verifiers}`);
  assert.deepEqual({accepted,mismatch,redirectOutcome,replay,inventory},{accepted:"accepted",mismatch:"OIDC_STATE_REFUSED",redirectOutcome:"OIDC_REDIRECT_URI_REFUSED",replay:"OIDC_STATE_REFUSED",inventory:{transactions:0,codes:0,tokens:0,verifiers:0}});
});

check("composition-store",async()=>{
  const pool=new SyntheticPool(),nonces=new Map();
  const composition=createFounderSetupComposition({pool,clock:()=>new Date(NOW),idFactory:()=>"61000000-0000-4000-8000-000000000001",oidc:{issuer:ISSUER,clientId:CLIENT,redirectUri:REDIRECT,verifier:verifier(),exchange:async request=>({id_token:token(nonces.get(request.code))})}});
  const attempt=await composition.beginAuth(),url=new URL(attempt.authorizationUrl);nonces.set("compose",url.searchParams.get("nonce"));
  const session=await composition.startSession({callback:{state:attempt.state,code:"compose",redirectUri:REDIRECT,binding_id:BINDING},scopes:["setup:repository"],expires_at:SESSION_EXPIRY});
  const assertedIgnored=session.founder_principal_id===PRINCIPAL&&!JSON.stringify(session).includes("caller-asserted"),identityAbsent=!JSON.stringify(session).includes("identity_id");
  console.log(`W1_1_OIDC_CLIENT composition status=${session.status} postgres_creates=${pool.createCalls} asserted_ignored=${assertedIgnored} identity_absent=${identityAbsent}`);
  assert.deepEqual({status:session.status,creates:pool.createCalls,assertedIgnored,identityAbsent},{status:"active",creates:1,assertedIgnored:true,identityAbsent:true});
});

check("binder",async()=>{
  const resolver=new PostgresFounderResolver({pool:new SyntheticPool({extraIdentity:true})}),resolved=await resolver.resolvePrincipal({issuer:ISSUER,subject:"founder-subject",bindingId:BINDING}),surface=Object.keys(resolved).sort().join(","),identityAbsent=!Object.hasOwn(resolved,"identity_id");
  console.log(`W1_1_OIDC_CLIENT binder surface=${surface} identity_absent=${identityAbsent}`);
  assert.deepEqual({surface,identityAbsent},{surface:"principal_id",identityAbsent:true});
});
