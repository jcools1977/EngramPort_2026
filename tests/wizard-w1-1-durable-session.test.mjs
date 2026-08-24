import test from "node:test";
import assert from "node:assert/strict";
import {Pool} from "pg";

const maintenanceUrl=process.env.W1_1_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport";
const adminUrl=process.env.W1_1_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const selected=process.env.W1_1_CASE??"all";
const principal="11000000-0000-0000-0000-000000000001";
const assertedFounder="22000000-0000-0000-0000-000000000002";
const ids={positive:"18000000-0000-7000-8000-000000000001",nonsetup:"18000000-0000-7000-8000-000000000002",scope:"18000000-0000-7000-8000-000000000003",authorityExpiry:"18000000-0000-7000-8000-000000000004",retention:"18000000-0000-7000-8000-000000000005",expired:"18000000-0000-7000-8000-000000000006",terminal:"18000000-0000-7000-8000-000000000007"};

async function reset(admin){
  await admin.query("DELETE FROM setup_session_delegations");
  await admin.query("UPDATE founder_authorities SET scopes=array_remove(array_remove(array_remove(array_remove(scopes,'setup:plan'),'setup:execute'),'setup:admin'),'events:write') WHERE principal_id=$1",[principal]);
}
async function seedAuthority(admin,expiry="48 hours"){
  await reset(admin);
  await admin.query("UPDATE founder_authorities SET scopes=array_append(array_append(scopes,'setup:plan'),'setup:execute'),expires_at=clock_timestamp()+$2::interval,revoked_at=NULL WHERE principal_id=$1",[principal,expiry]);
}
async function create(pool,{id=ids.positive,scopes=["setup:plan"],expiry="1 hour"}={}){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.principal_id',$1,true)",[principal]);
    const expires=(await client.query("SELECT clock_timestamp()+$1::interval AS value",[expiry])).rows[0].value;
    const result=await client.query("SELECT create_setup_session_delegation($1,$2,$3,$4) AS id",[id,scopes,expires,assertedFounder]);
    await client.query("COMMIT");
    return result.rows[0].id;
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}
async function outcome(pool,options){try{await create(pool,options);return "accepted";}catch(error){return error.message;}}
async function live(pool,id){
  const client=await pool.connect();
  try{
    await client.query("BEGIN READ ONLY");
    await client.query("SELECT set_config('app.principal_id',$1,true)",[principal]);
    const rows=(await client.query("SELECT * FROM read_live_setup_session_delegation($1)",[id])).rows;
    await client.query("COMMIT");
    return rows;
  }finally{client.release();}
}
async function refusal(admin,maintenance,{name,id,scopes,expiry,authorityExpiry="48 hours",expected}){
  await seedAuthority(admin,authorityExpiry);
  if(name==="nonsetup")await admin.query("UPDATE founder_authorities SET scopes=array_append(scopes,'events:write') WHERE principal_id=$1",[principal]);
  const result=await outcome(maintenance,{id,scopes,expiry});
  const landed=Number((await admin.query("SELECT count(*) AS count FROM setup_session_delegations WHERE session_id=$1",[id])).rows[0].count);
  console.log(`W1_1_CREATE ${name}=${result} landed=${landed}`);
  assert.deepEqual({result,landed},{result:expected,landed:0});
}

