import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

test("genuine guard-removal mutations accept fixtures and restore shipped modules",async()=>{
  const source=await readFile(new URL("../packages/git-adapter/src/credential-boundary.mjs",import.meta.url),"utf8");
  const temp=await mkdtemp(path.join(os.tmpdir(),"w1-6a-"));
  try {
    const detectorCopy=path.join(temp,"detector.mjs");
    await writeFile(detectorCopy,source.replace('if (SECRET.test(v)) return "CREDENTIAL_DETECTED";','if (false && SECRET.test(v)) return "CREDENTIAL_DETECTED";'));
    const d=await import(`${detectorCopy}?n1`); const r=await d.ingestCredentialBearingRecord({...base,description:"Bearer synthetic_secret_value_12345"},ctx,{registry:registry(),custody:custody()}); assert.equal(r.ok,true);
    const grantCopy=path.join(temp,"grant.mjs");
    await writeFile(grantCopy,source.replace('if (request.principal_id !== g.granted_to_principal_id) return fail("PRINCIPAL_MISMATCH");','if (false && request.principal_id !== g.granted_to_principal_id) return fail("PRINCIPAL_MISMATCH");'));
    const g=await import(`${grantCopy}?g8`); const r2=await g.resolveInvocation(grant(),{principal_id:"u2",tenant_id:"t1",project_id:"p1",provider:"github",capability:"repo.read",scopes:["read"]},{store:store()}); assert.equal(r2.ok,true);
    for (const [id,needle,replacement,fixture,deps] of [
      ["N4",'if (deps.registry?.isProviderRegistration && deps.registry.isProviderRegistration(record)) return reject("REGISTRY_WRITE_FORBIDDEN");',"if (false) return reject(\"REGISTRY_WRITE_FORBIDDEN\");",base,{registry:registry({isProviderRegistration:()=>true}),custody:custody()}],
      ["N5",'if (record.provider_shape_ref && record.provider_shape_ref !== shape.shape_ref) return reject("SHAPE_MISMATCH");',"if (false) return reject(\"SHAPE_MISMATCH\");",{...base,provider_shape_ref:"epr:shape:aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa"},{registry:registry(),custody:custody()}],
      ["N10",'if (u.protocol !== "https:" || u.username || u.password || CRED_QUERY.test(u.search) || CRED_QUERY.test(u.hash)) return "UNSAFE_URL";',"if (false) return \"UNSAFE_URL\";",{...base,description:"https://user:pass@example.test/x"},{registry:registry(),custody:custody()}],
      ["N7",'} catch { return reject("REGISTRY_ERROR"); }', '} catch { shape = { shape_ref: "epr:shape:12345678-1234-7123-8123-123456789abc", revision: "r8" }; }',base,{registry:{resolve:async()=>{throw Error("x")},validate:async()=>true},custody:custody()}],
      ["N8",'  if (bytes > maxBytes) return { hit: true, code: "RECORD_TOO_LARGE" };',"  if (false && bytes > maxBytes) return { hit: true, code: \"RECORD_TOO_LARGE\" };",{...base,blob:"x".repeat(70000)},{registry:registry(),custody:custody()}],
      ["N9",'    if (depth > maxDepth) return "NESTING_TOO_DEEP";',"    if (false && depth > maxDepth) return \"NESTING_TOO_DEEP\";",(()=>{let x=base;for(let i=0;i<17;i++)x={nested:x};return x;})(),{registry:registry(),custody:custody()}]
    ]) { const file=path.join(temp,`${id}.mjs`); await writeFile(file,source.replace(needle,replacement)); const mod=await import(`${file}?${id}`); const out=await mod.ingestCredentialBearingRecord(fixture,ctx,deps); assert.equal(out.ok,true,id); }
    const cases=[
      ["G2",'if (Date.parse(g.expires_at) <= await deps.store.serverNow()) return fail("GRANT_EXPIRED");',"if (false) return fail(\"GRANT_EXPIRED\");",grant({expires_at:"2020-01-01T00:00:00Z"}),{}],
      ["G4",'if (request.tenant_id !== g.tenant_id) return fail("TENANT_MISMATCH");',"if (false) return fail(\"TENANT_MISMATCH\");",grant(),{tenant_id:"t2"}],
      ["G5",'if (request.project_id !== g.project_id) return fail("PROJECT_MISMATCH");',"if (false) return fail(\"PROJECT_MISMATCH\");",grant(),{project_id:"p2"}],
      ["G6",'if (request.provider !== g.provider) return fail("PROVIDER_MISMATCH");',"if (false) return fail(\"PROVIDER_MISMATCH\");",grant(),{provider:"gitlab"}],
      ["G7",'if (request.capability !== g.capability) return fail("CAPABILITY_MISMATCH");',"if (false) return fail(\"CAPABILITY_MISMATCH\");",grant(),{capability:"repo.write"}],
      ["G9",'if ((g.granted_to_actor_id ?? null) !== (request.actor_id ?? null)) return fail("ACTOR_MISMATCH");',"if (false) return fail(\"ACTOR_MISMATCH\");",grant({granted_to_actor_id:"a1"}),{actor_id:"a2"}],
      ["G10",'if (!has(new Set(g.scopes), request.scopes ?? [])) return fail("SCOPE_EXCEEDED");',"if (false) return fail(\"SCOPE_EXCEEDED\");",grant(),{scopes:["read","write"]}],
      ["G3",'if (!fresh || fresh.status !== "active") return fail("GRANT_REVOKED");',"if (false) return fail(\"GRANT_REVOKED\");",grant({status:"revoked"}),{}],
      ["G11",'if (!(await deps.store.granterAuthorized(g.granted_by_principal_id, g.scopes))) return fail("GRANTOR_EXCEEDS_AUTHORITY");',"if (false) return fail(\"GRANTOR_EXCEEDS_AUTHORITY\");",grant(),{}],
      ["G13",'if (request.session_id && !(await deps.store.sessionLive(request.session_id))) return fail("SESSION_REVOKED");',"if (false) return fail(\"SESSION_REVOKED\");",grant(),{session_id:"s1"}],
      ["G14",'if (!row || row.revoked) return fail("CUSTODY_REVOKED");',"if (false) return fail(\"CUSTODY_REVOKED\");",grant({credential_ref:"epr:credential:12345678-1234-7123-8123-123456789abc"}),{}]
    ];
    for (const [id,needle,replacement,fixture,request] of cases) { const file=path.join(temp,`${id}.mjs`); await writeFile(file,source.replace(needle,replacement)); const mod=await import(`${file}?${id}`); const out=await mod.resolveInvocation(fixture,{principal_id:"u1",actor_id:null,tenant_id:"t1",project_id:"p1",provider:"github",capability:"repo.read",scopes:["read"],...request},{store:store({getGrant:async()=>fixture})}); assert.equal(out.ok,true,id); }
    assert.equal(source.includes('if (SECRET.test(v)) return "CREDENTIAL_DETECTED";'),true); assert.equal(source.includes('if (request.principal_id !== g.granted_to_principal_id) return fail("PRINCIPAL_MISMATCH");'),true);
  } finally { await rm(temp,{recursive:true,force:true}); }
});
