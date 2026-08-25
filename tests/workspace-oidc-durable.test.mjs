import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test,{after} from "node:test";
import { Miniflare, NoOpLog } from "miniflare";

const root=process.env.W1_1_OIDC_DURABLE_MODULE_ROOT??path.resolve(import.meta.dirname,"..");
const selected=process.env.W1_1_OIDC_DURABLE_CASE??"all";
const fixture=path.join(root,"tests/fixtures/oidc-durable-worker.mjs");
const ISSUER="https://synthetic-issuer.invalid",CLIENT="engramport-durable-synthetic",REDIRECT="http://localhost/auth/callback";
const temporaryDirectories=new Set();
after(async()=>{for(const directory of temporaryDirectories)await rm(directory,{recursive:true,force:true});});

function check(name,operation){test(name,{skip:selected!=="all"&&selected!==name},operation);}
async function runtime(persist,ttl=1000){
  return new Miniflare({
    modules:true,
    modulesRoot:root,
    scriptPath:fixture,
    compatibilityDate:"2026-05-22",
    compatibilityFlags:["nodejs_compat"],
    durableObjects:{OIDC_TRANSACTIONS:{className:"OidcTransactionDurableObject",useSQLite:true}},
    durableObjectsPersist:persist,
    bindings:{OIDC_ISSUER:ISSUER,OIDC_AUTHORIZATION_ENDPOINT:`${ISSUER}/authorize`,OIDC_CLIENT_ID:CLIENT,OIDC_REDIRECT_URI:REDIRECT,OIDC_SCOPE:"openid",OIDC_TRANSACTION_TTL_MS:String(ttl)},
    log:new NoOpLog(),
  });
}
async function temporary(operation){const directory=await mkdtemp(path.join(os.tmpdir(),"engramport-oidc-do-"));temporaryDirectories.add(directory);return operation(directory);}
async function start(mf){const response=await mf.dispatchFetch("http://localhost/auth/start",{redirect:"manual"});assert.equal(response.status,302);const location=response.headers.get("location"),url=new URL(location);return {response,location,url,state:url.searchParams.get("state"),nonce:url.searchParams.get("nonce"),expiresAt:null};}
async function callback(mf,state,code="positive"){return mf.dispatchFetch(`http://localhost/auth/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`);}
async function inspect(mf,state){const response=await mf.dispatchFetch(`http://localhost/__oidc/inspect?state=${encodeURIComponent(state)}`);return {response,body:await response.text()};}

check("route",()=>temporary(async persist=>{
  const mf=await runtime(persist);try{
    const started=await mf.dispatchFetch("http://localhost/auth/start",{redirect:"manual"}),location=started.headers.get("location"),state=location?new URL(location).searchParams.get("state"):"missing",fallback=await mf.dispatchFetch("http://localhost/not-auth"),completed=await callback(mf,state);
    console.log(`W1_1_OIDC_DURABLE route start=${started.status} callback=${completed.status} fallback=${fallback.status}`);
    assert.deepEqual({start:started.status,callback:completed.status,fallback:fallback.status},{start:302,callback:204,fallback:404});
  }finally{await mf.dispose();}
}));

check("same-name",()=>temporary(async persist=>{
  const mf=await runtime(persist);try{
    const attempt=await start(mf),before=await inspect(mf,attempt.state),completed=await callback(mf,attempt.state),after=await inspect(mf,attempt.state),unknown=await callback(mf,"unknown-state");
    const pending=JSON.parse(before.body),clean=JSON.parse(after.body);
    console.log(`W1_1_OIDC_DURABLE same_name pending=${pending.status}/${pending.present} callback=${completed.status} clean=${clean.status}/${clean.present} unknown=${unknown.status}`);
    assert.deepEqual({pending:pending.status,present:pending.present,callback:completed.status,clean:clean.present,unknown:unknown.status},{pending:"pending",present:true,callback:204,clean:false,unknown:400});
  }finally{await mf.dispose();}
}));

check("restart",()=>temporary(async persist=>{
  let mf=await runtime(persist);const attempt=await start(mf),before=await inspect(mf,attempt.state);await mf.dispose();
  mf=await runtime(persist);try{
    const completed=await callback(mf,attempt.state),after=await inspect(mf,attempt.state);
    console.log(`W1_1_OIDC_DURABLE restart before=${JSON.parse(before.body).present} callback=${completed.status} clean=${JSON.parse(after.body).present}`);
    assert.deepEqual({before:JSON.parse(before.body).present,callback:completed.status,clean:JSON.parse(after.body).present},{before:true,callback:204,clean:false});
  }finally{await mf.dispose();}
}));

