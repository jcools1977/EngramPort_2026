import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { canonicalJson } from "./welcome-verify.mjs";

const allowedGitHub=new Set(["contents:read","pull_requests:write_non_default","webhooks:receive"]);
const compiledPlans=new WeakSet();
export class SetupPlanError extends Error { constructor(code,message){super(`${code}: ${message}`);this.code=code;} }
export function parseSetup(source){
  const clean=source.split(/\r?\n/).filter(line=>!line.trimStart().startsWith("#")).join("\n");
  try{return JSON.parse(clean);}catch(error){throw new SetupPlanError("SETUP_PARSE_ERROR",`workspace.setup.yaml must use the JSON-compatible YAML subset: ${error.message}`);}
}
const exact=(object,keys,label)=>{if(!object||typeof object!=="object"||Array.isArray(object))throw new SetupPlanError("SETUP_SCHEMA_INVALID",`${label} must be an object`);for(const k of keys)if(!(k in object))throw new SetupPlanError("SETUP_SCHEMA_INVALID",`${label} missing ${k}`);for(const k of Object.keys(object))if(!keys.includes(k))throw new SetupPlanError("SETUP_SCHEMA_UNKNOWN_FIELD",`${label} unknown field ${k}`);};
const stringArray=(o,k,label)=>{if(!Array.isArray(o[k])||o[k].some(v=>typeof v!=="string"))throw new SetupPlanError("SETUP_SCHEMA_INVALID",`${label}.${k} must be a string array`);};
export function validateSetup(p){
 exact(p,["schema_version","created_at","founder","repository","database","participants","groups","import","welcome"],"setup");if(p.schema_version!==0)throw new SetupPlanError("SETUP_SCHEMA_INVALID","schema_version must be 0");if(!Number.isFinite(Date.parse(p.created_at)))throw new SetupPlanError("SETUP_SCHEMA_INVALID","created_at must be date-time");
 exact(p.founder,["principal_id","scopes","assignable_trust","expires_at"],"founder");stringArray(p.founder,"scopes","founder");stringArray(p.founder,"assignable_trust","founder");
 exact(p.repository,["provider","owner","name","default_branch","permissions","depends_on"],"repository");stringArray(p.repository,"permissions","repository");stringArray(p.repository,"depends_on","repository");
 exact(p.database,["mode","target","depends_on"],"database");stringArray(p.database,"depends_on","database");
 if(!Array.isArray(p.participants)||!Array.isArray(p.groups))throw new SetupPlanError("SETUP_SCHEMA_INVALID","participants and groups must be arrays");
 for(const x of p.participants){exact(x,["id","kind","role","scopes","capabilities","groups","trust","projects","expires_at","owner_id","depends_on"],`participant ${x?.id??"?"}`);for(const k of ["scopes","capabilities","groups","projects","depends_on"])stringArray(x,k,`participant ${x.id}`);}
 for(const g of p.groups){exact(g,["name","members","depends_on"],`group ${g?.name??"?"}`);stringArray(g,"members",`group ${g.name}`);stringArray(g,"depends_on",`group ${g.name}`);}
 exact(p.import,["paths","include_history","depends_on"],"import");stringArray(p.import,"paths","import");stringArray(p.import,"depends_on","import");
 exact(p.welcome,["expiry_days","depends_on"],"welcome");stringArray(p.welcome,"depends_on","welcome");return p;
}
export const grantOutlives=(grantExpiry,granterExpiry)=>granterExpiry!==null&&(grantExpiry===null||Date.parse(grantExpiry)>Date.parse(granterExpiry));
export const scopesExceed=(grantScopes,granterScopes)=>grantScopes.some(scope=>!new Set(granterScopes).has(scope));
const compatibleTrust={human:new Set(["verified_human","untrusted_agent"]),guest:new Set(["untrusted_agent"]),agent:new Set(["trusted_agent","untrusted_agent","imported"])};
function authority(p){for(const permission of p.repository.permissions)if(!allowedGitHub.has(permission))throw new SetupPlanError("GITHUB_PERMISSION_REFUSED",permission);
 const assignableTrust=new Set(p.founder.assignable_trust);
 for(const x of p.participants){if(scopesExceed(x.scopes,p.founder.scopes))throw new SetupPlanError("SCOPE_EXCEEDS_FOUNDER",x.id);if(!assignableTrust.has(x.trust))throw new SetupPlanError("SELF_ASSERTED_TRUST_REFUSED",`${x.id}: ${x.trust}`);if(!compatibleTrust[x.kind]?.has(x.trust))throw new SetupPlanError("TRUST_KIND_INCOMPATIBLE",`${x.id}: ${x.kind} cannot receive ${x.trust}`);
  if(x.kind==="guest"){const max=Date.parse(p.created_at)+14*86400000;if(x.projects.length!==1||x.trust!=="untrusted_agent"||x.expires_at===null||Date.parse(x.expires_at)>max)throw new SetupPlanError("GUEST_GRANT_EXCEEDS_DEFAULTS",x.id);}
  if(x.kind==="agent"){const owner=p.participants.find(o=>o.id===x.owner_id);if(!owner||scopesExceed(x.scopes,owner.scopes)||grantOutlives(x.expires_at,owner.expires_at))throw new SetupPlanError("AGENT_GRANT_EXCEEDS_OWNER",x.id);}
  if(grantOutlives(x.expires_at,p.founder.expires_at))throw new SetupPlanError("GRANT_OUTLIVES_GRANTER",x.id);
 }}
