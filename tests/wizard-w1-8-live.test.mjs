import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";

const moduleUrl=process.env.W1_8_BOUNDARY_MODULE?pathToFileURL(process.env.W1_8_BOUNDARY_MODULE).href:new URL("../packages/git-adapter/src/credential-boundary.mjs",import.meta.url).href;
const {PostgresInvocationStore,resolveInvocation}=await import(moduleUrl);
const maintenanceUrl=process.env.W1_8_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport";
const adminUrl=process.env.W1_8_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport";
const selected=process.env.W1_8_CASE??"positive";
const tenant="10000000-0000-0000-0000-000000000001";
const project="12000000-0000-0000-0000-000000000001";
const principal="11000000-0000-0000-0000-000000000001";
const actor="13000000-0000-0000-0000-000000000008";
const event="14000000-0000-0000-0000-000000000001";
const grantId="16000000-0000-7000-8000-000000000001";
const missingGrantId="16000000-0000-7000-8000-000000000099";
const scopeGrantId="16000000-0000-7000-8000-000000000011";
const expiryGrantId="16000000-0000-7000-8000-000000000012";
const custodyId="17000000-0000-7000-8000-000000000001";
const custodyRef="epr:credential:01a03440-fbd8-70f1-8611-66d0a5d996ab";
const assertedGrantor="22000000-0000-0000-0000-000000000002";

const request=(overrides={})=>({principal_id:principal,actor_id:actor,tenant_id:tenant,project_id:project,provider:"synthetic",capability:"repo.read",scopes:["repo:read"],...overrides});

async function reset(admin){
  await admin.query("DELETE FROM invocation_grants");
  await admin.query("DELETE FROM invocation_grant_contexts");
  await admin.query("TRUNCATE custody_audit,minted_references,custody_rows");
  await admin.query("UPDATE founder_authorities SET scopes=array_remove(scopes,'repo:read') WHERE principal_id=$1",[principal]);
}
async function seed(admin){
  await reset(admin);
  await admin.query("UPDATE founder_authorities SET scopes=array_append(scopes,'repo:read'),expires_at=clock_timestamp()+interval '2 hours',revoked_at=NULL WHERE principal_id=$1 AND NOT ('repo:read'=ANY(scopes))",[principal]);
  await admin.query(`INSERT INTO custody_rows(id,tenant_id,project_id,namespace,credential_class,custody_model,inventory_model,required_scope,key_locator,metadata,minted_by_principal_id,minted_by_actor_id,retention_policy)
    VALUES($1,$2,$3,'credential','3.3','B','B','custody:mint:credential:3.3:B','w1-8-live','{}',$4,$5,'RET-AUDIT-400')`,[custodyId,tenant,project,principal,actor]);
  await admin.query("INSERT INTO minted_references(reference,custody_row_id,tenant_id,project_id,namespace) VALUES($1,$2,$3,$4,'credential')",[custodyRef,custodyId,tenant,project]);
  await admin.query("INSERT INTO invocation_grant_contexts(grant_id,tenant_id,project_id) VALUES($1,$2,$3)",[grantId,tenant,project]);
  await admin.query(`INSERT INTO invocation_grants(grant_id,tenant_id,project_id,provider,capability,granted_to_principal_id,granted_to_actor_id,granted_by_principal_id,granting_event_id,scopes,credential_ref,expires_at)
    VALUES($1,$2,$3,'synthetic','repo.read',$4,$5,$4,$6,ARRAY['repo:read'],$7,clock_timestamp()+interval '1 hour')`,[grantId,tenant,project,principal,actor,event,custodyRef]);
}
async function seedCreation(admin){
  await reset(admin);
  await admin.query("UPDATE founder_authorities SET scopes=array_append(array_remove(scopes,'repo:read'),'repo:read'),expires_at=clock_timestamp()+interval '2 hours',revoked_at=NULL WHERE principal_id=$1",[principal]);
  await admin.query(`INSERT INTO custody_rows(id,tenant_id,project_id,namespace,credential_class,custody_model,inventory_model,required_scope,key_locator,metadata,minted_by_principal_id,minted_by_actor_id,retention_policy)
    VALUES($1,$2,$3,'credential','3.3','B','B','custody:mint:credential:3.3:B','w1-8-create','{}',$4,$5,'RET-AUDIT-400')`,[custodyId,tenant,project,principal,actor]);
  await admin.query("INSERT INTO minted_references(reference,custody_row_id,tenant_id,project_id,namespace) VALUES($1,$2,$3,$4,'credential')",[custodyRef,custodyId,tenant,project]);
}
async function createGrant(pool,{id=grantId,scopes=["repo:read"],expiry="1 hour"}={}){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.principal_id',$1,true)",[principal]);
    const expires=(await client.query(`SELECT clock_timestamp()+$1::interval AS value`,[expiry])).rows[0].value;
    const result=await client.query(`SELECT create_invocation_grant($1,'synthetic','repo.read',$2,$3,$4,$5,NULL,$6,$7,$8) AS grant_id`,[id,principal,actor,event,scopes,custodyRef,expires,assertedGrantor]);
    await client.query("COMMIT");
    return result.rows[0].grant_id;
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}
async function creationOutcome(pool,options){
  try{await createGrant(pool,options);return "accepted";}catch(error){return error.message;}
}
async function descriptor(store,id=grantId){return store.transaction(tx=>tx.getGrant(id));}
const outcome=result=>result?.ok?"accepted":result?.code;

