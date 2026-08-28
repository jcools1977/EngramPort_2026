import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import pg from "pg";

const observationModule=process.env.OBSERVATION_MODULE??pathToFileURL(path.resolve(import.meta.dirname,"../packages/port-watch/src/index.mjs")).href;
const { ObservationConsumer,PostgresObservationDispositionStore,authorizedObservationSource,checkpointDigest,stableDeliveryId }=await import(observationModule);

const { Pool }=pg;
const adminUrl=process.env.OBSERVATION_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const baseUrl=process.env.OBSERVATION_DATABASE_URL??"postgres://127.0.0.1:5432/engramport";
const ids={tenantA:"10000000-0000-0000-0000-000000000001",principalA:"11000000-0000-0000-0000-000000000001",projectA:"12000000-0000-0000-0000-000000000001",tenantB:"20000000-0000-0000-0000-000000000002",principalB:"22000000-0000-0000-0000-000000000002",projectB:"23000000-0000-0000-0000-000000000002",subscriptionA:"91000000-0000-0000-0000-000000000001",subscriptionB:"92000000-0000-0000-0000-000000000002"};
const selector="a".repeat(64);
const events=[{position:"events/agent-a/001.md",event_id:"event-a",canonical_bytes:Buffer.from("alpha\n")},{position:"events/agent-a/002.md",event_id:"event-b",canonical_bytes:Buffer.from("beta\n")}];
const source=authorizedObservationSource({query:async({after})=>events.filter((entry)=>after===null||entry.position>after),readRange:async({from,to})=>events.filter((entry)=>entry.position>=from&&entry.position<=to)});
const roleUrl=(role,password)=>{const parsed=new URL(baseUrl);parsed.username=role;parsed.password=password;return parsed.toString();};

test("PostgreSQL observation disposition is durable, deduplicated, and subject isolated",async(t)=>{
  const admin=new Pool({connectionString:adminUrl,max:2});
  const roleA="observation_test_a",roleB="observation_test_b",passwordA="synthetic-observation-a",passwordB="synthetic-observation-b";
  await admin.query(`CREATE ROLE ${roleA} LOGIN PASSWORD '${passwordA}' NOSUPERUSER NOBYPASSRLS INHERIT; CREATE ROLE ${roleB} LOGIN PASSWORD '${passwordB}' NOSUPERUSER NOBYPASSRLS INHERIT; GRANT engram_app TO ${roleA},${roleB}`);
  await admin.query("INSERT INTO observation_subject_bindings(database_role,tenant_id,subscriber_id) VALUES ($1,$2,$3),($4,$5,$6)",[roleA,ids.tenantA,ids.principalA,roleB,ids.tenantB,ids.principalB]);
  await admin.query("INSERT INTO observation_subscriptions(tenant_id,subscription_id,subscriber_id,project_id,selector_revision) VALUES ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10)",[ids.tenantA,ids.subscriptionA,ids.principalA,ids.projectA,selector,ids.tenantB,ids.subscriptionB,ids.principalB,ids.projectB,selector]);
  const poolA=new Pool({connectionString:roleUrl(roleA,passwordA),max:2}),poolB=new Pool({connectionString:roleUrl(roleB,passwordB),max:2});let secondPool;
  t.after(async()=>{await poolA.end();await poolB.end();if(secondPool)await secondPool.end();await admin.query("ALTER TABLE observation_checkpoints DISABLE TRIGGER USER");await admin.query("DELETE FROM observation_checkpoints WHERE subscription_id IN ($1,$2)",[ids.subscriptionA,ids.subscriptionB]);await admin.query("ALTER TABLE observation_checkpoints ENABLE TRIGGER USER");await admin.query("DELETE FROM observation_subscriptions WHERE subscription_id IN ($1,$2)",[ids.subscriptionA,ids.subscriptionB]);await admin.query("DELETE FROM observation_subject_bindings WHERE database_role IN ($1,$2)",[roleA,roleB]);await admin.query(`REVOKE engram_app FROM ${roleA},${roleB}; DROP ROLE ${roleA}; DROP ROLE ${roleB}`);await admin.end();});
  const subscription={tenant_id:ids.tenantA,subscription_id:ids.subscriptionA,subscriber_id:ids.principalA,selector_revision:selector};
  const storeA=new PostgresObservationDispositionStore(poolA);
  const first=await new ObservationConsumer({source,store:storeA,sink:{async deliver(){return {accepted:true};}}}).poll(subscription);
  assert.equal(first.action,"delivered");
  assert.equal((await admin.query("SELECT count(*)::int n FROM observation_checkpoints WHERE subscription_id=$1",[ids.subscriptionA])).rows[0].n,1);
  const duplicate={...first.checkpoint,checkpoint_id:"93000000-0000-0000-0000-000000000002"};
  duplicate.delivery_id=stableDeliveryId(duplicate);duplicate.checkpoint_digest=checkpointDigest(duplicate);
  await storeA.append(duplicate);
  assert.equal((await admin.query("SELECT count(*)::int n FROM observation_checkpoints WHERE subscription_id=$1",[ids.subscriptionA])).rows[0].n,1);

  secondPool=new Pool({connectionString:roleUrl(roleA,passwordA),max:1});
  const rebuilt=await new ObservationConsumer({source,store:new PostgresObservationDispositionStore(secondPool),sink:{async deliver(){throw new Error("must not redeliver");}}}).poll(subscription);
  assert.deepEqual(rebuilt,{action:"skip",reason:"unchanged",position:events.at(-1).position});

  assert.equal((await admin.query("SELECT count(*)::int n FROM observation_checkpoints WHERE checkpoint_id=$1",[first.checkpoint.checkpoint_id])).rows[0].n,1);
  await assert.rejects(new PostgresObservationDispositionStore(poolB).get(first.checkpoint.checkpoint_id),(error)=>error.code==="42501"&&/row-level security|OBSERVATION_CHECKPOINT_DENIED/.test(error.message));
  await assert.rejects(poolA.query("UPDATE observation_subject_bindings SET subscriber_id=$1 WHERE database_role=session_user::name",[ids.principalB]),(error)=>error.code==="42501");

  const forged={...first.checkpoint,checkpoint_id:"93000000-0000-0000-0000-000000000003",covered_from:"events/agent-a/003.md",covered_to:"events/agent-a/003.md",event_count:1,batch_digest:"b".repeat(64),prior_checkpoint_digest:"f".repeat(64)};
  forged.delivery_id=stableDeliveryId(forged);forged.checkpoint_digest=checkpointDigest(forged);
  await assert.rejects(storeA.append(forged),(error)=>error.code==="40001"&&/OBSERVATION_PRIOR_DIGEST_INVALID/.test(error.message));
  assert.equal((await admin.query("SELECT relforcerowsecurity forced FROM pg_class WHERE oid='observation_checkpoints'::regclass")).rows[0].forced,true);
  console.log("OBSERVATION_STORE durable=second_connection dedup=one forced_rls=true foreign_known=denied subject_rebind=denied prior_digest=refused identity=synthetic_database_roles limitation=not_second_physical_machine");
});
