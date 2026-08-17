import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";

export class CustodyError extends Error { constructor(code){super(code);this.code=code;} }
const NS=new Set(["installation","credential","shape"]);
const uuidv7=()=>{const b=Buffer.from(generateKeyPairSync("rsa",{modulusLength:2048}).publicKey.export({type:"spki",format:"der"}).subarray(0,16));const h=createHash("sha256").update(b).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-7${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
export class AtomicCustodyStore {
  constructor(){this.rows=new Map();this.refs=new Map();}
  mint({namespace,className,payload},auth,{failAt}={}){if(!NS.has(namespace)||className!==namespace)throw new CustodyError("NAMESPACE_REFUSED");if(!auth?.authorized||auth.namespace!==namespace)throw new CustodyError("MINT_AUTHORITY_REFUSED");const ref=`epr:${namespace}:${uuidv7()}`;const row={ref,namespace,className,tenant_id:auth.tenant_id,project_id:auth.project_id,revoked:false,payload};try{if(failAt==="row")throw new Error("injected row fault");this.rows.set(ref,row);if(failAt==="bind")throw new Error("injected bind fault");this.refs.set(ref,{ref,namespace,tenant_id:auth.tenant_id,project_id:auth.project_id});if(failAt==="audit")throw new Error("injected audit fault");return {ok:true,ref};}catch{this.rows.delete(ref);this.refs.delete(ref);return {ok:false,code:"ATOMIC_ROLLBACK"};}}
  resolve(ref,ctx){const row=this.rows.get(ref), binding=this.refs.get(ref);return row&&binding&&!row.revoked&&binding.tenant_id===ctx.tenant_id&&binding.project_id===ctx.project_id?row:null;}
}
export class VaultTransitBoundary {
  constructor(){this.keys=new Map();}
  createKey(name,{exportable=false}={}){const kp=generateKeyPairSync("rsa",{modulusLength:2048});this.keys.set(name,{...kp,exportable});}
  sign(name,data){const k=this.keys.get(name);if(!k)throw new CustodyError("KEY_NOT_FOUND");return sign(null,Buffer.from(data),k.privateKey);}
  export(name){const k=this.keys.get(name);if(!k)throw new CustodyError("KEY_NOT_FOUND");if(!k.exportable)throw new CustodyError("PRIVATE_KEY_NOT_EXPORTABLE");return k.privateKey.export({type:"pkcs8",format:"pem"});}
  publicKey(name){return this.keys.get(name)?.publicKey;}
  verify(name,data,sig){return verify(null,Buffer.from(data),this.publicKey(name),sig);}
}
export const RETENTION={"RET-SESSION":86400000,"RET-OPS-90":90*86400000,"RET-AUDIT-400":400*86400000,"RET-GRANT-400":400*86400000,"RET-CONFIG-400":400*86400000,"RET-VERIFY-104":104*86400000};
export function retentionDue(policy,events,now){const starts={"RET-SESSION":events.session_start,"RET-OPS-90":events.terminal,"RET-AUDIT-400":events.accepted,"RET-GRANT-400":events.terminal_status,"RET-CONFIG-400":events.rotated??events.issued,"RET-VERIFY-104":events.last_artifact_expiry};const s=starts[policy];return s!=null&&now-s>=RETENTION[policy];}
export function canaryHarness(boundary){const canary="synthetic-canary-7f3d9b";const leaks=[];const vulnerable=sink=>{leaks.push({sink,canary});return true;};const protectedRun=sink=>{if(sink===undefined)throw new CustodyError("SINK_REQUIRED");return {signed:boundary.sign("synthetic-nonexportable",canary).length>0,clean:!leaks.some(x=>x.sink===sink)};};return {canary,vulnerable,protectedRun,leaks};}
