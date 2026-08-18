import { randomUUID } from "node:crypto";

export class CustodyError extends Error { constructor(code){super(code);this.code=code;} }
const NS=new Set(["installation","credential","shape"]);
const uuidv7=()=>{const u=randomUUID().replaceAll("-","");const t=BigInt(Date.now()).toString(16).padStart(12,"0");return `${t.slice(0,8)}-${t.slice(8)}-7${u.slice(13,16)}-8${u.slice(17,20)}-${u.slice(20)}`;};
export class AtomicCustodyStore {
  constructor(){this.rows=new Map();this.refs=new Map();}
  mint({namespace,className,payload},auth,{failAt}={}){if(!NS.has(namespace)||className!==namespace)throw new CustodyError("NAMESPACE_REFUSED");if(!auth?.authorized||auth.namespace!==namespace)throw new CustodyError("MINT_AUTHORITY_REFUSED");const ref=`epr:${namespace}:${uuidv7()}`;const row={ref,namespace,className,tenant_id:auth.tenant_id,project_id:auth.project_id,revoked:false,payload};try{if(failAt==="row")throw new Error("injected row fault");this.rows.set(ref,row);if(failAt==="bind")throw new Error("injected bind fault");this.refs.set(ref,{ref,namespace,tenant_id:auth.tenant_id,project_id:auth.project_id});if(failAt==="audit")throw new Error("injected audit fault");return {ok:true,ref};}catch{this.rows.delete(ref);this.refs.delete(ref);return {ok:false,code:"ATOMIC_ROLLBACK"};}}
  resolve(ref,ctx){const row=this.rows.get(ref), binding=this.refs.get(ref);return row&&binding&&!row.revoked&&binding.tenant_id===ctx.tenant_id&&binding.project_id===ctx.project_id?row:null;}
}
export class VaultTransitBoundary {
  #token;
  constructor({endpoint="http://127.0.0.1:8201",token,allowedKeys=["synthetic-nonexportable"]}={}){if(!/^https?:\/\/127\.0\.0\.1:8201$/.test(endpoint))throw new CustodyError("KMS_CONFIG_INVALID");this.endpoint=endpoint;this.#token=token;this.allowedKeys=new Set(allowedKeys);}
  toJSON(){return {endpoint:this.endpoint};}
  async request(path,body){if(!this.#token)throw new CustodyError("KMS_UNAVAILABLE");let r;try{r=await fetch(`${this.endpoint}/v1/${path}`,{method:"POST",headers:{"X-Vault-Token":this.#token,"content-type":"application/json"},body:JSON.stringify(body)});}catch{throw new CustodyError("KMS_UNAVAILABLE");}if(!r.ok)throw new CustodyError(`KMS_${r.status}`);let json;try{json=await r.json();}catch{throw new CustodyError("KMS_RESPONSE_INVALID");}if(typeof json?.data?.signature!=="string"||!/^vault:v\d+:/.test(json.data.signature))throw new CustodyError("KMS_RESPONSE_INVALID");return json.data.signature;}
  async sign(name,data){if(typeof name!=="string"||!/^[A-Za-z0-9_-]+$/.test(name)||name.includes("..")||!this.allowedKeys.has(name))throw new CustodyError("KMS_KEY_REFUSED");return this.request(`transit/sign/${encodeURIComponent(name)}/sha2-256`,{input:Buffer.from(data).toString("base64")});}
}
export const RETENTION={"RET-SESSION":86400000,"RET-OPS-90":90*86400000,"RET-AUDIT-400":400*86400000,"RET-GRANT-400":400*86400000,"RET-CONFIG-400":400*86400000,"RET-VERIFY-104":104*86400000};
export function retentionDue(policy,events,now){const starts={"RET-SESSION":events.session_start,"RET-OPS-90":events.terminal,"RET-AUDIT-400":events.accepted,"RET-GRANT-400":events.terminal_status,"RET-CONFIG-400":events.rotated??events.issued,"RET-VERIFY-104":events.last_artifact_expiry};const s=starts[policy];return s!=null&&now-s>=RETENTION[policy];}
export function canaryHarness(boundary){const canary="synthetic-canary-7f3d9b";const leaks=[];const vulnerable=sink=>{leaks.push({sink,canary});return true;};const protectedRun=async sink=>{if(sink===undefined)throw new CustodyError("SINK_REQUIRED");return {signed:(await boundary.sign("synthetic-nonexportable",canary)).length>0,clean:!leaks.some(x=>x.sink===sink)};};return {canary,vulnerable,protectedRun,leaks};}
