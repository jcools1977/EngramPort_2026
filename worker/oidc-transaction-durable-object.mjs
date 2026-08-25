import { DurableObject } from "cloudflare:workers";
import { normalizeOidcTransaction } from "../packages/git-adapter/src/oidc-transaction-store.mjs";

const RECORD_KEY="transaction";
const ALARM_GRACE_MS=1000;

export class OidcTransactionDurableObject extends DurableObject{
  async #purge(){
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll(); /* W1_1_OIDC_DO_DELETE_ALL */
  }

  async create(input){
    const transaction=normalizeOidcTransaction(input);
    if(this.ctx.id.name!==transaction.state)throw new TypeError("OIDC Durable Object name must equal state");
    const existing=await this.ctx.storage.get(RECORD_KEY);
    if(existing)return Object.freeze({status:"conflict"});
    await this.ctx.storage.put(RECORD_KEY,transaction); /* W1_1_OIDC_DO_PERSISTED_RECORD */
    try{await this.ctx.storage.setAlarm(transaction.expiresAt+ALARM_GRACE_MS);}
    catch(error){await this.#purge();throw error;}
    return Object.freeze({status:"stored",expiresAt:transaction.expiresAt});
  }

  async claim(consumer){
    if(typeof consumer?.consume!=="function")throw new TypeError("OIDC RPC consumer required");
    let transaction=null,status="absent";
    await this.ctx.storage.transaction(async storage=>{
      const record=await storage.get(RECORD_KEY);
      if(!record)return;
      if(record.state!==this.ctx.id.name||record.status!=="pending")return;
      if(record.expiresAt<=Date.now() /* W1_1_OIDC_DO_EXPIRY_GUARD */){
        await storage.put(RECORD_KEY,{...record,status:"expired"});
        status="expired";
        return;
      }
      await storage.put(RECORD_KEY,{...record,status:"claimed"}); /* W1_1_OIDC_DO_ATOMIC_CLAIM */
      transaction=record;
      status="claimed";
    });
    if(status!=="claimed"){
      if(status==="expired")await this.#purge();
      return Object.freeze({status});
    }
    let consumed=false;
    try{
      const acknowledgment=await consumer.consume(transaction);
      consumed=acknowledgment?.status==="consumed";
      return Object.freeze({status:"claimed",consumed});
    }finally{
      await this.#purge();
    }
  }

  async inspect(){
    const record=await this.ctx.storage.get(RECORD_KEY);
    if(!record)return Object.freeze({status:"absent",present:false,alarmAt:null});
    if(record.expiresAt<=Date.now() /* W1_1_OIDC_DO_INSPECT_EXPIRY_GUARD */){
      await this.#purge();
      return Object.freeze({status:"expired",present:false,alarmAt:null});
    }
    return Object.freeze({status:record.status,present:true,expiresAt:record.expiresAt,alarmAt:await this.ctx.storage.getAlarm()});
  }

  async sweepExpired(){
    const record=await this.ctx.storage.get(RECORD_KEY);
    if(!record||record.expiresAt<=Date.now()){
      await this.#purge();
      return Object.freeze({status:"clean",present:Boolean(await this.ctx.storage.get(RECORD_KEY))});
    }
    await this.ctx.storage.setAlarm(record.expiresAt+ALARM_GRACE_MS);
    return Object.freeze({status:"scheduled",present:true,expiresAt:record.expiresAt});
  }
  async alarm(){await this.sweepExpired();}
}
