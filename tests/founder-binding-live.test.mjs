import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

const {Pool}=pg;
const selected=process.env.W1_1_BINDING_CASE??"all";
const maintenance=new Pool({connectionString:process.env.W1_1_BINDING_DATABASE_URL??"postgres://engram_maintenance@127.0.0.1:5432/engramport",max:4,connectionTimeoutMillis:1000,statement_timeout:5000});
const admin=new Pool({connectionString:process.env.W1_1_BINDING_POSTGRES_DATABASE_URL??"postgres://postgres@127.0.0.1:5432/engramport",max:3,connectionTimeoutMillis:1000,statement_timeout:5000});

const ids={
  identity:"51000000-0000-0000-0000-000000000001",otherIdentity:"51000000-0000-0000-0000-000000000002",
  bindingA:"52000000-0000-0000-0000-000000000001",bindingB:"52000000-0000-0000-0000-000000000002",otherBinding:"52000000-0000-0000-0000-000000000003",
  conflictAuth:"53000000-0000-0000-0000-000000000001",positiveAuth:"53000000-0000-0000-0000-000000000002",oneShotAuth:"53000000-0000-0000-0000-000000000003",
  principalA:"54000000-0000-0000-0000-000000000001",principalB:"54000000-0000-0000-0000-000000000002",otherPrincipal:"54000000-0000-0000-0000-000000000003",
  futurePrincipal:"54000000-0000-0000-0000-000000000004",oneShotPrincipal:"54000000-0000-0000-0000-000000000005",
  futureTenant:"55000000-0000-0000-0000-000000000004",oneShotTenant:"55000000-0000-0000-0000-000000000005"
};
const tenantA="10000000-0000-0000-0000-000000000001",tenantB="20000000-0000-0000-0000-000000000002";
const issuer="https://founder.synthetic.invalid",subject="shared-founder",otherIssuer="https://other-founder.synthetic.invalid",otherSubject="other-founder";
const assertedPrincipal="ffffffff-ffff-4fff-8fff-fffffffffff1",assertedTenant="ffffffff-ffff-4fff-8fff-fffffffffff2";

async function cleanup(){
  await admin.query("DELETE FROM founding_authorizations WHERE authorization_id=ANY($1::uuid[])",[[ids.conflictAuth,ids.positiveAuth,ids.oneShotAuth]]);
  await admin.query("DELETE FROM founder_tenant_bindings WHERE binding_id=ANY($1::uuid[])",[[ids.bindingA,ids.bindingB,ids.otherBinding]]);
  await admin.query("DELETE FROM founder_external_identities WHERE identity_id=ANY($1::uuid[])",[[ids.identity,ids.otherIdentity]]);
  await admin.query("DELETE FROM principals WHERE id=ANY($1::uuid[])",[[ids.principalA,ids.principalB,ids.otherPrincipal]]);
}

async function seed(){
  await cleanup();
  await admin.query(`INSERT INTO principals(id,tenant_id,kind,external_issuer,external_subject,display_name) VALUES
    ($1,$4,'human',$6,$7,'Shared Founder A'),($2,$5,'human',$6,$7,'Shared Founder B'),($3,$4,'human',$8,$9,'Other Founder')`,
    [ids.principalA,ids.principalB,ids.otherPrincipal,tenantA,tenantB,issuer,subject,otherIssuer,otherSubject]);
  await admin.query(`INSERT INTO founder_external_identities(identity_id,issuer,subject) VALUES
    ($1,$3,$4),($2,$5,$6)`,[ids.identity,ids.otherIdentity,issuer,subject,otherIssuer,otherSubject]);
  await admin.query(`INSERT INTO founder_tenant_bindings(binding_id,identity_id,tenant_id,principal_id) VALUES
    ($1,$4,$6,$8),($2,$4,$7,$9),($3,$5,$6,$10)`,
    [ids.bindingA,ids.bindingB,ids.otherBinding,ids.identity,ids.otherIdentity,tenantA,tenantB,ids.principalA,ids.principalB,ids.otherPrincipal]);
  await admin.query(`INSERT INTO founding_authorizations(authorization_id,identity_id,reserved_principal_id,reserved_tenant_id,expires_at) VALUES
    ($1,$4,$5,$8,clock_timestamp()+interval '1 hour'),
    ($2,$4,$6,$9,clock_timestamp()+interval '1 hour'),
    ($3,$4,$7,$10,clock_timestamp()+interval '1 hour')`,
    [ids.conflictAuth,ids.positiveAuth,ids.oneShotAuth,ids.identity,ids.otherPrincipal,ids.futurePrincipal,ids.oneShotPrincipal,tenantA,ids.futureTenant,ids.oneShotTenant]);
}

async function resolve({claimIssuer=issuer,claimSubject=subject,binding=null,authorization=null}={}){
  try{
    const result=await maintenance.query("SELECT * FROM resolve_founder_principal($1,$2,$3,$4,$5,$6)",[claimIssuer,claimSubject,binding,authorization,assertedPrincipal,assertedTenant]);
    return {outcome:result.rows[0]?.principal_id??"empty",row:result.rows[0]??null};
  }catch(error){return {outcome:error.message,code:error.code};}
}

