import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { Pool } from "pg";

const root=process.env.W1_1_MANAGER_MODULE_ROOT??path.resolve(import.meta.dirname,"..");
const moduleUrl=relative=>pathToFileURL(path.join(root,relative)).href;
const {PostgresSetupSessionStore}=await import(moduleUrl("packages/git-adapter/src/workspace-session-store.mjs"));
const {SetupSessionManager,founderAuthenticator,founderAuthorityResolver}=await import(moduleUrl("packages/git-adapter/src/workspace-session.mjs"));
const {compileSetup}=await import(moduleUrl("packages/git-adapter/src/workspace-setup.mjs"));

const selected=process.env.W1_1_MANAGER_CASE??"all";
const maintenanceUrl=process.env.W1_1_MANAGER_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport";
const adminUrl=process.env.W1_1_MANAGER_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const principal="11000000-0000-0000-0000-000000000001";
const maintenance=new Pool({connectionString:maintenanceUrl,max:4,connectionTimeoutMillis:1000,statement_timeout:5000});
const admin=new Pool({connectionString:adminUrl,max:2,connectionTimeoutMillis:1000,statement_timeout:5000});

const atHours=hours=>new Date(Date.now()+hours*60*60*1000).toISOString();
const plan=()=>compileSetup({schema_version:0,created_at:"2026-08-14T12:00:00Z",founder:{principal_id:"founder",scopes:["events:write"],assignable_trust:["untrusted_agent"],expires_at:null},repository:{provider:"github",owner:"acme",name:"engram",default_branch:"main",permissions:["contents:read"],depends_on:[]},database:{mode:"connect_existing",target:"postgresql",depends_on:[]},participants:[],groups:[],import:{paths:[],include_history:false,depends_on:[]},welcome:{expiry_days:14,depends_on:[]}});

async function reset(){
  await admin.query("DELETE FROM setup_session_delegations");
  await admin.query("UPDATE founder_authorities SET scopes=ARRAY['setup:plan:execute'],expires_at=clock_timestamp()+interval '48 hours',revoked_at=NULL WHERE principal_id=$1",[principal]);
}

function fixture(){
  let sessionSequence=0,approvalSequence=0;
  const store=new PostgresSetupSessionStore({pool:maintenance});
  const manager=new SetupSessionManager({
    store,
    authenticator:founderAuthenticator(async()=>({principal_id:principal})),
    authorityResolver:founderAuthorityResolver(async principal_id=>({principal_id,scopes:["setup:plan:execute"],expires_at:atHours(48)})),
    clock:()=>new Date(),
    idFactory:kind=>kind==="session"?`44000000-0000-4000-8000-${String(++sessionSequence).padStart(12,"0")}`:`approval-${++approvalSequence}`,
  });
  return {manager,store};
}

const start=manager=>manager.start({credential:"synthetic",scopes:["setup:plan:execute"],expires_at:atHours(12)});
const outcome=async operation=>{try{await operation();return "accepted";}catch(error){return error.code??error.message;}};

async function runCase(name){
  await reset();
  const {manager,store}=fixture();
  if(name==="expired"){
    const session=await start(manager),compiled=plan(),approval=await manager.approvePlan(session.session_id,compiled);
    const positive=(await manager.executeApprovedStep(session.session_id,approval,compiled,"repository.connect")).status;
    await admin.query("UPDATE setup_session_delegations SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1",[session.session_id]);
    const negative=await outcome(()=>manager.executeApprovedStep(session.session_id,approval,compiled,"repository.connect"));
    console.log(`W1_1_CRITERION5 expired positive=${positive} negative=${negative}`);
    assert.deepEqual({positive,negative},{positive:"authorized",negative:"SESSION_EXPIRED"});
  }else if(name==="revoked"){
    const session=await start(manager),positive=(await manager.authorize(session.session_id)).status;
    await manager.complete(session.session_id);
    const negative=await outcome(()=>manager.authorize(session.session_id));
    console.log(`W1_1_CRITERION5 revoked positive=${positive} negative=${negative}`);
    assert.deepEqual({positive,negative},{positive:"active",negative:"SESSION_REVOKED"});
  }else if(name==="revoked-execute"){
    const positiveSession=await start(manager),compiled=plan(),positiveApproval=await manager.approvePlan(positiveSession.session_id,compiled);
    const positive=(await manager.executeApprovedStep(positiveSession.session_id,positiveApproval,compiled,"repository.connect")).status;
    const revokedSession=await start(manager),unreplayedApproval=await manager.approvePlan(revokedSession.session_id,compiled);
    const externalStore=new PostgresSetupSessionStore({pool:maintenance,sessionBindings:[[revokedSession.session_id,principal]]});
    const durable=(await externalStore.transition(revokedSession.session_id,"completed")).state;
    const genuine=(await store.getApproval(revokedSession.session_id,unreplayedApproval.approval_id))?.approval===unreplayedApproval;
    const unreplayed=!(await store.approvalRevoked(unreplayedApproval.approval_id));
    const negative=await outcome(()=>manager.executeApprovedStep(revokedSession.session_id,unreplayedApproval,compiled,"repository.connect"));
    console.log(`W1_1_CRITERION3 revoked_execute positive=${positive} negative=${negative} genuine=${genuine} unreplayed=${unreplayed} durable=${durable.status}`);
    assert.deepEqual({positive,negative,genuine,unreplayed,durable:durable.status},{positive:"authorized",negative:"SESSION_REVOKED",genuine:true,unreplayed:true,durable:"completed"});
  }else if(name==="different"){
    const a=await start(manager),b=await start(manager),compiled=plan(),approval=await manager.approvePlan(a.session_id,compiled);
    const positive=(await manager.executeApprovedStep(a.session_id,approval,compiled,"repository.connect")).status;
    const negative=await outcome(()=>manager.executeApprovedStep(b.session_id,approval,compiled,"repository.connect"));
    console.log(`W1_1_CRITERION5 different positive=${positive} negative=${negative}`);
    assert.deepEqual({positive,negative},{positive:"authorized",negative:"APPROVAL_SESSION_MISMATCH"});
  }else if(name==="replay"){
    const session=await start(manager),compiled=plan(),approval=await manager.approvePlan(session.session_id,compiled);
    const positive=(await manager.executeApprovedStep(session.session_id,approval,compiled,"repository.connect")).status;
    await manager.complete(session.session_id);
    const negative=await outcome(()=>manager.executeApprovedStep(session.session_id,approval,compiled,"repository.connect"));
    console.log(`W1_1_CRITERION5 replay positive=${positive} negative=${negative}`);
    assert.deepEqual({positive,negative},{positive:"authorized",negative:"APPROVAL_REPLAY_REFUSED"});
  }else throw new Error(`unknown W1_1_MANAGER_CASE ${name}`);
}

test(`W1-1 composed durable session controls: ${selected}`,async()=>{
  try{
    const cases=selected==="all"?["expired","revoked","revoked-execute","different","replay"]:[selected];
    for(const name of cases)await runCase(name);
  }finally{await reset().catch(()=>{});await maintenance.end();await admin.end();}
});
