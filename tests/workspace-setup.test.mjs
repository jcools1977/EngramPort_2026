import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ACTION_PROFILE, compileSetup } from "../packages/git-adapter/src/workspace-setup.mjs";

const root=path.resolve(import.meta.dirname,"..");
function base(){return {schema_version:0,created_at:"2026-08-14T12:00:00Z",founder:{principal_id:"founder",scopes:["events:write","artifacts:write","repo:read"],expires_at:"2026-12-31T00:00:00Z"},repository:{provider:"github",owner:"acme",name:"engram",default_branch:"main",permissions:["contents:read","pull_requests:write_non_default","webhooks:receive"],depends_on:[]},database:{mode:"connect_existing",target:"postgresql",depends_on:["repository.connect"]},participants:[{id:"owner",kind:"human",role:"owner",scopes:["events:write","artifacts:write"],capabilities:["review"],groups:["core"],trust:"untrusted_agent",projects:["project-1"],expires_at:"2026-10-01T00:00:00Z",owner_id:null,depends_on:["group.core"]},{id:"agent",kind:"agent",role:"contributor",scopes:["events:write"],capabilities:["implementation"],groups:["core"],trust:"untrusted_agent",projects:["project-1"],expires_at:"2026-09-01T00:00:00Z",owner_id:"owner",depends_on:["participant.owner"]},{id:"guest",kind:"guest",role:"contributor",scopes:["events:write"],capabilities:[],groups:[],trust:"untrusted_agent",projects:["project-1"],expires_at:"2026-08-20T00:00:00Z",owner_id:null,depends_on:[]}],groups:[{name:"core",members:["owner","agent"],depends_on:[]}],import:{paths:["docs/"],include_history:true,depends_on:["repository.connect"]},welcome:{expiry_days:14,depends_on:["participant.agent"]}};}
async function refusal(name,code,mutate){await test(name,()=>{const positive=compileSetup(base());assert.ok(positive.length>0);const plan=base();mutate(plan);assert.throws(()=>compileSetup(plan),e=>e.code===code);});}

test("schema rejects unknown fields with positive control",()=>{assert.ok(compileSetup(base()).length);const p=base();p.authority="root";assert.throws(()=>compileSetup(p),e=>e.code==="SETUP_SCHEMA_UNKNOWN_FIELD");});
await refusal("cyclic dependencies refused","CYCLIC_DEPENDENCY",p=>{p.repository.depends_on=["database.configure"];});
await refusal("unsatisfiable dependency refused","UNSATISFIABLE_DEPENDENCY",p=>{p.database.depends_on=["missing.step"];});
await refusal("scope exceeding founder refused","SCOPE_EXCEEDS_FOUNDER",p=>{p.participants[0].scopes.push("admin:project");});
await refusal("grant outliving founder refused","GRANT_OUTLIVES_GRANTER",p=>{p.participants[0].expires_at="2027-01-01T00:00:00Z";});
await refusal("guest defaults enforced","GUEST_GRANT_EXCEEDS_DEFAULTS",p=>{p.participants[2].projects.push("project-2");});
await refusal("agent scope exceeding owner refused","AGENT_GRANT_EXCEEDS_OWNER",p=>{p.participants[1].scopes.push("artifacts:write");p.participants[0].scopes=["events:write"];});
await refusal("agent expiry exceeding owner refused","AGENT_GRANT_EXCEEDS_OWNER",p=>{p.participants[1].expires_at="2026-11-01T00:00:00Z";});
await refusal("unapproved GitHub permission refused","GITHUB_PERMISSION_REFUSED",p=>{p.repository.permissions.push("contents:write_default");});
await refusal("merge permission refused","GITHUB_PERMISSION_REFUSED",p=>{p.repository.permissions.push("pull_requests:merge");});
await refusal("self-asserted elevated trust refused","SELF_ASSERTED_TRUST_REFUSED",p=>{p.participants[1].trust="trusted_agent";});

test("dependency order is stable and consequential digests are complete",()=>{const a=compileSetup(base()),b=compileSetup(base());assert.deepEqual(a,b);assert.equal(a.findIndex(s=>s.step_id==="repository.connect")<a.findIndex(s=>s.step_id==="database.configure"),true);for(const s of a){if(s.consequential)assert.match(s.action_digest,/^[0-9a-f]{64}$/);else assert.equal("action_digest" in s,false);}assert.equal(ACTION_PROFILE,"engramport-action-v1");});
test("comments and key order do not affect digests; material parameters do",()=>{const p=base();const normal=JSON.stringify(p,null,2);const reordered=JSON.stringify(Object.fromEntries(Object.entries(p).reverse()),null,2);const a=compileSetup(`# fixture-only comment\n${normal}`),b=compileSetup(`# changed comment\n${reordered}`);assert.deepEqual(a,b);const changed=base();changed.repository.name="engram-v2";const c=compileSetup(changed);assert.notEqual(a.find(s=>s.step_id==="repository.connect").action_digest,c.find(s=>s.step_id==="repository.connect").action_digest);assert.equal(a.find(s=>s.step_id==="database.configure").action_digest,c.find(s=>s.step_id==="database.configure").action_digest);});
test("CLI compiles JSON-compatible workspace.setup.yaml",async()=>{const d=await mkdtemp(path.join(os.tmpdir(),"engram-setup-"));try{const file=path.join(d,"workspace.setup.yaml");await writeFile(file,`# fixture-only\n${JSON.stringify(base(),null,2)}\n`);const r=spawnSync(process.execPath,[path.join(root,"scripts/engram"),"setup","compile","--file",file],{cwd:root,encoding:"utf8"});assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.equal(out.profile,"engramport-action-v1");assert.ok(out.steps.every(s=>!s.consequential||s.action_digest));}finally{await rm(d,{recursive:true,force:true});}});
