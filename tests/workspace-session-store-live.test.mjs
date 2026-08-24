import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

import { PostgresSetupSessionStore } from "../packages/git-adapter/src/workspace-session-store.mjs";
import { SetupSessionManager, founderAuthenticator, founderAuthorityResolver, translateSetupSessionStoreError } from "../packages/git-adapter/src/workspace-session.mjs";

const maintenanceUrl=process.env.W1_1_MANAGER_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport";
const adminUrl=process.env.W1_1_MANAGER_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const principal="11000000-0000-0000-0000-000000000001";
const ids={positive:"43000000-0000-4000-8000-000000000001",exceeded:"43000000-0000-4000-8000-000000000002",unresolved:"43000000-0000-4000-8000-000000000003",expired:"43000000-0000-4000-8000-000000000004",completed:"43000000-0000-4000-8000-000000000005",unreachable:"43000000-0000-4000-8000-000000000006"};
const now=()=>Date.now(),atHours=hours=>new Date(now()+hours*60*60*1000).toISOString();
const maintenance=new Pool({connectionString:maintenanceUrl,max:4,connectionTimeoutMillis:1000,statement_timeout:5000});
const admin=new Pool({connectionString:adminUrl,max:2,connectionTimeoutMillis:1000,statement_timeout:5000});

test.beforeEach(async()=>{
  await admin.query("DELETE FROM setup_session_delegations");
  await admin.query("INSERT INTO custody_retention_policies(policy_name,duration,clock_source) VALUES('RET-SESSION',interval '1 day','session_start') ON CONFLICT(policy_name) DO UPDATE SET duration=EXCLUDED.duration,clock_source=EXCLUDED.clock_source");
  await admin.query("UPDATE founder_authorities SET scopes=ARRAY['setup:plan:execute'],expires_at=clock_timestamp()+interval '48 hours',revoked_at=NULL WHERE principal_id=$1",[principal]);
});
test.after(async()=>{await admin.query("INSERT INTO custody_retention_policies(policy_name,duration,clock_source) VALUES('RET-SESSION',interval '1 day','session_start') ON CONFLICT(policy_name) DO UPDATE SET duration=EXCLUDED.duration,clock_source=EXCLUDED.clock_source").catch(()=>{});await maintenance.end();await admin.end();});

function manager(id,store=new PostgresSetupSessionStore({pool:maintenance})){
  return new SetupSessionManager({
    store,
    authenticator:founderAuthenticator(async()=>({principal_id:principal})),
    authorityResolver:founderAuthorityResolver(async principal_id=>({principal_id,scopes:["setup:plan:execute"],expires_at:atHours(48)})),
    clock:()=>new Date(),
    idFactory:()=>id,
  });
}
const start=(instance,hours)=>instance.start({credential:"synthetic",scopes:["setup:plan:execute"],expires_at:atHours(hours)});
const rowCount=async()=>Number((await admin.query("SELECT count(*) AS count FROM setup_session_delegations")).rows[0].count);

test("accepted durable refusal inventory maps exactly at the manager boundary",()=>{
  assert.deepEqual([
    "SETUP_SESSION_AUTHORITY_REFUSED",
    "SETUP_SESSION_SCOPE_NOT_SETUP",
    "SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY",
    "SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY",
    "SETUP_SESSION_RETENTION_UNRESOLVED",
    "SETUP_SESSION_RETENTION_EXCEEDED",
    "SETUP_SESSION_NOT_OWNED",
    "SESSION_UNBOUND",
  ].map(code=>[code,translateSetupSessionStoreError({message:code})]),[
    ["SETUP_SESSION_AUTHORITY_REFUSED","FOUNDER_AUTHORITY_NOT_FOUND"],
    ["SETUP_SESSION_SCOPE_NOT_SETUP","SESSION_SCOPE_NOT_SETUP"],
    ["SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY","SESSION_SCOPE_EXCEEDS_FOUNDER"],
    ["SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY","SESSION_OUTLIVES_FOUNDER"],
    ["SETUP_SESSION_RETENTION_UNRESOLVED","SESSION_RETENTION_UNRESOLVED"],
    ["SETUP_SESSION_RETENTION_EXCEEDED","SESSION_RETENTION_EXCEEDED"],
    ["SETUP_SESSION_NOT_OWNED","SESSION_REVOKED"],
    ["SESSION_UNBOUND","SESSION_REVOKED"],
  ]);
  assert.equal(translateSetupSessionStoreError({message:"UNACCEPTED_DURABLE_REFUSAL"}),null);
});

