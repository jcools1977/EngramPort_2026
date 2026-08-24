import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const maintenanceUrl=process.env.D4_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport";
const postgresUrl=process.env.D4_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const principal="11000000-0000-0000-0000-000000000001";
const actor="13000000-0000-0000-0000-000000000008";
const session="15000000-0000-0000-0000-000000000008";
const tenant="10000000-0000-0000-0000-000000000001";
const project="12000000-0000-0000-0000-000000000001";
const contextProject="12000000-0000-0000-0000-0000000000d4";
const scope="custody:mint:credential:3.3:B";

async function restore(admin){
  await admin.query("TRUNCATE custody_audit,minted_references,custody_rows");
  await admin.query("UPDATE actors SET tenant_id=$2,project_id=$3,kind='service',trust='trusted_service',disabled_at=NULL WHERE id=$1",[actor,tenant,project]);
  await admin.query("UPDATE agent_sessions SET tenant_id=$2,project_id=$3,actor_id=$4,ended_at=NULL WHERE id=$1",[session,tenant,project,actor]);
  await admin.query("DELETE FROM actor_delegations WHERE actor_id=$1",[actor]);
  await admin.query("INSERT INTO actor_delegations(actor_id,principal_id,scopes,expires_at) VALUES ($1,$2,ARRAY[$3],NULL)",[actor,principal,scope]);
}

async function mint(pool,{sessionId=session,key="d4-control"}={}){
  const client=await pool.connect();
  try{await client.query("BEGIN");await client.query("SELECT set_config('app.principal_id',$1,true)",[principal]);if(sessionId!==null)await client.query("SELECT set_config('app.session_id',$1,true)",[sessionId]);const result=await client.query("SELECT mint_custody_reference('3.3','credential','B',$1,'{}') AS reference",[key]);await client.query("COMMIT");return result.rows[0].reference;}catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}
async function refusal(pool,options){try{await mint(pool,options);return "accepted";}catch(error){return error.message;}}

test("D4 accepts only the delegated trusted service and records its actor",async()=>{
  const admin=new Pool({connectionString:postgresUrl});const maintenance=new Pool({connectionString:maintenanceUrl});
  try{await restore(admin);const reference=await mint(maintenance,{key:"d4-positive"});const row=(await admin.query("SELECT minted_by_principal_id,minted_by_actor_id FROM custody_rows WHERE key_locator='d4-positive'")).rows[0];console.log(`D4_POSITIVE reference=${reference} principal=${row.minted_by_principal_id} actor=${row.minted_by_actor_id}`);assert.deepEqual(row,{minted_by_principal_id:principal,minted_by_actor_id:actor});}finally{await restore(admin).catch(()=>{});await maintenance.end();await admin.end();}
});

test("D4 names absent and ended session refusals",async()=>{
  const admin=new Pool({connectionString:postgresUrl});const maintenance=new Pool({connectionString:maintenanceUrl});
  try{await restore(admin);const absent=await refusal(maintenance,{sessionId:null,key:"d4-absent"});await admin.query("UPDATE agent_sessions SET ended_at=clock_timestamp() WHERE id=$1",[session]);const ended=await refusal(maintenance,{key:"d4-ended"});console.log(`D4_SESSION absent=${absent} ended=${ended}`);assert.equal(absent,"MINT_SESSION_REFUSED");assert.equal(ended,"MINT_SESSION_REFUSED");}finally{await restore(admin).catch(()=>{});await maintenance.end();await admin.end();}
});

test("D4 refuses agents at every trust and services at every other trust",async()=>{
  const admin=new Pool({connectionString:postgresUrl});const maintenance=new Pool({connectionString:maintenanceUrl});const trusts=["system","verified_human","trusted_service","trusted_agent","untrusted_agent","imported"];
  try{await restore(admin);const outcomes={};for(const trust of trusts){await admin.query("UPDATE actors SET kind='agent',trust=$2 WHERE id=$1",[actor,trust]);outcomes[`agent/${trust}`]=await refusal(maintenance,{key:`d4-agent-${trust}`});}for(const trust of trusts.filter(value=>value!=="trusted_service")){await admin.query("UPDATE actors SET kind='service',trust=$2 WHERE id=$1",[actor,trust]);outcomes[`service/${trust}`]=await refusal(maintenance,{key:`d4-service-${trust}`});}console.log(`D4_KIND_TRUST refused=${Object.values(outcomes).filter(value=>value==="MINT_ACTOR_REFUSED").length}/11`);assert.equal(Object.keys(outcomes).length,11);assert.ok(Object.values(outcomes).every(value=>value==="MINT_ACTOR_REFUSED"));}finally{await restore(admin).catch(()=>{});await maintenance.end();await admin.end();}
});

test("D4 refuses disabled actor, missing/expired delegation, and mismatched session context",async()=>{
  const admin=new Pool({connectionString:postgresUrl});const maintenance=new Pool({connectionString:maintenanceUrl});
  try{await restore(admin);await admin.query("UPDATE actors SET disabled_at=clock_timestamp() WHERE id=$1",[actor]);const disabled=await refusal(maintenance,{key:"d4-disabled"});await restore(admin);await admin.query("DELETE FROM actor_delegations WHERE actor_id=$1",[actor]);const missing=await refusal(maintenance,{key:"d4-missing"});await restore(admin);await admin.query("UPDATE actor_delegations SET expires_at=clock_timestamp()-interval '1 second' WHERE actor_id=$1",[actor]);const expired=await refusal(maintenance,{key:"d4-expired"});await restore(admin);await admin.query("INSERT INTO projects(id,tenant_id,slug,name) VALUES ($1,$2,'d4-context','D4 Context')",[contextProject,tenant]);await admin.query("UPDATE agent_sessions SET project_id=$2 WHERE id=$1",[session,contextProject]);const context=await refusal(maintenance,{key:"d4-context"});console.log(`D4_NEGATIVE disabled=${disabled} missing=${missing} expired=${expired} session_context=${context} revocation=row-removal`);assert.deepEqual([disabled,missing,expired,context],["MINT_ACTOR_REFUSED","MINT_ACTOR_DELEGATION_REFUSED","MINT_ACTOR_DELEGATION_REFUSED","MINT_SESSION_REFUSED"]);}finally{await restore(admin).catch(()=>{});await admin.query("DELETE FROM projects WHERE id=$1",[contextProject]).catch(()=>{});await maintenance.end();await admin.end();}
});
