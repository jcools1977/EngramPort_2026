// Docker-free diagnostic and mutation control. Container outputs and files are synthetic.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";

const fixture="tests/helpers/w1-7-canary-fixture.mjs";
const source=await readFile(fixture,"utf8");
const original=execFileSync("git",["show",`ead7d4cb3c8c98df3aa36acd93c7d29146b0ab11:${fixture}`],{encoding:"utf8"});
const core=text=>text.slice(text.indexOf("async function coreOperation("),text.indexOf("async function landingContains("));
const mapping='"--add-host=host.docker.internal:host-gateway",';
const reason="  // Actions run 34369284714: Linux Docker needs this mapping for the protected KMS request.\n";
assert.equal(core(source).replace(mapping,"").replace(reason,""),core(original));
assert.ok(core(source).includes(mapping));
const observations=text=>text.slice(text.indexOf("    const vulnerableLanding="));
assert.equal(observations(source),observations(original));
for(const file of ["tests/wizard-w1-7.test.mjs","tests/wizard-w1-7-live.test.mjs",".github/workflows/verify-proof.yml"]){
  assert.equal(await readFile(file,"utf8"),execFileSync("git",["show",`ead7d4cb3c8c98df3aa36acd93c7d29146b0ab11:${file}`],{encoding:"utf8"}));
}
assert.ok(source.indexOf("await checkCanaryHostPreconditions({directory,signing,containers});")<source.indexOf("    const vulnerableLanding="));
console.log("UNCHANGED core-operation=identical-except-gateway-and-reason canary-observations=byte-identical tests-and-workflow=byte-identical preflight-before-sinks=true");

const root=await mkdtemp(path.join(os.tmpdir(),"engram-precondition-control-"));
try{
  async function loadVariant(label,text){
    const file=path.join(root,`${label}.mjs`);await writeFile(file,text);
    return import(pathToFileURL(file));
  }
  async function probe(module,{failure=null,hostFailure=false,missingCore=false,invalidResponse=false,runtimeFailure=false,missingDiagnostic=false}={}){
    const directory=await mkdtemp(path.join(root,"probe-"));
    let called=0;
    try{
      await module.checkCanaryHostPreconditions({directory,containers:new Set(),signing:{token:"synthetic-probe-token",port:18201},
        fetchSigning:async(url,options)=>{
          assert.equal(url,"http://127.0.0.1:18201/v1/transit/sign/synth-a/sha2-256");
          assert.equal(options.method,"POST");assert.ok(JSON.parse(options.body).input);
          if(hostFailure)throw new Error("private\ntransport detail");
          return {ok:true,json:async()=>({data:{signature:"vault:v1:synthetic"}})};
        },
        run:async(command,args)=>{
          called++;assert.equal(command,"docker");assert.ok(args.includes(mapping.slice(1,-2)));
          assert.ok(args.includes("core=-1"));assert.ok(args.includes("pgvector/pgvector:pg16"));
          const shell=args.at(-1);execFileSync("bash",["-n"],{input:shell});
          assert.ok(shell.includes('"${#SIGN_BODY}"'));
          if(runtimeFailure)throw new Error("private\nDocker detail");
          if(failure)return {code:1,stdout:`W1_7_PREFLIGHT:${failure}\n`,stderr:"private\ncontainer detail"};
          const dump=path.join(directory,"host-preflight");
          await writeFile(path.join(dump,"mount-probe"),"mount-probe");
          if(!missingCore)await writeFile(path.join(dump,"core"),"synthetic-core-bytes");
          await writeFile(path.join(dump,"sign-response"),invalidResponse?'HTTP/1.1 403 Forbidden\r\n\r\n{}':'HTTP/1.1 200 OK\r\n\r\n{"data":{"signature":"vault:v1:synthetic"}}');
          return {code:0,stdout:"",stderr:missingDiagnostic?"":"Segmentation fault (core dumped)"};
        }});
      assert.equal(called,1);
      await assert.rejects(readFile(path.join(directory,"host-preflight","core")),{code:"ENOENT"});
    }finally{await rm(directory,{recursive:true,force:true});}
  }
  async function controls(module){
    await probe(module);
    for(const failure of ["TOOLS","CORE_USES_PID","CORE_LIMITS","HOST_RESOLUTION","DUMP_MOUNT","DUMP_READABILITY","CORE_DUMP","CONTAINER_SIGNER"]){
      await assert.rejects(probe(module,{failure}),error=>error.message.startsWith(`W1_7_CANARY_${failure}: `)&&!error.message.includes("\n"));
    }
    for(const [options,code] of [[{hostFailure:true},"HOST_SIGNER"],[{missingCore:true},"HOST_DUMP_READ"],[{invalidResponse:true},"HOST_DUMP_READ"],[{runtimeFailure:true},"CONTAINER_RUNTIME"],[{missingDiagnostic:true},"CORE_DIAGNOSTIC"]]){
      await assert.rejects(probe(module,options),error=>error.message.startsWith(`W1_7_CANARY_${code}: `)&&!error.message.includes("\n")&&!error.message.includes("private"));
    }
  }
  await controls(await loadVariant("baseline",source));
  console.log("PRECONDITIONS synthetic-baseline=passed diagnostic-failures=13 single-line=true shell-syntax=passed cleanup=passed");
  for(const [label,mutated] of [
    ["gateway-removed",source.replaceAll(mapping,"")],
    ["container-failure-ignored",source.replace("if(result.code!==0){const code=", "if(false){const code=")],
    ["host-dump-check-removed",source.replace('if(!(await readFile(path.join(dump,"core"))).length)throw new Error("empty core");',"")]
  ]){
    assert.notEqual(mutated,source);
    await assert.rejects(controls(await loadVariant(label,mutated)));
    console.log(`MUTATION name=${label} control=failed-as-required`);
  }
  await controls(await loadVariant("restored",source));
  console.log("RESTORED synthetic-controls=passed live-canary=blocked actions=blocked");
}finally{await rm(root,{recursive:true,force:true});}
