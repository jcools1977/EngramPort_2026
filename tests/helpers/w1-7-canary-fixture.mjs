import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleUrl=(root,file)=>pathToFileURL(path.join(root,"packages/git-adapter/src",file)).href;
const tenant="20000000-0000-4000-8000-000000000001";
const project="20000000-0000-4000-8000-000000000002";
const principal="20000000-0000-4000-8000-000000000003";

function setup(canary){return {schema_version:0,created_at:"2026-08-14T12:00:00Z",founder:{principal_id:"founder",scopes:["events:write"],assignable_trust:["untrusted_agent"],expires_at:null},repository:{provider:"github",owner:canary,name:"synthetic",default_branch:"main",permissions:["contents:read"],depends_on:[]},database:{mode:"connect_existing",target:"postgresql",depends_on:["repository.connect"]},participants:[],groups:[],import:{paths:["docs/"],include_history:true,depends_on:["repository.connect"]},welcome:{expiry_days:14,depends_on:[]}};}
function authorization(){return {principal_id:principal,tenant_id:tenant,project_id:project,audience:"team",view_mode:"live_feed",role:"contributor",scopes:["events:read"],sensitivity_ceiling:"internal",allowed_visibilities:["project"],history_start_seq:0,policy_revision:"report-auth-v1",publication_approval:null};}
const isRefusal=error=>error?.code==="CREDENTIAL_INPUT_REFUSED"||String(error?.message).includes("CREDENTIAL_INPUT_REFUSED");
async function protectedAttempt(operation,onAccepted){try{const value=await operation();await onAccepted(value);return {refused:false};}catch(error){if(isRefusal(error))return {refused:true};throw error;}}

export async function runCanaryFixture({moduleRoot,boundary}){
  const [{canaryHarness},{validateAppendInputs},{compileSetup},report]=await Promise.all([
    import(moduleUrl(moduleRoot,"custody-service.mjs")),import(moduleUrl(moduleRoot,"cli.mjs")),
    import(moduleUrl(moduleRoot,"workspace-setup.mjs")),import(moduleUrl(moduleRoot,"report-boundary.mjs"))
  ]);
  const directory=await mkdtemp(path.join(os.tmpdir(),"engram-canary-"));
  const vulnerableStore=Object.fromEntries(["events","artifacts","plans","report_output"].map(sink=>[sink,[]]));
  const protectedStore=Object.fromEntries(["events","artifacts","plans","report_output"].map(sink=>[sink,[]]));
  try{
    const artifactPath=path.join(directory,"synthetic-artifact.txt");
    const vulnerableImports={
      events:async({canary,tenantId})=>vulnerableStore.events.push({tenantId,body:canary}),
      artifacts:async({canary,tenantId})=>vulnerableStore.artifacts.push({tenantId,registration:{content:canary}}),
      plans:async({canary,tenantId})=>vulnerableStore.plans.push({tenantId,plan:setup(canary)}),
      report_output:async({canary,tenantId})=>vulnerableStore.report_output.push({tenantId,generated:{summary:canary}})
    };
    const protectedImports={
      events:async({canary,tenantId})=>protectedAttempt(()=>validateAppendInputs({body:canary,cwd:directory}),value=>protectedStore.events.push({tenantId,value})),
      artifacts:async({canary,tenantId})=>{await writeFile(artifactPath,canary);return protectedAttempt(()=>validateAppendInputs({body:"synthetic clean event",artifacts:[artifactPath],cwd:directory}),value=>protectedStore.artifacts.push({tenantId,value}));},
      plans:async({canary,tenantId})=>protectedAttempt(()=>compileSetup(setup(canary)),value=>protectedStore.plans.push({tenantId,value})),
      report_output:async({canary,tenantId})=>{const auth=authorization();const record={event_id:"20000000-0000-4000-8000-000000000011",tenant_id:tenant,project_id:project,project_seq:1,kind:"progress.published",sensitivity:"internal",visibility:"project",payload:{summary:canary},content_sha256:"",authorization_context_sha256:report.authorizationContextDigest(auth)};record.content_sha256=report.evidenceDigest(record);const request={authorization:auth,model_identity:"synthetic/model-v1",reporter_revision:"canary-v1"};const source={retrieveAuthorized:async()=>[record]};return protectedAttempt(()=>report.runReportIfChanged({request,source,previous_as_of_seq:0,generator:async()=>({summary:canary})}),value=>protectedStore.report_output.push({tenantId,value}));}
    };
    const observers=Object.fromEntries(Object.keys(vulnerableStore).map(sink=>[sink,{
      vulnerable:async({canary})=>JSON.stringify(vulnerableStore[sink]).includes(canary),
      protected:async({canary})=>JSON.stringify(protectedStore[sink]).includes(canary)
    }]));
    const harness=canaryHarness({boundary,tenantId:"synthetic-canary-tenant",keyName:"synth-a",vulnerableImports,protectedImports,observers});
    assert.match(harness.canary,/^Bearer synthetic-canary-[0-9a-f]{64}$/);assert.match(harness.digest,/^[0-9a-f]{64}$/);
    const vulnerable=[];const protectedResults=[];
    for(const sink of harness.sinks){vulnerable.push(await harness.vulnerable(sink));protectedResults.push(await harness.protectedRun(sink));}
    const vulnerableDirty=vulnerable.filter(result=>result.dirty&&result.observed).length;
    const protectedClean=protectedResults.filter(result=>result.refused&&result.clean&&!result.dirty&&result.signed).length;
    console.log(`W1_7_CANARY vulnerable_dirty=${vulnerableDirty}/4 protected_clean=${protectedClean}/4 signed=${protectedResults.filter(result=>result.signed).length}/4 digest=${harness.digest} isolation=separate-importers-and-stores`);
    assert.equal(vulnerableDirty,4,"a sink never observed dirty has an unproven observer");assert.equal(protectedClean,4);assert.equal(protectedResults.every(result=>result.digest===harness.digest),true);
    return {vulnerable,protectedResults,digest:harness.digest};
  }finally{await rm(directory,{recursive:true,force:true});}
}