test(`W1-1 durable setup session: ${selected}`,async()=>{
  const admin=new Pool({connectionString:adminUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  const maintenance=new Pool({connectionString:maintenanceUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  try{
    if(selected==="all"||selected==="positive"){
      await seedAuthority(admin);
      const created=await outcome(maintenance,{id:ids.positive});
      const stored=(await admin.query("SELECT founder_principal_id,terminal_state,terminal_at FROM setup_session_delegations WHERE session_id=$1",[ids.positive])).rows[0];
      const read=await live(maintenance,ids.positive);
      const boundary=(await admin.query(`SELECT
        (SELECT relforcerowsecurity FROM pg_class WHERE oid='setup_session_delegations'::regclass) AS forced_rls,
        (SELECT p.prosecdef AND p.proconfig=ARRAY['search_path=public']::text[] FROM pg_proc p WHERE p.oid='create_setup_session_delegation(uuid,text[],timestamptz,uuid)'::regprocedure) AS create_hardened,
        (SELECT p.prosecdef AND p.proconfig=ARRAY['search_path=public']::text[] FROM pg_proc p WHERE p.oid='read_live_setup_session_delegation(uuid)'::regprocedure) AS read_hardened,
        has_function_privilege('engram_maintenance','create_setup_session_delegation(uuid,text[],timestamptz,uuid)','EXECUTE') AS maintenance_create,
        has_function_privilege('engram_maintenance','read_live_setup_session_delegation(uuid)','EXECUTE') AS maintenance_read,
        NOT has_function_privilege('engram_app','create_setup_session_delegation(uuid,text[],timestamptz,uuid)','EXECUTE') AS app_create_denied,
        NOT has_function_privilege('engram_app','read_live_setup_session_delegation(uuid)','EXECUTE') AS app_read_denied,
        NOT has_table_privilege('engram_maintenance','setup_session_delegations','SELECT')
          AND NOT has_table_privilege('engram_maintenance','setup_session_delegations','INSERT')
          AND NOT has_table_privilege('engram_maintenance','setup_session_delegations','UPDATE')
          AND NOT has_table_privilege('engram_maintenance','setup_session_delegations','DELETE') AS maintenance_table_denied,
        NOT has_table_privilege('engram_app','setup_session_delegations','SELECT')
          AND NOT has_table_privilege('engram_app','setup_session_delegations','INSERT')
          AND NOT has_table_privilege('engram_app','setup_session_delegations','UPDATE')
          AND NOT has_table_privilege('engram_app','setup_session_delegations','DELETE') AS app_table_denied,
        NOT EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_denied
        FROM pg_proc p WHERE p.oid='create_setup_session_delegation(uuid,text[],timestamptz,uuid)'::regprocedure`)).rows[0];
      const hardened=Object.values(boundary).every(Boolean);
      const actorColumns=Number((await admin.query("SELECT count(*) AS count FROM information_schema.columns WHERE table_schema='public' AND table_name='setup_session_delegations' AND column_name LIKE '%actor%'")).rows[0].count);
      console.log(`W1_1_CREATE positive=${created} derived=${stored?.founder_principal_id===principal} live=${read.length} no_actor=${actorColumns===0} boundary=${hardened}`);
      assert.deepEqual({created,derived:stored?.founder_principal_id===principal,live:read.length,terminal:stored?.terminal_state??null,actorColumns,hardened},{created:"accepted",derived:true,live:1,terminal:null,actorColumns:0,hardened:true});

      await admin.query("INSERT INTO setup_session_delegations(session_id,founder_principal_id,scopes,expires_at) VALUES($1,$2,ARRAY['setup:plan'],clock_timestamp()-interval '1 second'),($3,$2,ARRAY['setup:plan'],clock_timestamp()+interval '1 hour')",[ids.expired,principal,ids.terminal]);
      await admin.query("UPDATE setup_session_delegations SET terminal_state='revoked',terminal_at=clock_timestamp() WHERE session_id=$1",[ids.terminal]);
      const expired=await live(maintenance,ids.expired),terminal=await live(maintenance,ids.terminal);
      await admin.query("UPDATE founder_authorities SET revoked_at=clock_timestamp() WHERE principal_id=$1",[principal]);
      const revokedAuthority=await live(maintenance,ids.positive);
      console.log(`W1_1_READ expired=${expired.length} terminal=${terminal.length} authority_revoked=${revokedAuthority.length} db_clock=true`);
      assert.deepEqual({expired:expired.length,terminal:terminal.length,revokedAuthority:revokedAuthority.length},{expired:0,terminal:0,revokedAuthority:0});
    }
    if(selected==="all"||selected==="nonsetup")await refusal(admin,maintenance,{name:"nonsetup",id:ids.nonsetup,scopes:["events:write"],expiry:"1 hour",expected:"SETUP_SESSION_SCOPE_NOT_SETUP"});
    if(selected==="all"||selected==="scope")await refusal(admin,maintenance,{name:"scope",id:ids.scope,scopes:["setup:admin"],expiry:"1 hour",expected:"SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY"});
    if(selected==="all"||selected==="authority-expiry")await refusal(admin,maintenance,{name:"authority_expiry",id:ids.authorityExpiry,scopes:["setup:plan"],expiry:"2 hours",authorityExpiry:"1 hour",expected:"SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY"});
    if(selected==="all"||selected==="retention")await refusal(admin,maintenance,{name:"retention",id:ids.retention,scopes:["setup:plan"],expiry:"25 hours",authorityExpiry:"48 hours",expected:"SETUP_SESSION_RETENTION_EXCEEDED"});
  }finally{await reset(admin).catch(()=>{});await maintenance.end();await admin.end();}
});