const digest=params=>createHash("sha256").update(canonicalJson(params)).digest("hex");
function rawSteps(p){return [
 {step_id:"repository.connect",kind:"repository.connect",parameters:{...p.repository,depends_on:undefined},consequential:true,depends_on:p.repository.depends_on},
 {step_id:"database.configure",kind:"database.configure",parameters:{...p.database,depends_on:undefined},consequential:true,depends_on:p.database.depends_on},
 ...p.groups.map(g=>({step_id:`group.${g.name}`,kind:"group.define",parameters:{name:g.name,members:g.members},consequential:false,depends_on:g.depends_on})),
 ...p.participants.map(x=>({step_id:`participant.${x.id}`,kind:"participant.grant",parameters:Object.fromEntries(Object.entries(x).filter(([k])=>k!=="depends_on")),consequential:true,depends_on:x.depends_on})),
 {step_id:"history.import",kind:"history.import",parameters:{paths:p.import.paths,include_history:p.import.include_history},consequential:true,depends_on:p.import.depends_on},
 {step_id:"welcome.defaults",kind:"welcome.defaults",parameters:{expiry_days:p.welcome.expiry_days},consequential:true,depends_on:p.welcome.depends_on}
 ];}
function order(steps){const by=new Map(steps.map(s=>[s.step_id,s]));for(const s of steps)for(const d of s.depends_on)if(!by.has(d))throw new SetupPlanError("UNSATISFIABLE_DEPENDENCY",`${s.step_id} -> ${d}`);const result=[],remaining=new Set(by.keys());while(remaining.size){const ready=[...remaining].filter(id=>by.get(id).depends_on.every(d=>!remaining.has(d))).sort();if(!ready.length)throw new SetupPlanError("CYCLIC_DEPENDENCY",[...remaining].sort().join(","));for(const id of ready){result.push(by.get(id));remaining.delete(id);}}return result;}
export function compileSetup(input){const p=validateSetup(typeof input==="string"?parseSetup(input):structuredClone(input));authority(p);const plan=order(rawSteps(p)).map(s=>{const params=JSON.parse(JSON.stringify(s.parameters));const out={step_id:s.step_id,kind:s.kind,parameters:params,consequential:s.consequential,depends_on:[...s.depends_on].sort()};if(s.consequential)out.action_digest=digest(params);return Object.freeze(out);});compiledPlans.add(plan);return Object.freeze(plan);}
export function compiledStepSequence(plan){if(!compiledPlans.has(plan))throw new SetupPlanError("UNCOMPILED_PLAN_REFUSED","step list was not produced by compileSetup");return plan.map(step=>step.step_id);}
export function isCompiledSetup(plan){return compiledPlans.has(plan);}
export async function compileSetupFile(file){return compileSetup(await readFile(file,"utf8"));}
export const ACTION_PROFILE="engramport-action-v1";
