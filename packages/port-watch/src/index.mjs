import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const AUTHORIZED=Symbol("authorized-inbox-source");
export function authorizedInboxSource(query) {
  if(typeof query!=="function")throw new TypeError("authorized inbox query must be a function");
  return Object.freeze({[AUTHORIZED]:true,queryAuthorized:query});
}
export class RecordingRunner {
  invocations=[];
  async run(context,token){this.invocations.push(structuredClone({context,token}));return {run_id:context.run_id};}
}
export class FileWatchStore {
  constructor(file){this.file=file;this.pending=Promise.resolve();}
  async read(){try{return JSON.parse(await readFile(this.file,"utf8"));}catch(error){if(error.code==="ENOENT")return {agents:{},events:[]};throw error;}}
  async transaction(change){const execute=async()=>{const state=await this.read(),next=await change(structuredClone(state));await mkdir(path.dirname(this.file),{recursive:true});const temporary=`${this.file}.${process.pid}.${randomUUID()}.tmp`;await writeFile(temporary,JSON.stringify(next,null,2)+"\n");await rename(temporary,this.file);return structuredClone(next);};const result=this.pending.then(execute);this.pending=result.then(()=>undefined,()=>undefined);return result;}
}
const key=(agent,project)=>`${agent}:${project}`;
const initial=()=>({enabled:false,status:"disabled",cursor:0,scopes:[],cadence_seconds:240,jitter_fraction:0.1,active_run:null,completions:[]});
export function decideDelivery({cursor,events}){
  const delta=events.filter(event=>event.project_seq>cursor).sort((a,b)=>a.project_seq-b.project_seq||a.event_id.localeCompare(b.event_id));
  return delta.length?{action:"wake",events:delta}:{action:"skip",reason:"unchanged"};
}
export function decideWatch({watch,cursor,events}){
  if(!watch.enabled)return {action:"skip",reason:"disabled"};
  if(watch.status==="paused")return {action:"skip",reason:"paused"};
  if(watch.status==="stopped")return {action:"skip",reason:"stopped"};
  if(watch.active_run)return {action:"skip",reason:"wip_limit"};
  const delivery=decideDelivery({cursor,events});
  if(delivery.action==="skip")return delivery;
  const handoff=delivery.events.find(event=>event.kind==="handoff"&&event.implementation_authority===true);
  if(!handoff)return {action:"skip",reason:"no_eligible_handoff"};
  return {action:"wake",event:handoff};
}
export function nextPollDelay({cadence_seconds=240,jitter_fraction=0.1,sample=0.5}={}){
  if(!(cadence_seconds>0)||jitter_fraction<0||jitter_fraction>=1||sample<0||sample>1)throw new RangeError("invalid cadence or jitter");
  return cadence_seconds*(1-jitter_fraction+2*jitter_fraction*sample);
}
export class PortWatch {
  constructor({store,inbox,runner,supervisor_scopes=[]}){if(!inbox?.[AUTHORIZED])throw new TypeError("PortWatch requires an already-authorized inbox source");this.store=store;this.inbox=inbox;this.runner=runner;this.supervisor_scopes=[...supervisor_scopes];}
  async configure(agent,project,{enabled=false,scopes=[],cadence_seconds=240,jitter_fraction=0.1}={}){return this.store.transaction(state=>{const existing=state.agents[key(agent,project)]??initial();state.agents[key(agent,project)]={...existing,enabled,status:enabled?"enabled":"disabled",scopes:[...scopes],cadence_seconds,jitter_fraction};state.events.push({kind:enabled?"watch.enabled":"watch.skipped",agent,project,reason:enabled?undefined:"disabled"});return state;});}
  async control(agent,project,action){return this.store.transaction(state=>{const watch=state.agents[key(agent,project)]??initial();if(action==="enable"){watch.enabled=true;watch.status="enabled";state.events.push({kind:"watch.enabled",agent,project});}else if(action==="pause"){watch.status="paused";state.events.push({kind:"watch.paused",agent,project});}else if(action==="stop"){watch.status="stopped";if(watch.active_run){watch.active_run.termination_requested=true;watch.active_run.lease_status="revoked";}state.events.push({kind:"watch.stopped",agent,project,active_run:watch.active_run?.run_id??null});}else throw new TypeError(`unknown control ${action}`);state.agents[key(agent,project)]=watch;return state;});}
  async tick(agent,project){const before=await this.store.read(),snapshot=before.agents[key(agent,project)]??initial();const events=await this.inbox.queryAuthorized({agent,project,after:snapshot.cursor});let decision,run;
    await this.store.transaction(state=>{const watch=state.agents[key(agent,project)]??initial();decision=decideWatch({watch,cursor:watch.cursor,events});state.events.push({kind:"watch.polled",agent,project,cursor:watch.cursor,result:decision.action});if(decision.action==="skip")state.events.push({kind:"watch.skipped",agent,project,reason:decision.reason});else {run={run_id:randomUUID(),lease_token:randomUUID()};watch.active_run={...run,event_id:decision.event.event_id,project_seq:decision.event.project_seq,lease_status:"active",termination_requested:false};state.agents[key(agent,project)]=watch;state.events.push({kind:"watch.woke",agent,project,event_id:decision.event.event_id,run_id:run.run_id});}return state;});
    if(decision.action==="skip")return decision;
    const current=(await this.store.read()).agents[key(agent,project)];const token={agent,project,scopes:[...current.scopes]};const context={run_id:run.run_id,event_ids:[decision.event.event_id],events:[structuredClone(decision.event)]};await this.runner.run(context,token);return {...decision,...run};}
  async complete(agent,project,{run_id,status="completed"}){if(!["completed","failed"].includes(status))throw new TypeError("terminal status required");return this.store.transaction(state=>{const watch=state.agents[key(agent,project)]??initial(),run=watch.active_run;if(!run||run.run_id!==run_id)throw new Error("RUN_NOT_ACTIVE");if(run.lease_status!=="active")throw new Error("LEASE_NOT_ACTIVE");watch.completions.push({run_id,event_id:run.event_id,status});watch.cursor=Math.max(watch.cursor,run.project_seq);watch.active_run=null;state.events.push({kind:`run.${status}`,agent,project,run_id,event_id:run.event_id,cursor:watch.cursor});return state;});}
  async expireLease(agent,project,lease_token){return this.store.transaction(state=>{const watch=state.agents[key(agent,project)]??initial();if(!watch.active_run||watch.active_run.lease_token!==lease_token)throw new Error("LEASE_TOKEN_MISMATCH");state.events.push({kind:"run.lease_expired",agent,project,run_id:watch.active_run.run_id});watch.active_run=null;return state;});}
  async rewind(agent,project,to,{operator=false}={}){return this.store.transaction(state=>{const watch=state.agents[key(agent,project)]??initial();if(to<watch.cursor&&!operator)throw new Error("CURSOR_REWIND_REFUSED");const from=watch.cursor;watch.cursor=to;if(to<from)state.events.push({kind:"cursor.rewound",agent,project,from,to,operator:true});return state;});}
}
