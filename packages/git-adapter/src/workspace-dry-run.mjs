import { SetupPlanError, compileSetup, compiledStepSequence, isCompiledSetup } from "./workspace-setup.mjs";

function declaredEffect(step){const p=step.parameters;
  if(step.kind==="repository.connect")return {operation:"connect_repository",provider:p.provider,repository:`${p.owner}/${p.name}`,default_branch:p.default_branch,permissions:[...p.permissions]};
  if(step.kind==="database.configure")return {operation:"configure_database",mode:p.mode,target:p.target};
  if(step.kind==="group.define")return {operation:"define_group",name:p.name,members:[...p.members]};
  if(step.kind==="participant.grant")return {operation:"grant_participant",participant_id:p.id,role:p.role,scopes:[...p.scopes],projects:[...p.projects],trust:p.trust};
  if(step.kind==="history.import")return {operation:"import_history",paths:[...p.paths],include_history:p.include_history};
  if(step.kind==="welcome.defaults")return {operation:"set_welcome_defaults",expiry_days:p.expiry_days};
  throw new SetupPlanError("UNKNOWN_COMPILED_STEP",step.kind);
}
export function executeDryRun(compiledPlan,{temporary_directory}={}){
  if(!isCompiledSetup(compiledPlan))throw new SetupPlanError("UNCOMPILED_PLAN_REFUSED","dry run requires compileSetup output");
  if(typeof temporary_directory!=="string"||temporary_directory.length===0)throw new SetupPlanError("TEMP_DIRECTORY_REQUIRED","caller must supply a temporary directory");
  const sequence=compiledStepSequence(compiledPlan);
  const steps=compiledPlan.map(step=>Object.freeze({step_id:step.step_id,kind:step.kind,consequential:step.consequential,...(step.consequential?{action_digest:step.action_digest}:{}),effect:Object.freeze(declaredEffect(step))}));
  if(steps.length!==sequence.length||steps.some((step,index)=>step.step_id!==sequence[index]))throw new SetupPlanError("TRANSCRIPT_SEQUENCE_MISMATCH","dry-run transcript differs from compiled order");
  return Object.freeze({mode:"dry_run",temporary_directory,sequence:Object.freeze(sequence),steps:Object.freeze(steps)});
}
export function dryRunSetup(setupInput,options){return executeDryRun(compileSetup(setupInput),options);}
