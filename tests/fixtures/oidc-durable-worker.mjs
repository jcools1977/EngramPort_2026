import { createEngramPortWorker } from "../../worker/entry.mjs";
export { OidcTransactionDurableObject } from "../../worker/oidc-transaction-durable-object.mjs";

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const boundary=Object.freeze({
  exchange:async request=>{if(request.code==="race")await delay(40);return {id_token:"synthetic-id-token"};},
  verifier:Object.freeze({verify:async()=>Object.freeze({iss:"https://synthetic-issuer.invalid",sub:"synthetic-founder"})}),
});

const fallback=Object.freeze({
  async fetch(request,env){
    const url=new URL(request.url),state=url.searchParams.get("state");
    if(url.pathname==="/__oidc/inspect")return Response.json(await env.OIDC_TRANSACTIONS.getByName(state).inspect(),{headers:{"Cache-Control":"no-store"}});
    if(url.pathname==="/__oidc/alarm"){
      return Response.json(await env.OIDC_TRANSACTIONS.getByName(state).sweepExpired(),{headers:{"Cache-Control":"no-store"}});
    }
    return new Response("fixture fallback",{status:404});
  },
});

export default createEngramPortWorker({
  fallback,
  oidcBoundary:boundary,
  oidcOptions:{onVerified:async()=>new Response(null,{status:204,headers:{"Cache-Control":"no-store"}})},
});
