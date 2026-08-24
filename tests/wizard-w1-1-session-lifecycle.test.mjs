import test from "node:test";
import assert from "node:assert/strict";
import {Pool} from "pg";

const maintenanceUrl=process.env.W1_1_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport";
const adminUrl=process.env.W1_1_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const selected=process.env.W1_1_LIFECYCLE_CASE??"all";
const principal="11000000-0000-0000-0000-000000000001";
const foreignPrincipal="22000000-0000-0000-0000-000000000002";
const ids={live:"19000000-0000-7000-8000-000000000001",expired:"19000000-0000-7000-8000-000000000002",terminal:"19000000-0000-7000-8000-000000000003",abandoned:"19000000-0000-7000-8000-000000000004",foreign:"19000000-0000-7000-8000-000000000005",atomic:"19000000-0000-7000-8000-000000000006",repeatExpired:"19000000-0000-7000-8000-000000000007",repeatLive:"19000000-0000-7000-8000-000000000008"};

async function reset(admin){
  await admin.query("DELETE FROM setup_session_delegations");
  await admin.query("UPDATE founder_authorities SET scopes=array_remove(scopes,'setup:plan'),revoked_at=NULL WHERE principal_id=$1",[principal]);
}
async function seedAuthority(admin){
  await reset(admin);
  await admin.query("UPDATE founder_authorities SET scopes=array_append(scopes,'setup:plan'),expires_at=clock_timestamp()+interval '48 hours',revoked_at=NULL WHERE principal_id=$1",[principal]);
}
async function boundQuery(pool,sql,parameters=[]){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.principal_id',$1,true)",[principal]);
    const result=await client.query(sql,parameters);
    await client.query("COMMIT");
    return result;
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}
async function create(pool,id,expiry="1 hour"){
  const result=await boundQuery(pool,"SELECT create_setup_session_delegation($1,ARRAY['setup:plan'],clock_timestamp()+$2::interval,NULL) AS id",[id,expiry]);
  return result.rows[0].id;
}
async function transition(pool,kind,id){
  const fn=kind==="completed"?"complete_setup_session_delegation":"abandon_setup_session_delegation";
  try{await boundQuery(pool,`SELECT ${fn}($1)`,[id]);return "accepted";}catch(error){return error.message;}
}
async function live(pool,id){return (await boundQuery(pool,"SELECT * FROM read_live_setup_session_delegation($1)",[id])).rows;}
async function inspect(pool,id){return (await boundQuery(pool,"SELECT * FROM inspect_setup_session_delegation($1)",[id])).rows[0]??null;}
async function plant(admin,id,founder,expiry="1 hour",terminalState=null){
  await admin.query(`INSERT INTO setup_session_delegations(session_id,founder_principal_id,scopes,expires_at,terminal_state,terminal_at)
    VALUES($1,$2,ARRAY['setup:plan'],clock_timestamp()+$3::interval,$4,CASE WHEN $4::text IS NULL THEN NULL ELSE clock_timestamp() END)`,[id,founder,expiry,terminalState]);
}

