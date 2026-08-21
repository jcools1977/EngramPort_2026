import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {chmod,cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";

const repositoryRoot=path.resolve(import.meta.dirname,"../..");
const moduleUrl=(root,file)=>`${pathToFileURL(path.join(root,"packages/git-adapter/src",file)).href}?canary=${Date.now()}-${Math.random()}`;
const tenant="20000000-0000-4000-8000-000000000001";
const project="20000000-0000-4000-8000-000000000002";
const principal="20000000-0000-4000-8000-000000000003";
const surfaces=["actors","events","artifacts","schemas","threads","engramport.yaml"];
const worker=path.join(import.meta.dirname,"w1-7-canary-operation-worker.mjs");

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
async function eventFiles(root){const directory=path.join(root,"events","agent-b");return Promise.all((await readdir(directory)).filter(name=>name.endsWith(".md")).map(async name=>({name,source:await readFile(path.join(directory,name),"utf8")})));}
function reportInput(canary,report){const auth=authorization();const record={event_id:"20000000-0000-4000-8000-000000000011",tenant_id:tenant,project_id:project,project_seq:1,kind:"progress.published",sensitivity:"internal",visibility:"project",payload:{summary:canary},content_sha256:"",authorization_context_sha256:report.authorizationContextDigest(auth)};record.content_sha256=report.evidenceDigest(record);return {request:{authorization:auth,model_identity:"synthetic/model-v1",reporter_revision:"canary-v1"},source:{retrieveAuthorized:async()=>[record]}};}
async function runCommand(command,args,{env=process.env,allowFailure=false}={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{env});let stdout="",stderr="";child.stdout?.on("data",chunk=>{stdout+=chunk;});child.stderr?.on("data",chunk=>{stderr+=chunk;});child.on("error",reject);child.on("close",code=>{if(code!==0&&!allowFailure)reject(new Error(`${command} exited ${code}: ${stderr}`));else resolve({code,stdout,stderr});});});}
async function runOperation(mode,landing,digestValue,{material=null,argument=false,store=null,level="trace"}={}){const args=[worker,mode,landing,...(store?[store]:[]),...(argument&&material?[`--operation-material=${material}`]:[])];const env={...process.env,ENGRAM_CANARY_DIGEST:digestValue,ENGRAM_LOG_LEVEL:level};if(material&&!argument)env.ENGRAM_CANARY_MATERIAL=material;await runCommand(process.execPath,args,{env});}
async function coreOperation(root,material,containers){const dump=path.join(root,"core");await mkdir(dump,{recursive:true});await chmod(dump,0o777);const name=`engram-canary-core-${process.pid}-${Math.random().toString(16).slice(2)}`;containers.add(name);const vulnerable=Boolean(material);const perl=vulnerable?'$held=$ENV{ENGRAM_CANARY}; kill 11,$$; sleep 1':'$held="synthetic-safe"; exit 0';const args=["run","--name",name,"--ulimit","core=-1","-v",`${dump}:/dump`,"-w","/dump",...(vulnerable?["-e",`ENGRAM_CANARY=${material}`]:[]),"--entrypoint","sh","pgvector/pgvector:pg16","-c",`perl -e '${perl}'`];const result=await runCommand("docker",args,{allowFailure:true});await runCommand("docker",["rm",name],{allowFailure:true});containers.delete(name);if(vulnerable){assert.notEqual(result.code,0,"forced crash must exit nonzero");assert.match(result.stderr,/Segmentation fault \(core dumped\)/);await readFile(path.join(dump,"core"));}return {protected:!vulnerable};}
async function landingContains(file,canary){try{return (await readFile(file)).includes(Buffer.from(canary));}catch(error){if(error.code==="ENOENT")return false;throw error;}}

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
  const vulnerableOps=path.join(directory,"vulnerable-operations");const protectedOps=path.join(directory,"protected-operations");
  const containers=new Set();await Promise.all([mkdir(vulnerableOps,{recursive:true}),mkdir(protectedOps,{recursive:true})]);
  try{
    for(const [root,label] of [[vulnerableRepo,"vulnerable"],[protectedRepo,"protected"]]){
      await declare(root,`canary-events-${label}`);await declare(root,`canary-artifacts-${label}`);
    }
    const vulnerableImports={
      events:async({canary})=>{const body=path.join(vulnerableRepo,"event-body.txt");await writeFile(body,canary);return vulnerableCli.run(["append","--actor","agent-b","--thread","canary-events-vulnerable","--type","message","--body",body],vulnerableRepo);},
      artifacts:async({canary})=>{const relative="artifacts/agent-b/synthetic-canary-artifact.txt";const artifact=path.join(vulnerableRepo,relative);await writeFile(artifact,canary);const body=path.join(vulnerableRepo,"artifact-body.txt");await writeFile(body,"synthetic artifact registration");return vulnerableCli.run(["append","--actor","agent-b","--thread","canary-artifacts-vulnerable","--type","message","--body",body,"--artifacts",`${relative}#sha256=${digest(canary)}`],vulnerableRepo);},
      plans:async({canary})=>{vulnerableLanding.plan=vulnerableSetup.compileSetup(setup(canary));return vulnerableLanding.plan;},
      report_output:async({canary})=>{const input=reportInput(canary,vulnerableReport);vulnerableLanding.report_output=await vulnerableReport.runReportIfChanged({...input,previous_as_of_seq:0,generator:async()=>({summary:canary})});return vulnerableLanding.report_output;},
      logs:async({canary})=>runOperation("logs",path.join(vulnerableOps,"operation.log"),"known",{material:canary,level:"operation"}),
      process_arguments:async({canary})=>runOperation("argv",path.join(vulnerableOps,"argv.json"),"known",{material:canary,argument:true}),
      process_environment:async({canary})=>runOperation("environment",path.join(vulnerableOps,"environment.json"),"known",{material:canary}),
      core_dumps:async({canary})=>coreOperation(vulnerableOps,canary,containers),
      backups:async({canary})=>runOperation("backup",path.join(vulnerableOps,"backup.json"),"known",{material:canary,store:path.join(vulnerableOps,"store.json")}),
      error_surfaces:async({canary})=>runOperation("error",path.join(vulnerableOps,"error.json"),"known",{material:canary})
    };
    const protectedImports={
      events:async({canary})=>{const body=path.join(protectedRepo,"event-body.txt");await writeFile(body,canary);return protectedAttempt(()=>protectedCli.run(["append","--actor","agent-b","--thread","canary-events-protected","--type","message","--body",body],protectedRepo));},
      artifacts:async({canary})=>{const relative="artifacts/agent-b/synthetic-canary-artifact.txt";const artifact=path.join(protectedRepo,relative);await writeFile(artifact,canary);const body=path.join(protectedRepo,"artifact-body.txt");await writeFile(body,"synthetic artifact registration");const result=await protectedAttempt(()=>protectedCli.run(["append","--actor","agent-b","--thread","canary-artifacts-protected","--type","message","--body",body,"--artifacts",`${relative}#sha256=${digest(canary)}`],protectedRepo));if(result.refused)await rm(artifact,{force:true});return result;},
      plans:async({canary})=>protectedAttempt(()=>protectedSetup.compileSetup(setup(canary)),value=>{protectedLanding.plan=value;}),
      report_output:async({canary})=>{const input=reportInput(canary,protectedReport);return protectedAttempt(()=>protectedReport.runReportIfChanged({...input,previous_as_of_seq:0,generator:async()=>({summary:canary})}),value=>{protectedLanding.report_output=value;});},
      logs:async()=>{await runOperation("logs",path.join(protectedOps,"operation.log"),"known",{level:"trace"});return {protected:true};},
      process_arguments:async()=>{await runOperation("argv",path.join(protectedOps,"argv.json"),"known");return {protected:true};},
      process_environment:async()=>{await runOperation("environment",path.join(protectedOps,"environment.json"),"known");return {protected:true};},
      core_dumps:async()=>coreOperation(protectedOps,null,containers),
      backups:async()=>{await runOperation("backup",path.join(protectedOps,"backup.json"),"known",{store:path.join(protectedOps,"store.json")});return {protected:true};},
      error_surfaces:async()=>{await runOperation("error",path.join(protectedOps,"error.json"),"known");return {protected:true};}
    };
    const observers={
      events:{vulnerable:async({canary})=>(await eventFiles(vulnerableRepo)).some(({source})=>source.includes(canary)),protected:async({canary})=>(await eventFiles(protectedRepo)).some(({source})=>source.includes(canary))},
      artifacts:{vulnerable:async({canary})=>{const relative="artifacts/agent-b/synthetic-canary-artifact.txt";const reference=`${relative}#sha256=${digest(canary)}`;return (await eventFiles(vulnerableRepo)).some(({source})=>source.includes("thread: canary-artifacts-vulnerable")&&source.includes(`artifacts: [${reference}]`))&&await landingContains(path.join(vulnerableRepo,relative),canary);},protected:async({canary})=>{const registered=(await eventFiles(protectedRepo)).some(({source})=>source.includes("thread: canary-artifacts-protected")&&source.includes("artifacts:"));return registered||await landingContains(path.join(protectedRepo,"artifacts/agent-b/synthetic-canary-artifact.txt"),canary);}},
      plans:{vulnerable:async({canary})=>JSON.stringify(vulnerableLanding.plan).includes(canary),protected:async({canary})=>JSON.stringify(protectedLanding.plan).includes(canary)},
      report_output:{vulnerable:async({canary})=>JSON.stringify(vulnerableLanding.report_output).includes(canary),protected:async({canary})=>JSON.stringify(protectedLanding.report_output).includes(canary)},
      logs:{vulnerable:async({canary})=>landingContains(path.join(vulnerableOps,"operation.log"),canary),protected:async({canary})=>landingContains(path.join(protectedOps,"operation.log"),canary)},
      process_arguments:{vulnerable:async({canary})=>landingContains(path.join(vulnerableOps,"argv.json"),canary),protected:async({canary})=>landingContains(path.join(protectedOps,"argv.json"),canary)},
      process_environment:{vulnerable:async({canary})=>landingContains(path.join(vulnerableOps,"environment.json"),canary),protected:async({canary})=>landingContains(path.join(protectedOps,"environment.json"),canary)},
      core_dumps:{vulnerable:async({canary})=>landingContains(path.join(vulnerableOps,"core","core"),canary),protected:async({canary})=>landingContains(path.join(protectedOps,"core","core"),canary)},
      backups:{vulnerable:async({canary})=>landingContains(path.join(vulnerableOps,"backup.json"),canary),protected:async({canary})=>landingContains(path.join(protectedOps,"backup.json"),canary)},
      error_surfaces:{vulnerable:async({canary})=>landingContains(path.join(vulnerableOps,"error.json"),canary),protected:async({canary})=>landingContains(path.join(protectedOps,"error.json"),canary)}
    };
    const harness=canaryHarness({boundary,tenantId:"synthetic-canary-tenant",keyName:"synth-a",vulnerableImports,protectedImports,observers});
    assert.match(harness.canary,/^Bearer synthetic-canary-[0-9a-f]{64}$/);assert.match(harness.digest,/^[0-9a-f]{64}$/);
    const vulnerable=[];const protectedResults=[];
    for(const sink of harness.sinks){vulnerable.push(await harness.vulnerable(sink));protectedResults.push(await harness.protectedRun(sink));}
    const vulnerableLog=JSON.parse((await readFile(path.join(vulnerableOps,"operation.log"),"utf8")).trim());const protectedLog=JSON.parse((await readFile(path.join(protectedOps,"operation.log"),"utf8")).trim());
    const vulnerableArgv=JSON.parse(await readFile(path.join(vulnerableOps,"argv.json"),"utf8"));const vulnerableEnvironment=JSON.parse(await readFile(path.join(vulnerableOps,"environment.json"),"utf8"));const vulnerableError=JSON.parse(await readFile(path.join(vulnerableOps,"error.json"),"utf8"));
    assert.equal(vulnerableLog.level,"operation");assert.equal(protectedLog.level,"trace");assert.equal(vulnerableArgv.operation,"sign");assert.match(vulnerableArgv.syntheticSignature,/^[0-9a-f]{64}$/);assert.equal(vulnerableEnvironment.operation,"sign");assert.match(vulnerableEnvironment.syntheticSignature,/^[0-9a-f]{64}$/);assert.ok(vulnerableError.message.includes(harness.canary));assert.ok(vulnerableError.stack.includes(harness.canary));
    const vulnerableDirty=vulnerable.filter(result=>result.dirty&&result.observed).length;
    const protectedClean=protectedResults.filter(result=>result.materialExcluded&&result.clean&&!result.dirty&&result.signed).length;
    console.log(`W1_7_CANARY vulnerable_dirty=${vulnerableDirty}/10 protected_clean=${protectedClean}/10 signed=${protectedResults.filter(result=>result.signed).length}/10 digest=${harness.digest} isolation=separate-production-module-graphs-and-landings observers=event-file,artifact-registration,compiled-plan,report-output,operation-log,live-argv,live-environment,core-dump,live-backup,error-message-and-stack`);
    assert.equal(vulnerableDirty,10,"a real sink landing never observed dirty has an unproven observer");assert.equal(protectedClean,10);assert.equal(protectedResults.every(result=>result.digest===harness.digest),true);
    return {vulnerable,protectedResults,digest:harness.digest};
  }finally{for(const name of containers)await runCommand("docker",["rm","-f",name],{allowFailure:true});await rm(directory,{recursive:true,force:true});}
}