test(`W1-8 live invocation store: ${selected}`,async()=>{
  const admin=new Pool({connectionString:adminUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  const maintenance=new Pool({connectionString:maintenanceUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  const store=new PostgresInvocationStore({connectionString:maintenanceUrl});
  try{
    if(selected.startsWith("creation")){
      await seedCreation(admin);
      if(selected==="creation"||selected==="creation-positive"){
        const created=await creationOutcome(maintenance);
        const stored=(await admin.query("SELECT granted_by_principal_id FROM invocation_grants WHERE grant_id=$1",[grantId])).rows[0];
        const issued=await descriptor(store);
        const resolved=outcome(await resolveInvocation(issued,request(),{store}));
        const rls=await maintenance.connect();
        let wrong,right;
        try{
          await rls.query("BEGIN");
          await rls.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.project_id',$2,true)",["20000000-0000-0000-0000-000000000002","23000000-0000-0000-0000-000000000002"]);
          wrong=Number((await rls.query("SELECT count(*) AS count FROM invocation_grants WHERE grant_id=$1",[grantId])).rows[0].count);
          await rls.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.project_id',$2,true)",[tenant,project]);
          right=Number((await rls.query("SELECT count(*) AS count FROM invocation_grants WHERE grant_id=$1",[grantId])).rows[0].count);
          await rls.query("ROLLBACK");
        }finally{rls.release();}
        const derived=stored?.granted_by_principal_id===principal;
        const boundary=(await admin.query(`SELECT
          p.prosecdef AS security_definer,
          p.proconfig=ARRAY['search_path=public']::text[] AS pinned_search_path,
          has_function_privilege('engram_maintenance',p.oid,'EXECUTE') AS maintenance_execute,
          NOT has_function_privilege('engram_app',p.oid,'EXECUTE') AS app_denied,
          NOT has_table_privilege('engram_maintenance','invocation_grants','INSERT') AS direct_insert_denied,
          NOT EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_denied
          FROM pg_proc p WHERE p.oid='create_invocation_grant(uuid,text,text,uuid,uuid,uuid,text[],text,text,timestamptz,uuid)'::regprocedure`)).rows[0];
        const hardened=Object.values(boundary).every(Boolean);
        console.log(`W1_8_CREATE positive=${created} derived=${derived} resolved=${resolved} rls_wrong=${wrong} rls_right=${right} boundary=${hardened}`);
        assert.deepEqual({created,derived,resolved,wrong,right,hardened},{created:"accepted",derived:true,resolved:"accepted",wrong:0,right:1,hardened:true});
      }
      if(selected==="creation"||selected==="creation-scope"){
        const scope=await creationOutcome(maintenance,{id:scopeGrantId,scopes:["repo:read","repo:write"]});
        const landed=Number((await admin.query("SELECT count(*) AS count FROM invocation_grant_contexts WHERE grant_id=$1",[scopeGrantId])).rows[0].count);
        console.log(`W1_8_CREATE scope=${scope} landed=${landed}`);
        assert.deepEqual({scope,landed},{scope:"GRANT_SCOPE_EXCEEDS_AUTHORITY",landed:0});
      }
      if(selected==="creation"||selected==="creation-expiry"){
        const expiry=await creationOutcome(maintenance,{id:expiryGrantId,expiry:"3 hours"});
        const landed=Number((await admin.query("SELECT count(*) AS count FROM invocation_grant_contexts WHERE grant_id=$1",[expiryGrantId])).rows[0].count);
        console.log(`W1_8_CREATE expiry=${expiry} landed=${landed}`);
        assert.deepEqual({expiry,landed},{expiry:"GRANT_EXPIRY_EXCEEDS_AUTHORITY",landed:0});
      }
      return;
    }
    await seed(admin);
    if(selected==="clock"){
      const before=(await admin.query("SELECT clock_timestamp() AS now")).rows[0].now.getTime();
      const observed=await store.transaction(tx=>tx.serverNow());
      const after=(await admin.query("SELECT clock_timestamp() AS now")).rows[0].now.getTime();
      const bounded=observed>=before&&observed<=after;
      console.log(`W1_8_LIVE_PROPERTY clock_db=${bounded}`);
      assert.equal(bounded,true);
      return;
    }
    const issued=await descriptor(store);
    let result,expected;
    if(selected==="positive"){
      result=await resolveInvocation(issued,request(),{store});expected="accepted";
      const boundary=(await admin.query("SELECT (SELECT relforcerowsecurity FROM pg_class WHERE oid='invocation_grants'::regclass) forced_rls,NOT has_table_privilege('engram_app','invocation_grants','SELECT') app_denied,NOT has_table_privilege('engram_maintenance','invocation_grant_contexts','SELECT') context_denied,has_function_privilege('engram_maintenance','bind_invocation_grant_context(uuid)','EXECUTE') AND NOT has_function_privilege('engram_app','bind_invocation_grant_context(uuid)','EXECUTE') helper_acl")).rows[0];
      console.log(`W1_8_LIVE positive=${outcome(result)} custody=real grant=real transaction=one boundary=${Object.values(boundary).every(Boolean)}`);
      assert.deepEqual(boundary,{forced_rls:true,app_denied:true,context_denied:true,helper_acl:true});
    }else if(selected==="existence"){
      result=await resolveInvocation({...issued,grant_id:missingGrantId,credential_ref:null},request(),{store});expected="GRANT_NOT_FOUND";
    }else if(selected==="tenant"){
      result=await resolveInvocation(issued,request({tenant_id:"20000000-0000-0000-0000-000000000002"}),{store});expected="TENANT_MISMATCH";
    }else if(selected==="project"){
      result=await resolveInvocation(issued,request({project_id:"23000000-0000-0000-0000-000000000002"}),{store});expected="PROJECT_MISMATCH";
    }else if(selected==="principal"){
      result=await resolveInvocation(issued,request({principal_id:"22000000-0000-0000-0000-000000000002"}),{store});expected="PRINCIPAL_MISMATCH";
    }else if(selected==="actor"){
      result=await resolveInvocation(issued,request({actor_id:"13000000-0000-0000-0000-000000000099"}),{store});expected="ACTOR_MISMATCH";
    }else if(selected==="scope"){
      result=await resolveInvocation(issued,request({scopes:["repo:read","repo:write"]}),{store});expected="SCOPE_EXCEEDED";
    }else if(selected==="expiry"){
      await admin.query("UPDATE invocation_grants SET expires_at=clock_timestamp()-interval '1 second' WHERE grant_id=$1",[grantId]);
      const expired=await descriptor(store);result=await resolveInvocation(expired,request(),{store});expected="GRANT_EXPIRED";
    }else if(selected==="revocation"){
      await admin.query("UPDATE invocation_grants SET revoked_at=clock_timestamp() WHERE grant_id=$1",[grantId]);
      result=await resolveInvocation(issued,request(),{store});expected="GRANT_REVOKED";
    }else throw new Error(`unknown W1_8_CASE ${selected}`);
    console.log(`W1_8_LIVE_PROPERTY ${selected}=${outcome(result)}`);
    assert.equal(outcome(result),expected);
  }finally{await reset(admin).catch(()=>{});await store.close();await maintenance.end();await admin.end();}
});
