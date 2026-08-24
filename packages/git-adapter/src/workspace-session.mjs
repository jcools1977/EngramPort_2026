import { randomUUID } from "node:crypto";

import { SetupPlanError, grantOutlives, isCompiledSetup, scopesExceed } from "./workspace-setup.mjs";
import { planMismatchError } from "./workspace-approval.mjs";
import { InMemorySetupSessionStore, isSetupSessionStore } from "./workspace-session-store.mjs";

const AUTHENTICATOR=Symbol("founder-authenticator");
const AUTHORITY_RESOLVER=Symbol("founder-authority-resolver");
export function founderAuthenticator(authenticate){if(typeof authenticate!=="function")throw new TypeError("authenticate must be a function");return Object.freeze({[AUTHENTICATOR]:true,authenticate});}
export function founderAuthorityResolver(resolve){if(typeof resolve!=="function")throw new TypeError("resolve must be a function");return Object.freeze({[AUTHORITY_RESOLVER]:true,resolve});}
const setupScopesOnly=scopes=>scopes.every(scope=>scope.startsWith("setup:"));
const approvalMatches=(presented,stored)=>presented.session_id===stored.session_id&&presented.plan_digest===stored.plan_digest&&JSON.stringify(presented.steps)===JSON.stringify(stored.steps);
const STORE_ERROR_CODES=Object.freeze({
  SETUP_SESSION_AUTHORITY_REFUSED:"FOUNDER_AUTHORITY_NOT_FOUND",
  SETUP_SESSION_SCOPE_NOT_SETUP:"SESSION_SCOPE_NOT_SETUP",
  SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY:"SESSION_SCOPE_EXCEEDS_FOUNDER",
  SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY:"SESSION_OUTLIVES_FOUNDER",
  SETUP_SESSION_RETENTION_UNRESOLVED:"SESSION_RETENTION_UNRESOLVED",
  SETUP_SESSION_RETENTION_EXCEEDED:"SESSION_RETENTION_EXCEEDED",
  SETUP_SESSION_NOT_OWNED:"SESSION_REVOKED",
  SESSION_UNBOUND:"SESSION_REVOKED",
});

export const translateSetupSessionStoreError=error=>STORE_ERROR_CODES[error?.message]??STORE_ERROR_CODES[error?.code]??null;

