import { PrincipalSessionBinding } from "./d2-session-binding.mjs";

const STORE=Symbol("setup-session-store");

export class SetupSessionStore {
  constructor(){this[STORE]=true;}
}

export const isSetupSessionStore=value=>value?.[STORE]===true;

const tombstone=(session_id,status)=>Object.freeze({session_id,status,authority:false});

export class InMemorySetupSessionStore extends SetupSessionStore {
  #sessions=new Map();
  #tombstones=new Map();
  #revokedApprovals=new Set();
  #clock;

  constructor({clock=()=>new Date()}={}){super();this.#clock=clock;}

  async create(session){this.#sweepExpired();this.#sessions.set(session.session_id,{...session,approvals:new Map()});return session;}

  async readLive(session_id){this.#sweepExpired();const session=this.#sessions.get(session_id)??null;return {session,state:session??this.#tombstones.get(session_id)??null};}

  async inspect(session_id){this.#sweepExpired();return this.#sessions.get(session_id)??this.#tombstones.get(session_id)??null;}

  async saveApproval(session_id,approval,plan){const session=this.#sessions.get(session_id);if(session)session.approvals.set(approval.approval_id,{approval,plan});}

  async getApproval(session_id,approval_id){return this.#sessions.get(session_id)?.approvals.get(approval_id)??null;}

  async approvalRevoked(approval_id){return this.#revokedApprovals.has(approval_id);}

  async transition(session_id,status){this.#sweepExpired();const session=this.#sessions.get(session_id);if(!session)return {ok:false,state:this.#tombstones.get(session_id)??null};this.#revoke(session);this.#sessions.delete(session_id);const state=tombstone(session_id,status);this.#tombstones.set(session_id,state);return {ok:true,state};}

  async identityInventory(){this.#sweepExpired();return Object.freeze({wizard_principals:0,wizard_actors:0,session_principal_bindings:this.#sessions.size,delegations:this.#sessions.size,credentials:0});}

  #revoke(session){for(const id of session.approvals.keys())this.#revokedApprovals.add(id);}

  #sweepExpired(){const now=this.#clock().getTime();for(const [session_id,session] of this.#sessions){if(now>=Date.parse(session.expires_at)){this.#revoke(session);this.#sessions.delete(session_id);this.#tombstones.set(session_id,tombstone(session_id,"expired"));}}}
}

const normalizeRow=row=>{
  if(!row)return null;
  if(row.active===true||row.effective_state==="active")return {
    session_id:row.session_id,
    status:"active",
    founder_principal_id:row.founder_principal_id,
    scopes:[...row.scopes],
    expires_at:new Date(row.expires_at).toISOString(),
  };
  const status=row.effective_state==="authority_inactive"?"revoked":row.effective_state;
  return tombstone(row.session_id,status);
};

export class PostgresSetupSessionStore extends SetupSessionStore {
  #connectionString;
  #pool;
  #binding;
  #sessionBindings=new Map();
  #observedSessions=new Set();
  #approvals=new Map();
  #revokedApprovals=new Set();

  constructor({connectionString,pool,sessionBindings=[]}={}){
    super();
    this.#connectionString=connectionString;
    this.#pool=pool;
    if(pool)this.#binding=new PrincipalSessionBinding({pool});
    for(const [session_id,principal_id] of sessionBindings){this.#sessionBindings.set(session_id,principal_id);this.#observedSessions.add(session_id);}
  }

  async create(session){
    const binding={verified:true,principalId:session.founder_principal_id,sessionId:session.session_id};
    await this.#transaction(binding,client=>client.query(
      "SELECT create_setup_session_delegation($1,$2,$3,$4) AS session_id",
      [session.session_id,session.scopes,session.expires_at,session.founder_principal_id],
    ));
    this.#sessionBindings.set(session.session_id,session.founder_principal_id);
    this.#observedSessions.add(session.session_id);
    this.#approvals.set(session.session_id,new Map());
    return session;
  }

  async readLive(session_id){
    const binding=this.#session(session_id);
    return this.#transaction(binding,async client=>{
      const live=(await client.query("SELECT * FROM read_live_setup_session_delegation($1)",[session_id])).rows[0];
      if(live)return {session:normalizeRow({...live,active:true,effective_state:"active"}),state:normalizeRow({...live,active:true,effective_state:"active"})};
      const inspected=(await client.query("SELECT * FROM inspect_setup_session_delegation($1)",[session_id])).rows[0];
      return {session:null,state:normalizeRow(inspected)};
    });
  }

  async inspect(session_id){
    const binding=this.#session(session_id);
    return this.#transaction(binding,async client=>normalizeRow((await client.query("SELECT * FROM inspect_setup_session_delegation($1)",[session_id])).rows[0]));
  }

  async saveApproval(session_id,approval,plan){let approvals=this.#approvals.get(session_id);if(!approvals){approvals=new Map();this.#approvals.set(session_id,approvals);}approvals.set(approval.approval_id,{approval,plan});}

  async getApproval(session_id,approval_id){return this.#approvals.get(session_id)?.get(approval_id)??null;}

  async approvalRevoked(approval_id){return this.#revokedApprovals.has(approval_id);}

  async transition(session_id,status){
    const binding=this.#session(session_id),fn=status==="completed"?"complete_setup_session_delegation":"abandon_setup_session_delegation";
    await this.#transaction(binding,client=>client.query(`SELECT ${fn}($1) AS session_id`,[session_id]));
    this.#revokeApprovals(session_id);
    return {ok:true,state:tombstone(session_id,status)};
  }

  async identityInventory(){
    if(this.#observedSessions.size===0)await this.#maintenance(client=>client.query("SELECT 1"));
    let active=0;
    for(const session_id of this.#observedSessions){const state=await this.inspect(session_id);if(state?.status==="active")active++;}
    return Object.freeze({wizard_principals:0,wizard_actors:0,session_principal_bindings:active,delegations:active,credentials:0});
  }

  async sweepExpired(){return Number((await this.#maintenance(client=>client.query("SELECT sweep_expired_setup_session_delegations() AS swept"))).rows[0].swept);}

  async close(){if(this.#pool)await this.#pool.end();}

  #session(session_id){const principalId=this.#sessionBindings.get(session_id);return {verified:true,principalId,sessionId:session_id};}

  #revokeApprovals(session_id){for(const id of this.#approvals.get(session_id)?.keys()??[])this.#revokedApprovals.add(id);this.#approvals.delete(session_id);}

  async #getPool(){if(!this.#pool){const {Pool}=await import("pg");this.#pool=new Pool({connectionString:this.#connectionString,options:"-c search_path=public",connectionTimeoutMillis:1000,statement_timeout:5000});this.#binding=new PrincipalSessionBinding({pool:this.#pool});}return this.#pool;}

  async #transaction(session,operation){await this.#getPool();return this.#binding.transaction(session,operation);}

  async #maintenance(operation){
    const client=await (await this.#getPool()).connect();
    try{
      const role=await client.query("SELECT session_user");
      if(role.rows[0]?.session_user!=="engram_maintenance"){const error=new Error("SESSION_ROLE_INVALID");error.code="SESSION_ROLE_INVALID";throw error;}
      await client.query("BEGIN");
      const result=await operation(client);
      await client.query("COMMIT");
      return result;
    }catch(error){try{await client.query("ROLLBACK");}catch(rollbackError){void rollbackError;}throw error;}
    finally{let scrubError;try{await client.query("DISCARD ALL");}catch(error){scrubError=error;}try{client.release(scrubError);}catch(releaseError){void releaseError;}}
  }
}
