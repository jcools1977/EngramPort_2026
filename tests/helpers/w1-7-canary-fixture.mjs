import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";

const repositoryRoot=path.resolve(import.meta.dirname,"../..");
const moduleUrl=(root,file)=>`${pathToFileURL(path.join(root,"packages/git-adapter/src",file)).href}?canary=${Date.now()}-${Math.random()}`;
const tenant="20000000-0000-4000-8000-000000000001";
const project="20000000-0000-4000-8000-000000000002";
const principal="20000000-0000-4000-8000-000000000003";
const surfaces=["actors","events","artifacts","schemas","threads","engramport.yaml"];

function setup(canary){return {schema_version:0,created_at:"2026-08-14T12:00:00Z",founder:{principal_id:"founder",scopes:["events:write"],assignable_trust:["untrusted_agent"],expires_at:null},repository:{provider:"github",owner:canary,name:"synthetic",default_branch:"main",permissions:["contents:read"],depends_on:[]},database:{mode:"connect_existing",target:"postgresql",depends_on:["repository.connect"]},participants:[],groups:[],import:{paths:["docs/"],include_history:true,depends_on:["repository.connect"]},welcome:{expiry_days:14,depends_on:[]}};}
function authorization(){return {principal_id:principal,tenant_id:tenant,project_id:project,audience:"team",view_mode:"live_feed",role:"contributor",scopes:["events:read"],sensitivity_ceiling:"internal",allowed_visibilities:["project"],history_start_seq:0,policy_revision:"report-auth-v1",publication_approval:null};}
const isRefusal=error=>error?.code==="CREDENTIAL_INPUT_REFUSED"||String(error?.message).includes("CREDENTIAL_INPUT_REFUSED");
async function protectedAttempt(operation,onAccepted=async()=>{}){try{const value=await operation();await onAccepted(value);return {refused:false};}catch(error){if(isRefusal(error))return {refused:true};throw error;}}
const digest=value=>createHash("sha256").update(value).digest("hex");

async function copyModuleVariant(sourceRoot,targetRoot){
  await mkdir(path.join(targetRoot,"packages/git-adapter"),{recursive:true});
  await mkdir(path.join(targetRoot,"packages/port-watch"),{recursive:true});
  await mkdir(path.join(targetRoot,"schemas"),{recursive:true});
  await cp(path.join(sourceRoot,"packages/git-adapter/src"),path.join(targetRoot,"packages/git-adapter/src"),{recursive:true});
  await cp(path.join(sourceRoot,"packages/port-watch/src"),path.join(targetRoot,"packages/port-watch/src"),{recursive:true});
  await cp(path.join(sourceRoot,"schemas"),path.join(targetRoot,"schemas"),{recursive:true});
  const detector=path.join(targetRoot,"packages/git-adapter/src/credential-boundary.mjs");
  let source=await readFile(detector,"utf8");
  const anchor='if (SECRET.test(v)) return "CREDENTIAL_DETECTED";';
  if(source.includes(anchor))source=source.replace(anchor,'if (false /* D3_CANARY_VULNERABLE_DETECTOR_DISABLED */) return "CREDENTIAL_DETECTED";');
  else if(!source.includes("D3_CANARY_DETECTOR_DISABLED")&&!source.includes("D3_CANARY_VULNERABLE_DETECTOR_DISABLED"))throw new Error("canary detector anchor absent");
  await writeFile(detector,source);
}

async function copyRepository(target){for(const surface of surfaces)await cp(path.join(repositoryRoot,surface),path.join(target,surface),{recursive:true});}
async function declare(root,thread){await writeFile(path.join(root,"threads",`${thread}.yaml`),`schema_version: 0\nthread: ${thread}\nmode: free_form\ncoordinator: null\n`);}
async function eventFiles(root){const directory=path.join(root,"events","agent-b");return Promise.all((await readdir(directory)).filter(name=>name.endsWith(".md")).map(name=>readFile(path.join(directory,name),"utf8")));}
function reportInput(canary,report){const auth=authorization();const record={event_id:"20000000-0000-4000-8000-000000000011",tenant_id:tenant,project_id:project,project_seq:1,kind:"progress.published",sensitivity:"internal",visibility:"project",payload:{summary:canary},content_sha256:"",authorization_context_sha256:report.authorizationContextDigest(auth)};record.content_sha256=report.evidenceDigest(record);return {request:{authorization:auth,model_identity:"synthetic/model-v1",reporter_revision:"canary-v1"},source:{retrieveAuthorized:async()=>[record]}};}