async function runCase(name,{admin,maintenance}){
  await seedAuthority(admin);
  if(name==="positive"){
    await create(maintenance,ids.live);
    await create(maintenance,ids.abandoned);
    const completed=await transition(maintenance,"completed",ids.live);
    const abandoned=await transition(maintenance,"abandoned",ids.abandoned);
    const stored=(await admin.query("SELECT session_id,terminal_state,terminal_at IS NOT NULL AS stamped FROM setup_session_delegations WHERE session_id=ANY($1::uuid[]) ORDER BY session_id",[[ids.live,ids.abandoned]])).rows;
    const completedLive=(await live(maintenance,ids.live)).length;
    const abandonedInspection=await inspect(maintenance,ids.abandoned);
    const boundary=(await admin.query(`SELECT
      position('s.expires_at>clock_timestamp()' in (SELECT prosrc FROM pg_proc WHERE oid='read_live_setup_session_delegation(uuid)'::regprocedure))>0 AS live_query_expiry,
      (SELECT bool_and(p.prosecdef AND p.proconfig=ARRAY['search_path=public']::text[]) FROM pg_proc p WHERE p.oid=ANY(ARRAY['complete_setup_session_delegation(uuid)'::regprocedure,'abandon_setup_session_delegation(uuid)'::regprocedure,'sweep_expired_setup_session_delegations()'::regprocedure,'inspect_setup_session_delegation(uuid)'::regprocedure])) AS hardened,
      NOT has_function_privilege('engram_app','sweep_expired_setup_session_delegations()','EXECUTE') AS app_denied,
      has_function_privilege('engram_maintenance','sweep_expired_setup_session_delegations()','EXECUTE') AS maintenance_sweep,
      NOT has_function_privilege('engram_maintenance','transition_setup_session_delegation(uuid,text)','EXECUTE') AS transition_private,
      NOT has_table_privilege('engram_maintenance','setup_session_delegations','UPDATE') AS direct_update_denied`)).rows[0];
    const hardened=Object.values(boundary).every(Boolean);
    console.log(`W1_1_LIFECYCLE positive completed=${completed} abandoned=${abandoned} states=${stored.map(row=>row.terminal_state).sort().join(',')} stamped=${stored.every(row=>row.stamped)} live_after=${completedLive} inspect_active=${abandonedInspection?.active} boundary=${hardened}`);
    assert.deepEqual({completed,abandoned,states:stored.map(row=>row.terminal_state).sort(),stamped:stored.every(row=>row.stamped),completedLive,inspectActive:abandonedInspection?.active,hardened},{completed:"accepted",abandoned:"accepted",states:["abandoned","completed"],stamped:true,completedLive:0,inspectActive:false,hardened:true});
  }else if(name==="read-expiry"){
    await plant(admin,ids.live,principal,"1 hour");await plant(admin,ids.expired,principal,"-1 hour");
    const liveRows=(await live(maintenance,ids.live)).length,expiredRows=(await live(maintenance,ids.expired)).length;
    console.log(`W1_1_LIFECYCLE read_expiry live=${liveRows} expired=${expiredRows}`);
    assert.deepEqual({liveRows,expiredRows},{liveRows:1,expiredRows:0});
  }else if(name==="sweep"){
    await plant(admin,ids.live,principal,"1 hour");await plant(admin,ids.expired,principal,"-1 hour");
    const swept=Number((await maintenance.query("SELECT sweep_expired_setup_session_delegations() AS count")).rows[0].count);
    const rows=(await admin.query("SELECT session_id,coalesce(terminal_state,'none') AS state,terminal_at IS NOT NULL AS stamped FROM setup_session_delegations WHERE session_id=ANY($1::uuid[]) ORDER BY session_id",[[ids.live,ids.expired]])).rows;
    const expired=rows.find(row=>row.session_id===ids.expired),liveRow=rows.find(row=>row.session_id===ids.live);
    console.log(`W1_1_LIFECYCLE sweep swept=${swept} expired_state=${expired?.state} expired_stamped=${expired?.stamped} live_state=${liveRow?.state}`);
    assert.deepEqual({swept,expiredState:expired?.state,expiredStamped:expired?.stamped,liveState:liveRow?.state},{swept:1,expiredState:"expired",expiredStamped:true,liveState:"none"});
  }else if(name==="repeat-safety"){
    await plant(admin,ids.repeatExpired,principal,"-1 hour");await plant(admin,ids.repeatLive,principal,"1 hour");
    const sweep=async()=>Number((await maintenance.query("SELECT sweep_expired_setup_session_delegations() AS count")).rows[0].count);
    const first=await sweep(),firstStamp=(await admin.query("SELECT terminal_at FROM setup_session_delegations WHERE session_id=$1",[ids.repeatExpired])).rows[0]?.terminal_at?.getTime();
    const second=await sweep(),secondStamp=(await admin.query("SELECT terminal_at FROM setup_session_delegations WHERE session_id=$1",[ids.repeatExpired])).rows[0]?.terminal_at?.getTime();
    const third=await sweep(),thirdStamp=(await admin.query("SELECT terminal_at FROM setup_session_delegations WHERE session_id=$1",[ids.repeatExpired])).rows[0]?.terminal_at?.getTime();
    const terminalStable=Number.isFinite(firstStamp)&&firstStamp===secondStamp&&secondStamp===thirdStamp,liveState=(await inspect(maintenance,ids.repeatLive))?.effective_state;
    console.log(`W1_1_LIFECYCLE repeat first=${first} second=${second} third=${third} terminal_stable=${terminalStable} live=${liveState}`);
    assert.deepEqual({first,second,third,terminalStable,liveState},{first:1,second:0,third:0,terminalStable:true,liveState:"active"});
  }else if(name==="introspection"){
    await plant(admin,ids.live,principal,"1 hour");await plant(admin,ids.expired,principal,"-1 hour");
    const liveRow=await inspect(maintenance,ids.live),expired=await inspect(maintenance,ids.expired);
    console.log(`W1_1_LIFECYCLE introspection live_active=${liveRow?.active} live_state=${liveRow?.effective_state} expired_active=${expired?.active} expired_state=${expired?.effective_state}`);
    assert.deepEqual({liveActive:liveRow?.active,liveState:liveRow?.effective_state,expiredActive:expired?.active,expiredState:expired?.effective_state},{liveActive:true,liveState:"active",expiredActive:false,expiredState:"expired"});
  }else if(name==="clock"){
    await plant(admin,ids.live,principal,"1 hour");
    const before=(await admin.query("SELECT clock_timestamp() AS value")).rows[0].value.getTime();
    const observed=(await inspect(maintenance,ids.live)).evaluated_at.getTime();
    const after=(await admin.query("SELECT clock_timestamp() AS value")).rows[0].value.getTime();
    const databaseClock=observed>=before&&observed<=after;
    console.log(`W1_1_LIFECYCLE clock_db=${databaseClock}`);assert.equal(databaseClock,true);
  }else if(name==="read-terminal"){
    await plant(admin,ids.live,principal,"1 hour");await plant(admin,ids.terminal,principal,"1 hour","abandoned");
    const liveRows=(await live(maintenance,ids.live)).length,terminalRows=(await live(maintenance,ids.terminal)).length;
    console.log(`W1_1_LIFECYCLE read_terminal live=${liveRows} terminal=${terminalRows}`);
    assert.deepEqual({liveRows,terminalRows},{liveRows:1,terminalRows:0});
  }else if(name==="already-terminal"){
    await create(maintenance,ids.terminal);assert.equal(await transition(maintenance,"completed",ids.terminal),"accepted");
    const second=await transition(maintenance,"abandoned",ids.terminal);
    const state=(await admin.query("SELECT terminal_state FROM setup_session_delegations WHERE session_id=$1",[ids.terminal])).rows[0]?.terminal_state;
    console.log(`W1_1_LIFECYCLE already_terminal second=${second} state=${state}`);
    assert.deepEqual({second,state},{second:"SETUP_SESSION_ALREADY_TERMINAL",state:"completed"});
  }else if(name==="ownership"){
    await plant(admin,ids.foreign,foreignPrincipal,"1 hour");
    const result=await transition(maintenance,"completed",ids.foreign);
    const state=(await admin.query("SELECT coalesce(terminal_state,'none') AS state FROM setup_session_delegations WHERE session_id=$1",[ids.foreign])).rows[0]?.state;
    console.log(`W1_1_LIFECYCLE ownership result=${result} state=${state}`);
    assert.deepEqual({result,state},{result:"SETUP_SESSION_NOT_OWNED",state:"none"});
  }else if(name==="atomic"){
    await create(maintenance,ids.atomic);
    const result=await transition(maintenance,"completed",ids.atomic);
    const row=(await admin.query("SELECT terminal_state,terminal_at IS NOT NULL AS stamped FROM setup_session_delegations WHERE session_id=$1",[ids.atomic])).rows[0];
    const atomic=result==="accepted"&&row?.terminal_state==="completed"&&row?.stamped===true;
    console.log(`W1_1_LIFECYCLE atomic=${atomic} result=${result} state=${row?.terminal_state} stamped=${row?.stamped}`);
    assert.equal(atomic,true);
  }else throw new Error(`unknown W1_1_LIFECYCLE_CASE ${name}`);
}

test(`W1-1 setup-session lifecycle: ${selected}`,async()=>{
  const admin=new Pool({connectionString:adminUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  const maintenance=new Pool({connectionString:maintenanceUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  try{
    const cases=selected==="all"?["positive","read-expiry","sweep","repeat-safety","introspection","clock","read-terminal","already-terminal","ownership","atomic"]:[selected];
    for(const name of cases)await runCase(name,{admin,maintenance});
  }finally{await reset(admin).catch(()=>{});await maintenance.end();await admin.end();}
});