test("RET-SESSION permits 12 hours and refuses 25 hours under 48-hour founder authority",async()=>{
  const positive=await start(manager(ids.positive),12);
  assert.equal(positive.status,"active");
  assert.equal(await rowCount(),1);
  await assert.rejects(()=>start(manager(ids.exceeded),25),error=>error.code==="SESSION_RETENTION_EXCEEDED");
  assert.equal(await rowCount(),1);
  console.log("W1_1_MANAGER_RETENTION positive=active exceeded=SESSION_RETENTION_EXCEEDED exceeded_residue=0");
});

test("missing RET-SESSION refuses unresolved retention with zero residue",async()=>{
  assert.equal((await start(manager(ids.positive),12)).status,"active");
  await admin.query("DELETE FROM setup_session_delegations");
  await admin.query("DELETE FROM custody_retention_policies WHERE policy_name='RET-SESSION'");
  await assert.rejects(()=>start(manager(ids.unresolved),12),error=>error.code==="SESSION_RETENTION_UNRESOLVED");
  assert.equal(await rowCount(),0);
  console.log("W1_1_MANAGER_RETENTION baseline=active unresolved=SESSION_RETENTION_UNRESOLVED residue=0");
});

test("database expiry and completed terminal state remain distinct manager refusals",async()=>{
  const expiredManager=manager(ids.expired),completedManager=manager(ids.completed);
  await start(expiredManager,12);
  await admin.query("UPDATE setup_session_delegations SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1",[ids.expired]);
  await assert.rejects(()=>expiredManager.authorize(ids.expired),error=>error.code==="SESSION_EXPIRED");
  await start(completedManager,12);
  await completedManager.complete(ids.completed);
  await assert.rejects(()=>completedManager.authorize(ids.completed),error=>error.code==="SESSION_REVOKED");
  console.log("W1_1_MANAGER_TERMINAL expired=SESSION_EXPIRED completed=SESSION_REVOKED");
});

test("an unreachable durable store makes every store-observing manager operation fail",async()=>{
  const connectionString="postgres://engram_maintenance:unused@127.0.0.1:1/engramport";
  const store=new PostgresSetupSessionStore({connectionString,sessionBindings:[[ids.unreachable,principal]]});
  const instance=manager(ids.unreachable,store),fakeApproval={approval_id:"approval",session_id:ids.unreachable,plan_digest:"digest",steps:[]};
  const operations={
    start:()=>start(instance,12),
    approve:()=>instance.approvePlan(ids.unreachable,[]),
    execute:()=>instance.executeApprovedStep(ids.unreachable,fakeApproval,[],"step"),
    authorize:()=>instance.authorize(ids.unreachable),
    complete:()=>instance.complete(ids.unreachable),
    abandon:()=>instance.abandon(ids.unreachable),
    state:()=>instance.state(ids.unreachable),
    inventory:()=>instance.identityInventory(),
  };
  const failed=[];
  for(const [name,operation] of Object.entries(operations)){
    await assert.rejects(operation,error=>{
      const nested=[error,...(error?.errors??[])];
      const unreachable=nested.some(value=>value?.code==="ECONNREFUSED"||/connect|ECONNREFUSED/i.test(value?.message??""));
      if(unreachable)failed.push(name);
      return unreachable&&!String(error?.code??"").startsWith("SESSION_");
    });
  }
  assert.deepEqual(failed,Object.keys(operations));
  await store.close();
  console.log(`W1_1_MANAGER_UNREACHABLE failed=${failed.join(",")} fallback=0`);
});