export class SetupSessionManager {
  #store;#authenticator;#authorityResolver;#clock;#idFactory;
  constructor({authenticator,authorityResolver,store,clock=()=>new Date(),idFactory=()=>randomUUID()}={}){
    if(!authenticator?.[AUTHENTICATOR])throw new TypeError("founder authenticator required");
    if(!authorityResolver?.[AUTHORITY_RESOLVER])throw new TypeError("founder authority resolver required");
    this.#authenticator=authenticator;this.#authorityResolver=authorityResolver;this.#clock=clock;this.#idFactory=idFactory;
    this.#store=store??new InMemorySetupSessionStore({clock});
    if(!isSetupSessionStore(this.#store))throw new TypeError("setup session store required");
  }

  async start({credential,scopes,expires_at}){
    const identity=await this.#authenticator.authenticate(credential);
    if(!identity||Object.keys(identity).some(key=>key!=="principal_id")||typeof identity.principal_id!=="string")throw new SetupPlanError("FOUNDER_AUTHENTICATION_REFUSED","authenticated identity must contain only principal_id");
    const founder_authority=await this.#authorityResolver.resolve(identity.principal_id);
    if(!founder_authority||founder_authority.principal_id!==identity.principal_id)throw new SetupPlanError("FOUNDER_AUTHORITY_NOT_FOUND","no trusted authority for authenticated principal");
    if(!setupScopesOnly(scopes))throw new SetupPlanError("SESSION_SCOPE_NOT_SETUP","delegation contains non-setup scope");
    if(scopesExceed(scopes,founder_authority.scopes))throw new SetupPlanError("SESSION_SCOPE_EXCEEDS_FOUNDER","delegation exceeds resolved founder scopes");
    if(expires_at===null||!Number.isFinite(Date.parse(expires_at)))throw new SetupPlanError("SESSION_ABSOLUTE_EXPIRY_REQUIRED","session requires absolute expiry");
    if(grantOutlives(expires_at,founder_authority.expires_at))throw new SetupPlanError("SESSION_OUTLIVES_FOUNDER","session outlives resolved founder");
    if(Date.parse(expires_at)<=this.#clock().getTime())throw new SetupPlanError("SESSION_EXPIRED","session expiry is not in the future");
    const session_id=this.#idFactory("session"),session={session_id,status:"active",founder_principal_id:identity.principal_id,scopes:[...scopes],expires_at};
    await this.#call(()=>this.#store.create(session));
    return this.#public(session);
  }

  async approvePlan(session_id,compiledPlan){
    await this.#live(session_id);
    if(!isCompiledSetup(compiledPlan))throw new SetupPlanError("UNCOMPILED_PLAN_REFUSED","approval requires compileSetup or loadSetupPlan output");
    const steps=Object.freeze(compiledPlan.map(({step_id,action_digest})=>Object.freeze({step_id,action_digest})));
    const approval=Object.freeze({approval_id:this.#idFactory("approval"),session_id,plan_digest:compiledPlan.plan_digest,steps});
    await this.#call(()=>this.#store.saveApproval(session_id,approval,compiledPlan));
    return approval;
  }

  async executeApprovedStep(session_id,approval,presentedPlan,step_id){
    const snapshot=await this.#call(()=>this.#store.readLive(session_id));
    if(snapshot.state?.status==="expired")throw new SetupPlanError("SESSION_EXPIRED",session_id);
    if(await this.#call(()=>this.#store.approvalRevoked(approval.approval_id)))throw new SetupPlanError("APPROVAL_REPLAY_REFUSED",approval.approval_id);
    this.#requireLive(session_id,snapshot);
    if(approval.session_id!==session_id)throw new SetupPlanError("APPROVAL_SESSION_MISMATCH",approval.approval_id);
    const stored=await this.#call(()=>this.#store.getApproval(session_id,approval.approval_id));
    if(!stored||!approvalMatches(approval,stored.approval))throw new SetupPlanError("APPROVAL_NOT_FOUND",approval.approval_id);
    if(!isCompiledSetup(presentedPlan))throw new SetupPlanError("UNCOMPILED_PLAN_REFUSED","execution requires compileSetup or loadSetupPlan output");
    if(presentedPlan.plan_digest!==stored.approval.plan_digest)throw planMismatchError(stored.plan,presentedPlan);
    const index=presentedPlan.findIndex(step=>step.step_id===step_id),approved=stored.approval.steps[index],step=presentedPlan[index];
    if(index<0||!approved||approved.step_id!==step.step_id||approved.action_digest!==step.action_digest)throw new SetupPlanError("STEP_NOT_IN_APPROVED_PLAN",step_id);
    return Object.freeze({status:"authorized",session_id,step_id,index,action_digest:step.action_digest,plan_digest:presentedPlan.plan_digest});
  }

  async authorize(session_id){return this.#public(await this.#live(session_id));}
  async complete(session_id){return this.#transition(session_id,"completed");}
  async abandon(session_id){return this.#transition(session_id,"abandoned");}
  async state(session_id){const state=await this.#call(()=>this.#store.inspect(session_id));return state?.status==="active"?this.#public(state):state;}
  async identityInventory(){return this.#call(()=>this.#store.identityInventory());}

  async #live(session_id){return this.#requireLive(session_id,await this.#call(()=>this.#store.readLive(session_id)));}

  #requireLive(session_id,snapshot){
    if(snapshot.session)return snapshot.session;
    throw new SetupPlanError(snapshot.state?.status==="expired"?"SESSION_EXPIRED":"SESSION_REVOKED",session_id);
  }

  async #transition(session_id,status){
    const before=await this.#call(()=>this.#store.inspect(session_id));
    if(!before||before.status!=="active")throw new SetupPlanError("SESSION_REVOKED",session_id);
    try{return (await this.#store.transition(session_id,status)).state;}
    catch(error){
      if(error?.message==="SETUP_SESSION_ALREADY_TERMINAL"){
        const state=await this.#call(()=>this.#store.inspect(session_id));
        throw new SetupPlanError(state?.status==="expired"?"SESSION_EXPIRED":"SESSION_REVOKED",session_id);
      }
      return this.#raise(error);
    }
  }

  async #call(operation){try{return await operation();}catch(error){return this.#raise(error);}}
  #raise(error){const code=translateSetupSessionStoreError(error);if(!code)throw error;throw new SetupPlanError(code,error.message);}
  #public(session){return Object.freeze({session_id:session.session_id,status:"active",founder_principal_id:session.founder_principal_id,scopes:Object.freeze([...session.scopes]),expires_at:session.expires_at});}
}