async function product(){
  const a=await resolve({binding:ids.bindingA}),b=await resolve({binding:ids.bindingB});
  const sameRows=Number((await admin.query("SELECT count(*) FROM principals WHERE external_issuer=$1 AND external_subject=$2 AND id=ANY($3::uuid[])",[issuer,subject,[ids.principalA,ids.principalB]])).rows[0].count);
  const forced=Number((await admin.query("SELECT count(*) FROM pg_class WHERE oid=ANY(ARRAY['founder_external_identities'::regclass,'founder_tenant_bindings'::regclass,'founding_authorizations'::regclass]) AND relrowsecurity AND relforcerowsecurity")).rows[0].count);
  let directRead,duplicate;
  try{await maintenance.query("SELECT identity_id FROM founder_external_identities");directRead="accepted";}catch(error){directRead=error.code;}
  try{await admin.query("INSERT INTO founder_external_identities(identity_id,issuer,subject) VALUES('51000000-0000-0000-0000-000000000099',$1,$2)",[issuer,subject]);duplicate="accepted";}catch(error){duplicate=error.code;}
  const surface=Object.keys(a.row??{}).sort().join(",");
  console.log(`W1_1_BINDING_PRODUCT a=${a.outcome} b=${b.outcome} same_identity_rows=${sameRows} surface=${surface} assertions_ignored=${a.outcome!==assertedPrincipal&&b.outcome!==assertedPrincipal} forced_rls=${forced} direct_read=${directRead} unique=${duplicate}`);
  assert.deepEqual({a:a.outcome,b:b.outcome,sameRows,surface,forced,directRead,duplicate},{a:ids.principalA,b:ids.principalB,sameRows:2,surface:"principal_id",forced:3,directRead:"42501",duplicate:"23505"});
}

async function absent(){
  const positive=await resolve({binding:ids.bindingA}),negative=await resolve({binding:ids.otherBinding});
  console.log(`W1_1_BINDING absent positive=${positive.outcome} negative=${negative.outcome}`);
  assert.deepEqual({positive:positive.outcome,negative:negative.outcome},{positive:ids.principalA,negative:"FOUNDER_BINDING_ABSENT"});
}

async function ambiguous(){
  const positive=await resolve({binding:ids.bindingA}),negative=await resolve();
  console.log(`W1_1_BINDING ambiguous positive=${positive.outcome} negative=${negative.outcome}`);
  assert.deepEqual({positive:positive.outcome,negative:negative.outcome},{positive:ids.principalA,negative:"FOUNDER_BINDING_AMBIGUOUS"});
}

async function disabled(){
  const positive=await resolve({binding:ids.bindingA});
  await admin.query("UPDATE founder_external_identities SET disabled_at=clock_timestamp() WHERE identity_id=$1",[ids.identity]);
  const negative=await resolve({binding:ids.bindingA});
  await admin.query("UPDATE founder_external_identities SET disabled_at=NULL WHERE identity_id=$1",[ids.identity]);
  console.log(`W1_1_BINDING disabled positive=${positive.outcome} negative=${negative.outcome}`);
  assert.deepEqual({positive:positive.outcome,negative:negative.outcome},{positive:ids.principalA,negative:"FOUNDER_BINDING_DISABLED"});
}

async function conflict(){
  const positive=await resolve({authorization:ids.positiveAuth}),negative=await resolve({authorization:ids.conflictAuth});
  const state=(await admin.query("SELECT authorization_id,consumed_at IS NOT NULL AS consumed FROM founding_authorizations WHERE authorization_id=ANY($1::uuid[]) ORDER BY authorization_id",[[ids.conflictAuth,ids.positiveAuth]])).rows;
  const conflictConsumed=state.find(row=>row.authorization_id===ids.conflictAuth)?.consumed??null;
  console.log(`W1_1_BINDING conflict positive=${positive.outcome} negative=${negative.outcome} conflict_consumed=${conflictConsumed?1:0}`);
  assert.deepEqual({positive:positive.outcome,negative:negative.outcome,conflictConsumed},{positive:ids.futurePrincipal,negative:"FOUNDER_BINDING_CONFLICT",conflictConsumed:false});
}

async function oneShot(){
  const outcomes=(await Promise.all([resolve({authorization:ids.oneShotAuth}),resolve({authorization:ids.oneShotAuth})])).map(value=>value.outcome).sort();
  const consumed=Number((await admin.query("SELECT count(*) FROM founding_authorizations WHERE authorization_id=$1 AND consumed_at IS NOT NULL",[ids.oneShotAuth])).rows[0].count);
  console.log(`W1_1_BINDING_ONE_SHOT outcomes=${outcomes.join(",")} consumed=${consumed}`);
  assert.deepEqual({outcomes,consumed},{outcomes:[ids.oneShotPrincipal,"FOUNDER_BINDING_ABSENT"].sort(),consumed:1});
}

const cases={product,absent,ambiguous,disabled,conflict,"one-shot":oneShot};
test(`W1-1 founder binding: ${selected}`,async()=>{
  await seed();
  try{
    if(selected==="all")for(const name of ["product","absent","ambiguous","disabled","conflict","one-shot"])await cases[name]();
    else if(cases[selected])await cases[selected]();
    else throw new Error(`unknown W1_1_BINDING_CASE ${selected}`);
  }finally{await cleanup();await Promise.all([maintenance.end(),admin.end()]);}
});
