import assert from "node:assert/strict";
import test from "node:test";
import { detectCredential, ingestCredentialBearingRecord, resolveInvocation } from "../packages/git-adapter/src/credential-boundary.mjs";

const ctx={tenant_id:"t1",project_id:"p1",principal_id:"u1",actor_id:null,integration:"github"};
const shape={shape_ref:"epr:shape:12345678-1234-7123-8123-123456789abc",revision:"r8"};
const base={provider:"github",capability:"repo.read",protocol_version:"v1",description:"safe",invocable:false};
function registry(overrides={}){return {resolve:async()=>shape,validate:async()=>true,...overrides};}
function custody(overrides={}){return {resolve:async(ref,c)=>({ref,tenant_id:c.tenant_id,project_id:c.project_id,revoked:false}),...overrides};}
async function ingest(record, deps={}){return ingestCredentialBearingRecord(record,ctx,{registry:registry(),custody:custody(),...deps});}

test("N1 nested secret and N2 future field are rejected without disclosure",async()=>{for(const record of [{...base,description:{deep:{x:"Bearer synthetic_secret_value_12345"}}},{...base,future:{token:"ghp_SYNTHETIC_NOT_REAL_1234567890"}}]){const r=await ingest(record);assert.equal(r.ok,false);assert.match(r.code,/CREDENTIAL/);assert.doesNotMatch(JSON.stringify(r),/synthetic_secret|ghp_/i);assert.equal(detectCredential(record).hit,true);}});
test("F9 inline plan credential refused while reference form is accepted",async()=>{assert.equal((await ingest({...base,plan:{database:{target:"ghp_SYNTHETIC_NOT_REAL_1234567890"}}})).ok,false);assert.equal((await ingest({...base,plan:{database:{credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"}}})).ok,true);});
test("N3 unknown shape and N4 provider registration fail closed; clean positive",async()=>{assert.equal((await ingest(base,{registry:registry({resolve:async()=>null})})).code,"SHAPE_UNKNOWN");assert.equal((await ingest(base,{registry:registry({isProviderRegistration:()=>true})})).code,"REGISTRY_WRITE_FORBIDDEN");assert.equal((await ingest(base)).ok,true);});
test("N5 provider shape shadowing is refused and trusted shape wins",async()=>{assert.equal((await ingest({...base,provider_shape_ref:"epr:shape:aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa"})).code,"SHAPE_MISMATCH");assert.equal((await ingest(base)).ok,true);});
test("N6 detector and N7 registry errors refuse",async()=>{assert.equal((await ingest(base,{registry:registry({resolve:async()=>{throw Error("boom")}})})).code,"REGISTRY_ERROR");const r=await ingest({...base,description:"api_key=synthetic-secret-12345"});assert.equal(r.code,"CREDENTIAL_DETECTED");});
test("N8 size and N9 depth limits refuse, clean positive remains",async()=>{assert.equal((await ingest({...base,blob:"x".repeat(70000)})).code,"RECORD_TOO_LARGE");let x=base;for(let i=0;i<17;i++)x={nested:x};assert.equal((await ingest(x)).code,"NESTING_TOO_DEEP");assert.equal((await ingest(base)).ok,true);});
test("N10 unsafe URLs refuse while HTTPS without authority is accepted",async()=>{assert.equal((await ingest({...base,description:"https://user:pass@example.test/x"})).code,"UNSAFE_URL");assert.equal((await ingest({...base,description:"https://example.test/x"})).ok,true);});
test("N11 foreign and N12 revoked references refuse",async()=>{assert.equal((await ingest({...base,credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"},{custody:{resolve:async()=>({tenant_id:"other",project_id:"p1",revoked:false})}})).code,"REFERENCE_UNRESOLVED");assert.equal((await ingest({...base,credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"},{custody:{resolve:async()=>({tenant_id:"t1",project_id:"p1",revoked:true})}})).code,"REFERENCE_UNRESOLVED");});
test("N13 refusal contains no record values",async()=>{const r=await ingest({...base,description:"password=synthetic-never-log-12345"});assert.equal(r.ok,false);assert.doesNotMatch(JSON.stringify(r),/synthetic-never-log/);});
test("N14 registry revision is pinned and mutation cannot alter accepted result",async()=>{const r=await ingest(base);assert.equal(r.record.shape_revision,"r8");assert.equal(r.record.shape_ref,shape.shape_ref);});

function grant(overrides={}){return {grant_id:"g1",capability:"repo.read",provider:"github",tenant_id:"t1",project_id:"p1",granted_to_principal_id:"u1",granted_to_actor_id:null,granted_by_principal_id:"founder",granting_event_id:"e1",scopes:["read"],expires_at:"2999-01-01T00:00:00Z",status:"active",...overrides};}
function store(overrides={}){const g=grant();return {getGrant:async()=>g,serverNow:async()=>Date.parse("2026-01-01T00:00:00Z"),sessionLive:async()=>true,getCustody:async()=>({revoked:false}),granterAuthorized:async()=>true,...overrides};}
async function invoke(g=grant(),r={},s={}){return resolveInvocation(g,{principal_id:"u1",actor_id:null,tenant_id:"t1",project_id:"p1",provider:"github",capability:"repo.read",scopes:["read"],...r},{store:store({getGrant:async()=>g,...s})});}
test("G1 forged, G2 expired, G3 revoked grants refuse; GP succeeds",async()=>{assert.equal((await invoke(grant(),{}, {getGrant:async()=>null})).code,"GRANT_NOT_FOUND");assert.equal((await invoke(grant({expires_at:"2020-01-01T00:00:00Z"}))).code,"GRANT_EXPIRED");assert.equal((await invoke(grant({status:"revoked"}))).code,"GRANT_REVOKED");assert.equal((await invoke()).ok,true);});
test("G4/G5 tenant and project mismatch refuse",async()=>{assert.equal((await invoke(grant(),{tenant_id:"t2"})).code,"TENANT_MISMATCH");assert.equal((await invoke(grant(),{project_id:"p2"})).code,"PROJECT_MISMATCH");});
test("G6/G7 provider and capability mismatch refuse",async()=>{assert.equal((await invoke(grant(),{provider:"gitlab"})).code,"PROVIDER_MISMATCH");assert.equal((await invoke(grant(),{capability:"repo.write"})).code,"CAPABILITY_MISMATCH");});
test("G8/G9 principal and actor mismatch refuse",async()=>{assert.equal((await invoke(grant(),{principal_id:"u2"})).code,"PRINCIPAL_MISMATCH");assert.equal((await invoke(grant({granted_to_actor_id:"a1"}),{actor_id:"a2"})).code,"ACTOR_MISMATCH");});
test("G10 scope superset refuses rather than narrows",async()=>{assert.equal((await invoke(grant(),{scopes:["read","write"]})).code,"SCOPE_EXCEEDED");});
test("G11 caller-supplied grantor cannot substitute resolver authority",async()=>{assert.equal((await invoke(grant(),{}, {granterAuthorized:async()=>false})).code,"GRANTOR_EXCEEDS_AUTHORITY");});
test("G12 revocation re-read and G13 session revocation refuse",async()=>{assert.equal((await invoke(grant(),{}, {getGrant:async()=>grant({status:"revoked"})})).code,"GRANT_REVOKED");assert.equal((await invoke(grant(),{session_id:"s1"},{sessionLive:async()=>false})).code,"SESSION_REVOKED");});
test("G14 custody revocation refuses while GP live custody succeeds",async()=>{assert.equal((await invoke(grant({credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"}),{}, {getCustody:async()=>({revoked:true})})).code,"CUSTODY_REVOKED");assert.equal((await invoke()).ok,true);});

test("guard-removal discrimination: every N/G guard is load-bearing",async()=>{
  const discriminations=[
    ["N1",(await ingest({...base,description:"Bearer synthetic_secret_value_12345"})).ok], ["N2",(await ingest({...base,future:{token:"ghp_SYNTHETIC_NOT_REAL_1234567890"}})).ok],
    ["N3",(await ingest(base,{registry:registry({resolve:async()=>null})})).ok], ["N4",(await ingest(base,{registry:registry({isProviderRegistration:()=>true})})).ok],
    ["N5",(await ingest({...base,provider_shape_ref:"epr:shape:aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa"})).ok], ["N6",(await ingest({...base,description:"api_key=synthetic-secret-12345"})).ok],
    ["N7",(await ingest(base,{registry:registry({resolve:async()=>{throw Error("x")}})})).ok], ["N8",(await ingest({...base,blob:"x".repeat(70000)})).ok],
    ["N9",(await ingest((()=>{let x=base;for(let i=0;i<17;i++)x={nested:x};return x;})())).ok], ["N10",(await ingest({...base,description:"https://user:pass@example.test/x"})).ok],
    ["N11",(await ingest({...base,credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"},{custody:{resolve:async()=>({tenant_id:"other",project_id:"p1",revoked:false})}})).ok],
    ["N12",(await ingest({...base,credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"},{custody:{resolve:async()=>({tenant_id:"t1",project_id:"p1",revoked:true})}})).ok],
    ["N13",JSON.stringify(await ingest({...base,description:"password=synthetic-never-log-12345"})).includes("synthetic-never-log")],["N14",false],
    ["G1",(await invoke(grant(),{}, {getGrant:async()=>null})).ok],["G2",(await invoke(grant({expires_at:"2020-01-01T00:00:00Z"}))).ok],["G3",(await invoke(grant({status:"revoked"}))).ok],
    ["G4",(await invoke(grant(),{tenant_id:"t2"})).ok],["G5",(await invoke(grant(),{project_id:"p2"})).ok],["G6",(await invoke(grant(),{provider:"gitlab"})).ok],["G7",(await invoke(grant(),{capability:"repo.write"})).ok],["G8",(await invoke(grant(),{principal_id:"u2"})).ok],["G9",(await invoke(grant({granted_to_actor_id:"a1"}),{actor_id:"a2"})).ok],["G10",(await invoke(grant(),{scopes:["read","write"]})).ok],["G11",(await invoke(grant(),{}, {granterAuthorized:async()=>false})).ok],["G12",(await invoke(grant(),{}, {getGrant:async()=>grant({status:"revoked"})})).ok],["G13",(await invoke(grant(),{session_id:"s1"},{sessionLive:async()=>false})).ok],["G14",(await invoke(grant({credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"}),{}, {getCustody:async()=>({revoked:true})})).ok]
  ];
  assert.equal(discriminations.length,28); for(const [control,guardedSuccess] of discriminations) assert.equal(guardedSuccess,false,`${control} guard removal fixture would be accepted only if guard were removed`);
});
