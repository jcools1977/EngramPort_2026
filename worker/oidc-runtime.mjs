import { RpcTarget } from "cloudflare:workers";
import { createOidcClient } from "../packages/git-adapter/src/oidc-client.mjs";

class OidcTransactionConsumer extends RpcTarget{
  #operation;value;error;
  constructor(operation){super();this.#operation=operation;this.value=undefined;this.error=null;}
  async consume(transaction){
    try{this.value=await this.#operation(transaction);return Object.freeze({status:"consumed"});}
    catch(error){this.error=error;return Object.freeze({status:"refused"});}
  }
}

export class DurableObjectOidcTransactionStore{
  #namespace;
  constructor(namespace){if(typeof namespace?.getByName!=="function")throw new TypeError("OIDC Durable Object namespace required");this.#namespace=namespace;}
  async create(transaction){
    const status=await this.#namespace.getByName(transaction.state).create(transaction); /* W1_1_OIDC_DO_SAME_NAME_CREATE */
    if(!status||Object.keys(status).some(key=>!["status","expiresAt"].includes(key)))throw Object.assign(new Error("OIDC Durable Object create response refused"),{code:"OIDC_RPC_RESPONSE_REFUSED"});
    return status;
  }
  async claim(state,_now,operation){
    const consumer=new OidcTransactionConsumer(operation);
    const status=await this.#namespace.getByName(state).claim(consumer); /* W1_1_OIDC_DO_SAME_NAME_CLAIM */
    if(!status||Object.keys(status).some(key=>!["status","consumed"].includes(key)))throw Object.assign(new Error("OIDC Durable Object claim response refused"),{code:"OIDC_RPC_RESPONSE_REFUSED"});
    if(consumer.error)throw consumer.error;
    return Object.freeze({...status,value:consumer.value});
  }
}

function unavailable(){const error=new Error("OIDC provider boundary is not implemented");error.code="OIDC_PROVIDER_UNAVAILABLE";throw error;}
export const unavailableOidcBoundary=Object.freeze({exchange:async()=>unavailable(),verifier:Object.freeze({verify:async()=>unavailable()})});

function responseStatus(code){if(code==="OIDC_TRANSACTION_EXPIRED")return 410;if(code==="OIDC_PROVIDER_UNAVAILABLE")return 503;return 400;}
function refusal(error){const code=typeof error?.code==="string"?error.code:"OIDC_REQUEST_REFUSED";return Response.json({error:code},{status:responseStatus(code),headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});}

export function isOidcRoute(url){return url.pathname==="/auth/start"||url.pathname==="/auth/callback";}

export async function routeOidcRequest(request,env,{boundary=unavailableOidcBoundary,clock,randomBytes,onVerified}={}){
  const url=new URL(request.url);
  if(!isOidcRoute(url))return null;
  if(request.method!=="GET")return new Response(null,{status:405,headers:{Allow:"GET","Cache-Control":"no-store"}});
  try{
    const client=createOidcClient({
      issuer:env.OIDC_ISSUER,
      authorizationEndpoint:boundary.authorizationEndpoint??env.OIDC_AUTHORIZATION_ENDPOINT,
      clientId:env.OIDC_CLIENT_ID,
      redirectUri:env.OIDC_REDIRECT_URI,
      scope:env.OIDC_SCOPE??"openid",
      transactionTtlMs:Number(env.OIDC_TRANSACTION_TTL_MS??600000),
      transactionStore:new DurableObjectOidcTransactionStore(env.OIDC_TRANSACTIONS),
      verifier:boundary.verifier,
      exchange:boundary.exchange,
      clock,
      randomBytes,
    });
    if(url.pathname==="/auth/start"){
      const attempt=await client.start();
      return new Response(null,{status:302,headers:{Location:attempt.authorizationUrl,"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
    }
    const verified=await client.callback({state:url.searchParams.get("state"),code:url.searchParams.get("code"),redirectUri:`${url.origin}${url.pathname}`});
    if(typeof onVerified==="function")return await onVerified(verified);
    return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
  }catch(error){return refusal(error);}
}