export async function runCanaryFixture({moduleRoot,boundary}){
  const directory=await mkdtemp(path.join(os.tmpdir(),"engram-canary-"));
  const vulnerableModuleRoot=path.join(directory,"vulnerable-modules");
  const vulnerableRepo=path.join(directory,"vulnerable-repo");
  const protectedRepo=path.join(directory,"protected-repo");
  await Promise.all([copyModuleVariant(moduleRoot,vulnerableModuleRoot),copyRepository(vulnerableRepo),copyRepository(protectedRepo)]);
  const [{canaryHarness},vulnerableCli,vulnerableSetup,vulnerableReport,protectedCli,protectedSetup,protectedReport]=await Promise.all([
    import(moduleUrl(moduleRoot,"custody-service.mjs")),import(moduleUrl(vulnerableModuleRoot,"cli.mjs")),
    import(moduleUrl(vulnerableModuleRoot,"workspace-setup.mjs")),import(moduleUrl(vulnerableModuleRoot,"report-boundary.mjs")),
    import(moduleUrl(moduleRoot,"cli.mjs")),import(moduleUrl(moduleRoot,"workspace-setup.mjs")),import(moduleUrl(moduleRoot,"report-boundary.mjs"))
  ]);
  const vulnerableLanding={plan:null,report_output:null};
  const protectedLanding={plan:null,report_output:null};
  try{
    for(const [root,label] of [[vulnerableRepo,"vulnerable"],[protectedRepo,"protected"]]){
      await declare(root,`canary-events-${label}`);await declare(root,`canary-artifacts-${label}`);
    }
    const vulnerableImports={
      events:async({canary})=>{const body=path.join(vulnerableRepo,"event-body.txt");await writeFile(body,canary);return vulnerableCli.run(["append","--actor","agent-b","--thread","canary-events-vulnerable","--type","message","--body",body],vulnerableRepo);},
      artifacts:async({canary})=>{const relative="artifacts/agent-b/synthetic-canary-artifact.txt";const artifact=path.join(vulnerableRepo,relative);await writeFile(artifact,canary);const body=path.join(vulnerableRepo,"artifact-body.txt");await writeFile(body,"synthetic artifact registration");return vulnerableCli.run(["append","--actor","agent-b","--thread","canary-artifacts-vulnerable","--type","message","--body",body,"--artifacts",`${relative}#sha256=${digest(canary)}`],vulnerableRepo);},
      plans:async({canary})=>{vulnerableLanding.plan=vulnerableSetup.compileSetup(setup(canary));return vulnerableLanding.plan;},
      report_output:async({canary})=>{const input=reportInput(canary,vulnerableReport);vulnerableLanding.report_output=await vulnerableReport.runReportIfChanged({...input,previous_as_of_seq:0,generator:async()=>({summary:canary})});return vulnerableLanding.report_output;}
    };
    const protectedImports={
      events:async({canary})=>{const body=path.join(protectedRepo,"event-body.txt");await writeFile(body,canary);return protectedAttempt(()=>protectedCli.run(["append","--actor","agent-b","--thread","canary-events-protected","--type","message","--body",body],protectedRepo));},
      artifacts:async({canary})=>{const relative="artifacts/agent-b/synthetic-canary-artifact.txt";const artifact=path.join(protectedRepo,relative);await writeFile(artifact,canary);const body=path.join(protectedRepo,"artifact-body.txt");await writeFile(body,"synthetic artifact registration");const result=await protectedAttempt(()=>protectedCli.run(["append","--actor","agent-b","--thread","canary-artifacts-protected","--type","message","--body",body,"--artifacts",`${relative}#sha256=${digest(canary)}`],protectedRepo));if(result.refused)await rm(artifact,{force:true});return result;},
      plans:async({canary})=>protectedAttempt(()=>protectedSetup.compileSetup(setup(canary)),value=>{protectedLanding.plan=value;}),
      report_output:async({canary})=>{const input=reportInput(canary,protectedReport);return protectedAttempt(()=>protectedReport.runReportIfChanged({...input,previous_as_of_seq:0,generator:async()=>({summary:canary})}),value=>{protectedLanding.report_output=value;});}
    };
    const observers={
      events:{vulnerable:async({canary})=>(await eventFiles(vulnerableRepo)).some(source=>source.includes(canary)),protected:async({canary})=>(await eventFiles(protectedRepo)).some(source=>source.includes(canary))},
      artifacts:{vulnerable:async({canary})=>(await readFile(path.join(vulnerableRepo,"artifacts/agent-b/synthetic-canary-artifact.txt"),"utf8")).includes(canary),protected:async({canary})=>{try{return (await readFile(path.join(protectedRepo,"artifacts/agent-b/synthetic-canary-artifact.txt"),"utf8")).includes(canary);}catch(error){if(error.code==="ENOENT")return false;throw error;}}},
      plans:{vulnerable:async({canary})=>JSON.stringify(vulnerableLanding.plan).includes(canary),protected:async({canary})=>JSON.stringify(protectedLanding.plan).includes(canary)},
      report_output:{vulnerable:async({canary})=>JSON.stringify(vulnerableLanding.report_output).includes(canary),protected:async({canary})=>JSON.stringify(protectedLanding.report_output).includes(canary)}
    };
    const harness=canaryHarness({boundary,tenantId:"synthetic-canary-tenant",keyName:"synth-a",vulnerableImports,protectedImports,observers});
    assert.match(harness.canary,/^Bearer synthetic-canary-[0-9a-f]{64}$/);assert.match(harness.digest,/^[0-9a-f]{64}$/);
    const vulnerable=[];const protectedResults=[];
    for(const sink of harness.sinks){vulnerable.push(await harness.vulnerable(sink));protectedResults.push(await harness.protectedRun(sink));}
    const vulnerableDirty=vulnerable.filter(result=>result.dirty&&result.observed).length;
    const protectedClean=protectedResults.filter(result=>result.refused&&result.clean&&!result.dirty&&result.signed).length;
    console.log(`W1_7_CANARY vulnerable_dirty=${vulnerableDirty}/4 protected_clean=${protectedClean}/4 signed=${protectedResults.filter(result=>result.signed).length}/4 digest=${harness.digest} isolation=separate-production-module-graphs-and-landings observers=event-file,artifact-file,compiled-plan,report-output`);
    assert.equal(vulnerableDirty,4,"a real sink landing never observed dirty has an unproven observer");assert.equal(protectedClean,4);assert.equal(protectedResults.every(result=>result.digest===harness.digest),true);
    return {vulnerable,protectedResults,digest:harness.digest};
  }finally{await rm(directory,{recursive:true,force:true});}
}
