import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseEvent, verifyLog } from "./verify-log.mjs";

const UUID7=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEX=/^[0-9a-f]{64}$/;
const sha=(value)=>createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (value===null || typeof value==="boolean" || typeof value==="string") return JSON.stringify(value);
  if (typeof value==="number") { if (!Number.isFinite(value)) throw new Error("non-finite number"); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}
export const grantDigest=(grant)=>sha(Buffer.from(canonicalJson(grant)));
const exact=(o,keys,label,e)=>{if(!o||typeof o!=="object"||Array.isArray(o)){e.push(`${label}: must be object`);return false;} for(const k of keys)if(!(k in o))e.push(`${label}: missing field ${k}`);for(const k of Object.keys(o))if(!keys.includes(k))e.push(`${label}: unknown field ${k}`);return true;};
function manifestErrors(m) { const e=[]; if(!exact(m,["package_version","package_id","issued_at","expires_at","issuer","subject","checkpoint","grant_digest","parts","signature"],"manifest",e))return e;
 if(m.package_version!==1)e.push("manifest: package_version must be 1"); if(!UUID7.test(m.package_id??""))e.push("manifest: package_id must be UUIDv7");
 for(const k of ["issued_at","expires_at"])if(!Number.isFinite(Date.parse(m[k])))e.push(`manifest: ${k} must be date-time`);
 exact(m.issuer,["tenant","project","principal"],"manifest issuer",e); for(const k of ["tenant","project","principal"])if(!UUID.test(m.issuer?.[k]??""))e.push(`manifest issuer: invalid ${k}`);
 exact(m.subject,["invitation_id","actor","actor_slug"],"manifest subject",e); if(!UUID7.test(m.subject?.invitation_id??""))e.push("manifest subject: invalid invitation_id"); if(!UUID.test(m.subject?.actor??""))e.push("manifest subject: invalid actor");
 exact(m.checkpoint,["event_id","project_seq","chain_hash"],"manifest checkpoint",e); if(!UUID7.test(m.checkpoint?.event_id??""))e.push("manifest checkpoint: invalid event_id"); if(!Number.isInteger(m.checkpoint?.project_seq)||m.checkpoint.project_seq<1)e.push("manifest checkpoint: invalid project_seq");if(!HEX.test(m.checkpoint?.chain_hash??""))e.push("manifest checkpoint: invalid chain_hash");
 if(!HEX.test(m.grant_digest??""))e.push("manifest: invalid grant_digest"); if(!Array.isArray(m.parts)||!m.parts.length)e.push("manifest: parts must be nonempty array"); else {const seen=new Set();for(const [i,p]of m.parts.entries()){exact(p,["name","media_type","sha256"],`manifest part ${i}`,e);if(!/^[a-z0-9][a-z0-9._-]*$/.test(p.name??""))e.push(`manifest part ${i}: invalid name`);if(seen.has(p.name))e.push(`manifest: duplicate part ${p.name}`);seen.add(p.name);if(!HEX.test(p.sha256??""))e.push(`manifest part ${i}: invalid sha256`);}}
 exact(m.signature,["algorithm","key_id","value"],"manifest signature",e);if(m.signature?.algorithm!=="ed25519")e.push("manifest signature: algorithm must be ed25519");return e; }
