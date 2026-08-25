import { isOidcRoute, routeOidcRequest, unavailableOidcBoundary } from "./oidc-runtime.mjs";

export function createEngramPortWorker({fallback,oidcBoundary=unavailableOidcBoundary,oidcBoundaryFactory,oidcOptions}={}){
  if(typeof fallback?.fetch!=="function")throw new TypeError("fallback Worker required");
  let resolvedBoundary=null;
  const boundaryFor=async env=>{
    if(typeof oidcBoundaryFactory!=="function")return oidcBoundary;
    resolvedBoundary??=Promise.resolve().then(()=>oidcBoundaryFactory(env));
    try{return await resolvedBoundary;}catch(error){resolvedBoundary=null;throw error;}
  };
  return Object.freeze({
    async fetch(request,env,ctx){
      const url=new URL(request.url);
      if(isOidcRoute(url))return routeOidcRequest(request,env,{boundary:await boundaryFor(env),...oidcOptions}); /* W1_1_OIDC_REAL_WORKER_ROUTE */
      return fallback.fetch(request,env,ctx);
    },
  });
}
