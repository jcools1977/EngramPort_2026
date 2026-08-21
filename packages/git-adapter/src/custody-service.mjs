import {createHash} from "node:crypto";

export class CustodyError extends Error { constructor(code){super(code);this.code=code;} }
export class VaultTransitBoundary {
  #token;
  constructor({endpoint="http://127.0.0.1:8201",token,allowedKeys=["synthetic-nonexportable"]}={}){if(!/^https?:\/\/127\.0\.0\.1:8201$/.test(endpoint))throw new CustodyError("KMS_CONFIG_INVALID");this.endpoint=endpoint;this.#token=token;this.allowedKeys=new Set(allowedKeys);}
  toJSON(){return {endpoint:this.endpoint};}
  async request(path,body){if(!this.#token)throw new CustodyError("KMS_UNAVAILABLE");let r;try{r=await fetch(`${this.endpoint}/v1/${path}`,{method:"POST",headers:{"X-Vault-Token":this.#token,"content-type":"application/json"},body:JSON.stringify(body)});}catch{throw new CustodyError("KMS_UNAVAILABLE");}if(!r.ok)throw new CustodyError(`KMS_${r.status}`);let json;try{json=await r.json();}catch{throw new CustodyError("KMS_RESPONSE_INVALID");}if(typeof json?.data?.signature!=="string"||!/^vault:v\d+:/.test(json.data.signature))throw new CustodyError("KMS_RESPONSE_INVALID");return json.data.signature;}
  async sign(name,data){if(typeof name!=="string"||!/^[A-Za-z0-9_-]+$/.test(name)||name.includes("..")||!this.allowedKeys.has(name))throw new CustodyError("KMS_KEY_REFUSED");return this.request(`transit/sign/${encodeURIComponent(name)}/sha2-256`,{input:Buffer.from(data).toString("base64")});}
}
export const RETENTION={"RET-SESSION":86400000,"RET-OPS-90":90*86400000,"RET-AUDIT-400":400*86400000,"RET-GRANT-400":400*86400000,"RET-CONFIG-400":400*86400000,"RET-VERIFY-104":104*86400000};
export function retentionDue(policy,events,now){const starts={"RET-SESSION":events.session_start,"RET-OPS-90":events.terminal,"RET-AUDIT-400":events.accepted,"RET-GRANT-400":events.terminal_status,"RET-CONFIG-400":events.rotated??events.issued,"RET-VERIFY-104":events.last_artifact_expiry};const s=starts[policy];return s!=null&&now-s>=RETENTION[policy];}
const CANARY_SINKS=Object.freeze(["events","artifacts","plans","report_output","logs","process_arguments","process_environment","core_dumps","backups","error_surfaces"]);
const SYNTHETIC_CANARY_TENANT="synthetic-canary-tenant";
const SYNTHETIC_CANARY_KEY="synth-a";
const chosenCanary=()=>["Bearer","synthetic-canary-8f4c2d19a7e63b50d4f18c97a2536e0bc1459d782fa30c6e91b547d38a6c2f04"].join(" ");
export function canaryHarness({boundary,tenantId,keyName,vulnerableImports,protectedImports,observers}={}){
  if(tenantId!==SYNTHETIC_CANARY_TENANT||keyName!==SYNTHETIC_CANARY_KEY)throw new CustodyError("CANARY_SCOPE_REFUSED");
  if(!boundary||typeof boundary.sign!=="function")throw new CustodyError("CANARY_SIGNER_REQUIRED");
  for(const sink of CANARY_SINKS){if(typeof vulnerableImports?.[sink]!=="function"||typeof protectedImports?.[sink]!=="function"||typeof observers?.[sink]?.vulnerable!=="function"||typeof observers?.[sink]?.protected!=="function")throw new CustodyError("CANARY_SINK_INVALID");if(vulnerableImports[sink]===protectedImports[sink]||observers[sink].vulnerable===observers[sink].protected)throw new CustodyError("CANARY_PATHS_NOT_ISOLATED");}
  const canary=chosenCanary();const digest=createHash("sha256").update("engramport-section10-known-digest-v1").digest("hex");const context=Object.freeze({tenantId,canary});
  const vulnerable=async sink=>{if(!CANARY_SINKS.includes(sink))throw new CustodyError("SINK_REQUIRED");await vulnerableImports[sink](context);const dirty=Boolean(await observers[sink].vulnerable(context));return {sink,dirty,observed:dirty};};
  const protectedRun=async sink=>{if(!CANARY_SINKS.includes(sink))throw new CustodyError("SINK_REQUIRED");const result=await protectedImports[sink](context);const dirty=Boolean(await observers[sink].protected(context));const signature=await boundary.sign(keyName,digest);const materialExcluded=result?.refused===true||result?.protected===true;return {sink,refused:result?.refused===true,materialExcluded,dirty,clean:materialExcluded&&!dirty,signed:/^vault:v\d+:/.test(signature),digest};};
  return Object.freeze({canary,digest,sinks:CANARY_SINKS,vulnerable,protectedRun});
}
