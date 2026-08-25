import { captureOidcSubject, createGoogleOidcBoundaryFromEnv } from "../../packages/git-adapter/src/oidc-provider.mjs";
import { createEngramPortWorker } from "../../worker/entry.mjs";
export { OidcTransactionDurableObject } from "../../worker/oidc-transaction-durable-object.mjs";

const GOOGLE_CLIENT_ID="1074508038321-g7n86n4nj23858t9mm4r94fqmugkb0sd.apps.googleusercontent.com";
const fallback=Object.freeze({fetch:async()=>new Response("loopback OIDC fixture",{status:404})});

export default createEngramPortWorker({
  fallback,
  oidcBoundaryFactory:createGoogleOidcBoundaryFromEnv,
  oidcOptions:{
    onVerified:async verified=>{
      const subject=captureOidcSubject(verified),audiences=Array.isArray(verified.aud)?verified.aud:[verified.aud];
      return Response.json(Object.freeze({
        ...subject,
        audience_count:audiences.length,
        azp_present:verified.azp!==null,
        azp_matches_client:verified.azp===null||verified.azp===GOOGLE_CLIENT_ID,
      }),{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
    },
  },
});
