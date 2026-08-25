import { createOidcClient } from "./oidc-client.mjs";
import { PostgresSetupSessionStore } from "./workspace-session-store.mjs";
import { SetupSessionManager, founderAuthenticator, founderAuthorityResolver } from "./workspace-session.mjs";

export class FounderBindingError extends Error{
  constructor(code,message=code){super(message);this.name="FounderBindingError";this.code=code;}
}

export class PostgresFounderResolver{
  #pool;#connectionString;
  constructor({pool,connectionString}={}){if(!pool&&!connectionString)throw new TypeError("Postgres founder resolver requires pool or connectionString");this.#pool=pool;this.#connectionString=connectionString;}
  async #getPool(){if(!this.#pool){const {Pool}=await import("pg");this.#pool=new Pool({connectionString:this.#connectionString,options:"-c search_path=public",connectionTimeoutMillis:3000,statement_timeout:5000});}return this.#pool;}
  async resolvePrincipal({issuer,subject,bindingId=null,foundingAuthorizationId=null}={}){
    const result=await (await this.#getPool()).query("SELECT principal_id FROM resolve_founder_principal($1,$2,$3,$4,NULL,NULL)",[issuer,subject,bindingId,foundingAuthorizationId]);
    const row=result.rows[0];
    if(!row||typeof row.principal_id!=="string")throw new FounderBindingError("FOUNDER_BINDING_ABSENT");
    return Object.freeze({principal_id:row.principal_id}); /* W1_1_OIDC_BINDER_EXACT_SURFACE */
  }
  async resolveAuthority(principalId){
    const result=await (await this.#getPool()).query("SELECT principal_id,scopes,expires_at FROM resolve_founder_authority($1)",[principalId]);
    const row=result.rows[0];
    return row?Object.freeze({principal_id:row.principal_id,scopes:Object.freeze([...row.scopes]),expires_at:new Date(row.expires_at).toISOString()}):null;
  }
  async close(){if(this.#pool?.end)await this.#pool.end();}
}

export function createFounderSetupComposition({pool,connectionString,oidc,transactionStore,clock,idFactory}={}){
  if(!pool&&!connectionString)throw new TypeError("production setup composition requires Postgres");
  const resolver=new PostgresFounderResolver({pool,connectionString});
  const store=new PostgresSetupSessionStore({pool,connectionString});
  const client=createOidcClient({...oidc,transactionStore,clock});
  const manager=new SetupSessionManager({
    store, /* W1_1_OIDC_COMPOSITION_DURABLE_STORE */
    clock,
    idFactory,
    authenticator:founderAuthenticator(async credential=>{
      const claims=await client.callback(credential);
      return resolver.resolvePrincipal({issuer:claims.iss,subject:claims.sub,bindingId:credential.binding_id??null,foundingAuthorizationId:credential.founding_authorization_id??null});
    }),
    authorityResolver:founderAuthorityResolver(principalId=>resolver.resolveAuthority(principalId)),
  });
  return Object.freeze({
    beginAuth:()=>client.start(),
    startSession:({callback,scopes,expires_at})=>manager.start({credential:callback,scopes,expires_at}),
    transientInventory:()=>client.transientInventory(),
    close:async()=>{await store.close();if(!pool)await resolver.close();},
  });
}
