import assert from "node:assert/strict";
import test from "node:test";

const bindingModule=process.env.D2_TRANSACTION_BINDING_MODULE
  ? await import(process.env.D2_TRANSACTION_BINDING_MODULE)
  : await import("../packages/git-adapter/src/d2-session-binding.mjs");
const {PrincipalSessionBinding}=bindingModule;
const selected=process.env.D2_TRANSACTION_CASE??"all";
const verified={verified:true,principalId:"principal",sessionId:"session"};

function fakePool(role){
  const calls=[];
  let released=0;
  const client={
    async query(sql,parameters){calls.push([sql,parameters]);if(sql==="SELECT session_user")return {rows:[{session_user:role}]};return {rows:[]};},
    release(){released++;},
  };
  return {pool:{connect:async()=>client,end:async()=>{}},calls,released:()=>released};
}
const outcome=async operation=>{try{return await operation();}catch(error){return error.code??error.message;}};

async function runCase(name){
  if(name==="unbound"){
    const fixture=fakePool("engram_maintenance"),binding=new PrincipalSessionBinding({pool:fixture.pool});
    const positive=await binding.transaction(verified,async()=>"accepted");
    const before=fixture.calls.length,negative=await outcome(()=>binding.transaction({...verified,verified:false},async()=>"accepted"));
    const noCheckout=fixture.calls.length===before;
    console.log(`D2_TRANSACTION_UNBOUND positive=${positive} negative=${negative} no_checkout=${noCheckout}`);
    assert.deepEqual({positive,negative,noCheckout},{positive:"accepted",negative:"SESSION_UNBOUND",noCheckout:true});
  }else if(name==="role"){
    const maintenance=fakePool("engram_maintenance"),maintenanceBinding=new PrincipalSessionBinding({pool:maintenance.pool});
    const positive=await maintenanceBinding.transaction(verified,async()=>"accepted");
    const wrongRole=fakePool("postgres"),wrongRoleBinding=new PrincipalSessionBinding({pool:wrongRole.pool});
    const negative=await outcome(()=>wrongRoleBinding.transaction(verified,async()=>"accepted")),released=wrongRole.released()===1;
    console.log(`D2_TRANSACTION_ROLE positive=${positive} negative=${negative} released=${released}`);
    assert.deepEqual({positive,negative,released},{positive:"accepted",negative:"SESSION_ROLE_INVALID",released:true});
  }else throw new Error(`unknown D2_TRANSACTION_CASE ${name}`);
}

test(`D2 transaction guards: ${selected}`,async()=>{for(const name of selected==="all"?["unbound","role"]:[selected])await runCase(name);});