function invitationErrors(i){const e=[],keys=["schema_version","invitation_id","tenant","project","issuer_principal","issuer_actor","intended_subject","grant","grant_digest","token_sha256","single_use","issued_at","expires_at","status"];if(!exact(i,keys,"invitation",e))return e;if(i.schema_version!==0)e.push("invitation: schema_version must be 0");if(!UUID7.test(i.invitation_id??""))e.push("invitation: invalid invitation_id");for(const k of ["tenant","project","issuer_principal","issuer_actor"])if(!UUID.test(i[k]??""))e.push(`invitation: invalid ${k}`);exact(i.grant,["role","scopes","capabilities","groups","trust_ceiling"],"invitation grant",e);for(const k of ["scopes","capabilities","groups"])if(!Array.isArray(i.grant?.[k])||i.grant[k].some(x=>typeof x!=="string"))e.push(`invitation grant: ${k} must be string array`);if(!HEX.test(i.grant_digest??"")||!HEX.test(i.token_sha256??""))e.push("invitation: invalid digest");if(!["open","accepted","declined","revoked","expired"].includes(i.status))e.push("invitation: invalid status");return e;}
async function findEvent(root,id){for(const actor of await readdir(path.join(root,"events"))){for(const name of await readdir(path.join(root,"events",actor))){if(!name.endsWith(`_${id}.md`))continue;return parseEvent(await readFile(path.join(root,"events",actor,name),"utf8"),name);}}return null;}
export async function verifyWelcome(packageDir,{root=process.cwd(),now=new Date()}={}) { const errors=[];let manifest;
 const log=await verifyLog(root);if(!log.ok)errors.push(...log.errors.map(e=>`local log invalid: ${e}`));
 try{manifest=JSON.parse(await readFile(path.join(packageDir,"manifest.json"),"utf8"));}catch(x){errors.push(`manifest parse: ${x.message}`);return {ok:false,errors};} errors.push(...manifestErrors(manifest));if(errors.length)return {ok:false,errors};
 const listed=new Set(["manifest.json",...manifest.parts.map(p=>p.name)]);let names=[];try{names=await readdir(packageDir);}catch(x){errors.push(`package directory: ${x.message}`);}for(const n of names)if(!listed.has(n))errors.push(`unlisted part: ${n}`);
 for(const p of manifest.parts){try{const b=await readFile(path.join(packageDir,p.name));if(sha(b)!==p.sha256)errors.push(`part digest mismatch: ${p.name}`);}catch{errors.push(`part missing: ${p.name}`);}}
 let identity;try{identity=JSON.parse(await readFile(path.join(packageDir,"identity.json"),"utf8"));if(grantDigest(identity.grant)!==manifest.grant_digest)errors.push("grant_digest mismatch: identity grant");}catch(x){errors.push(`identity part: ${x.message}`);}
 let invitation;try{invitation=JSON.parse(await readFile(path.join(root,"invitations",`${manifest.subject.invitation_id}.json`),"utf8"));errors.push(...invitationErrors(invitation));if(invitation.grant_digest!==manifest.grant_digest)errors.push("grant_digest mismatch: invitation");if(invitation.status!=="accepted")errors.push(`invitation status must be accepted, got ${invitation.status}`);}catch(x){errors.push(`invitation record: ${x.message}`);}
 try{const key=JSON.parse(await readFile(path.join(root,"keys",`${manifest.signature.key_id}.json`),"utf8"));if(key.status==="revoked")errors.push(`signing key revoked: ${manifest.signature.key_id}`);else {const unsigned=structuredClone(manifest);delete unsigned.signature.value;const digest=createHash("sha256").update(canonicalJson(unsigned)).digest();if(!verify(null,digest,createPublicKey(key.public_key),Buffer.from(manifest.signature.value,"base64")))errors.push("manifest signature invalid");}}catch{errors.push(`unknown signing key: ${manifest.signature.key_id}`);}
 if(Date.parse(manifest.expires_at)<=now.getTime())errors.push("package expired");
 const event=await findEvent(root,manifest.checkpoint.event_id);if(!event)errors.push(`checkpoint event absent: ${manifest.checkpoint.event_id}`);else {try{const c=JSON.parse(event.body);if(c.project_seq!==manifest.checkpoint.project_seq)errors.push("checkpoint project_seq inconsistent");if(c.chain_hash!==manifest.checkpoint.chain_hash)errors.push("checkpoint chain_hash inconsistent");}catch{errors.push("checkpoint event body is not structured checkpoint JSON");}}
 return {ok:errors.length===0,errors,grant:identity?.grant,profile:"engramport-grant-v1"}; }
