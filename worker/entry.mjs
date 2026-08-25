import { isOidcRoute, routeOidcRequest, unavailableOidcBoundary } from "./oidc-runtime.mjs";

export function createEngramPortWorker({fallback,oidcBoundary=unavailableOidcBoundary,oidcOptions}={}){
  if(typeof fallback?.fetch!=="function")throw new TypeError("fallback Worker required");
  return Object.freeze({
    async fetch(request,env,ctx){
      const url=new URL(request.url);
      if(isOidcRoute(url))return routeOidcRequest(request,env,{boundary:oidcBoundary,...oidcOptions}); /* W1_1_OIDC_REAL_WORKER_ROUTE */
      return fallback.fetch(request,env,ctx);
    },
  });
}