check("atomic",()=>temporary(async persist=>{
  const mf=await runtime(persist);try{
    const attempt=await start(mf),responses=await Promise.all([callback(mf,attempt.state,"race"),callback(mf,attempt.state,"race")]),statuses=responses.map(value=>value.status).sort(),bodies=await Promise.all(responses.map(value=>value.text())),after=await inspect(mf,attempt.state);
    console.log(`W1_1_OIDC_DURABLE atomic statuses=${statuses.join("/")} clean=${JSON.parse(after.body).present}`);
    assert.deepEqual(statuses,[204,400]);assert.equal(JSON.parse(after.body).present,false);assert.equal(bodies.some(body=>body.includes("OIDC_STATE_REFUSED")),true);
  }finally{await mf.dispose();}
}));

check("expiry",()=>temporary(async persist=>{
  let mf=await runtime(persist,50);const expired=await start(mf);await new Promise(resolve=>setTimeout(resolve,90));const refused=await callback(mf,expired.state),after=await inspect(mf,expired.state);await mf.dispose();
  mf=await runtime(persist,1000);try{
    const fresh=await start(mf),accepted=await callback(mf,fresh.state);
    console.log(`W1_1_OIDC_DURABLE expiry expired=${refused.status} clean=${JSON.parse(after.body).present} fresh=${accepted.status}`);
    assert.deepEqual({expired:refused.status,clean:JSON.parse(after.body).present,fresh:accepted.status},{expired:410,clean:false,fresh:204});
  }finally{await mf.dispose();}
}));

check("cleanup",()=>temporary(async persist=>{
  let mf=await runtime(persist,1000);const claimed=await start(mf),scheduled=JSON.parse((await inspect(mf,claimed.state)).body),completed=await callback(mf,claimed.state),claimedAfter=JSON.parse((await inspect(mf,claimed.state)).body);await mf.dispose();
  mf=await runtime(persist,60);try{
    const abandoned=await start(mf),before=JSON.parse((await inspect(mf,abandoned.state)).body);await new Promise(resolve=>setTimeout(resolve,100));const alarmResponse=await mf.dispatchFetch(`http://localhost/__oidc/alarm?state=${encodeURIComponent(abandoned.state)}`),alarmText=await alarmResponse.text();if(alarmResponse.status!==200)throw new Error(`alarm control ${alarmResponse.status}: ${alarmText}`);const alarmAfter=JSON.parse(alarmText);
    const alarmScheduled=scheduled.alarmAt>scheduled.expiresAt&&before.alarmAt>before.expiresAt;
    console.log(`W1_1_OIDC_DURABLE cleanup scheduled=${alarmScheduled} claimed=${completed.status}/${claimedAfter.present} alarm=${alarmAfter.present}`);
    assert.deepEqual({scheduled:alarmScheduled,claimed:completed.status,claimedClean:claimedAfter.present,alarmClean:alarmAfter.present},{scheduled:true,claimed:204,claimedClean:false,alarmClean:false});
  }finally{await mf.dispose();}
}));

check("redaction",()=>temporary(async persist=>{
  const mf=await runtime(persist);try{
    const attempt=await start(mf),control=await inspect(mf,attempt.state),completed=await callback(mf,attempt.state),callbackBody=await completed.text();
    const nonceOnlyInRedirect=attempt.location.includes(attempt.nonce)&&!control.body.includes(attempt.nonce)&&!callbackBody.includes(attempt.nonce),metadataKeys=Object.keys(JSON.parse(control.body)).sort().join(",");
    console.log(`W1_1_OIDC_DURABLE redaction nonce_only_redirect=${nonceOnlyInRedirect} metadata=${metadataKeys} callback_bytes=${callbackBody.length}`);
    assert.equal(nonceOnlyInRedirect,true);assert.equal(metadataKeys,"alarmAt,expiresAt,present,status");assert.equal(control.body.includes("nonce"),false);assert.equal(control.body.includes("codeVerifier"),false);assert.equal(callbackBody,"");
  }finally{await mf.dispose();}
}));
