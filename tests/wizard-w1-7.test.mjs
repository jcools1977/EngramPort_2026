import assert from "node:assert/strict";import test from "node:test";import {pathToFileURL} from "node:url";
import {VaultTransitBoundary,retentionDue} from "../packages/git-adapter/src/custody-service.mjs";import {detectCredential} from "../packages/git-adapter/src/credential-boundary.mjs";

const durableUrl=process.env.W1_7_DATABASE_URL;
const adminUrl=process.env.W1_7_POSTGRES_DATABASE_URL;
const principalY="11000000-0000-0000-0000-000000000001";
const principalX="22000000-0000-0000-0000-000000000002";
const tenantY="10000000-0000-0000-0000-000000000001";
const selectedCase=process.env.W1_7_CASE??"";
const enabled=name=>selectedCase===""||selectedCase===name;

let PrincipalSessionBinding,Pool;
if(durableUrl){
  ({Pool}=await import("pg"));
  const moduleUrl=process.env.W1_7_BINDING_MODULE?pathToFileURL(process.env.W1_7_BINDING_MODULE).href:new URL("../packages/git-adapter/src/d2-session-binding.mjs",import.meta.url).href;
  ({PrincipalSessionBinding}=await import(moduleUrl));
}

const request=(className,namespace,model,keyLocator)=>({className,namespace,model,keyLocator,metadata:{provider:"synthetic"}});
const session=principalId=>({verified:true,principalId});
async function reset(admin){await admin.query("TRUNCATE custody_audit,minted_references,custody_rows");}
async function counts(admin,reference){const r=await admin.query("SELECT (SELECT count(*)::int FROM custody_rows c JOIN minted_references m ON m.custody_row_id=c.id WHERE m.reference=$1) custody,(SELECT count(*)::int FROM minted_references WHERE reference=$1) references,(SELECT count(*)::int FROM custody_audit WHERE reference=$1) audit",[reference]);return r.rows[0];}
async function refusal(binding,input,verified){try{await binding.mint(input,verified);return {outcome:"accepted"};}catch(error){return {outcome:error?.message,code:error?.code};}}

if(durableUrl&&enabled("atomic"))test("durable atomic custody and canonical UUIDv7 mint",async()=>{
  const admin=new Pool({connectionString:adminUrl,max:1,connectionTimeoutMillis:3000,statement_timeout:5000});const binding=new PrincipalSessionBinding({connectionString:durableUrl});
  try{await reset(admin);const before=Date.now();const minted=await binding.mint(request("3.3","credential","B","vault:transit/synthetic/d3-atomic"),session(principalY));const after=Date.now();assert.match(minted.reference,/^epr:credential:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);const uuid=minted.reference.split(":")[2].replaceAll("-","");const timestamp=Number(BigInt(`0x${uuid.slice(0,12)}`));assert.ok(timestamp>=before-1000&&timestamp<=after+1000);const observed=await counts(admin,minted.reference);console.log(`W1_7_DURABLE_ATOMIC custody=${observed.custody} references=${observed.references} audit=${observed.audit} canonical=true`);assert.deepEqual(observed,{custody:1,references:1,audit:1});const row=await admin.query("SELECT c.tenant_id,c.minted_by_principal_id,c.credential_class,c.custody_model,m.reference,a.outcome FROM custody_rows c JOIN minted_references m ON m.custody_row_id=c.id JOIN custody_audit a ON a.reference=m.reference WHERE m.reference=$1",[minted.reference]);assert.deepEqual(row.rows,[{tenant_id:tenantY,minted_by_principal_id:principalY,credential_class:"3.3",custody_model:"B",reference:minted.reference,outcome:"success"}]);}finally{await reset(admin).catch(()=>{});await binding.close();await admin.end();}
});

if(durableUrl&&enabled("authorization"))test("durable namespace and authorization refusals",async()=>{
  const admin=new Pool({connectionString:adminUrl,max:1,connectionTimeoutMillis:3000,statement_timeout:5000});const binding=new PrincipalSessionBinding({connectionString:durableUrl});
  try{await reset(admin);const cases=[
    ["MINT_AUTHORITY_REFUSED",request("3.3","credential","B","vault:transit/synthetic/d3-auth"),session(principalX)],
    ["NAMESPACE_REFUSED",request("3.12","shape","A",null),session(principalY)],
    ["SCOPE_EXCEEDED",request("3.5","credential","B","vault:transit/synthetic/d3-scope"),session(principalY)],
    ["MODEL_DERIVATION_REFUSED",request("3.3","credential","A",null),session(principalY)],
    ["CLASS_GATE_NOT_PASSED",request("3.2","credential","B","vault:transit/synthetic/d3-gate"),session(principalY)]
  ];const outcomes={};for(const [name,input,verified] of cases)outcomes[name]=await refusal(binding,input,verified);console.log(`W1_7_DURABLE_AUTH ${cases.map(([name])=>`${name}=${outcomes[name].outcome}`).join(" ")}`);for(const [name] of cases){assert.equal(outcomes[name].code,"42501");assert.match(outcomes[name].outcome,new RegExp(name));}const residue=await admin.query("SELECT (SELECT count(*)::int FROM custody_rows) custody,(SELECT count(*)::int FROM minted_references) references,(SELECT count(*)::int FROM custody_audit) audit");assert.deepEqual(residue.rows[0],{custody:0,references:0,audit:0});}finally{await reset(admin).catch(()=>{});await binding.close();await admin.end();}
});
test("Vault boundary validates response, path, absence, token confinement",async()=>{const old=global.fetch;try{const b=new VaultTransitBoundary({token:"synthetic"});assert.equal(JSON.stringify(b).includes("synthetic"),false);global.fetch=async()=>({ok:true,json:async()=>({data:{signature:"vault:v1:synthetic"}})});assert.match(await b.sign("synthetic-nonexportable","x"),/^vault:v1:/);await assert.rejects(()=>b.sign("../../sys/mounts","x"),e=>e.code==="KMS_KEY_REFUSED");global.fetch=async()=>({ok:true,json:async()=>({auth:{client_token:"leak"}})});await assert.rejects(()=>b.sign("synthetic-nonexportable","x"),e=>e.code==="KMS_RESPONSE_INVALID");global.fetch=async()=>{throw Error("network")};await assert.rejects(()=>b.sign("synthetic-nonexportable","x"),e=>e.code==="KMS_UNAVAILABLE");}finally{global.fetch=old;}});
test("retention clock starts",()=>{const n=1000000000000;assert.equal(retentionDue("RET-CONFIG-400",{issued:n,rotated:n+10},n+400*86400000+11),true);assert.equal(retentionDue("RET-GRANT-400",{terminal_status:n+10},n+400*86400000+11),true);});
test("Vault token detector coverage and clean near matches",()=>{const jwt=["eyJhbGciOiJub25lIn0","eyJzdWJqZWN0In0","signaturevalue123"].join(".");for(const v of ["hvs.synthetic-vault-token-1234567890","hvb.synthetic-vault-token-1234567890","s.synthetic-vault-token-1234567890",jwt])assert.equal(detectCredential({v}).hit,true);for(const v of ["hvs","hvs.","vault-token-label","hvb-example"])assert.equal(detectCredential({v}).hit,false);});
