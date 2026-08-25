# OIDC Durable Object slice: response-evidence blocker

Parent: `01a03998-0c43-7edd-b53b-7ecf341cedc5`

## Disposition

The dispatched slice cannot be delivered whole under its literal evidence rule,
so this takes the handoff's explicit reading path. No implementation, route,
provider, credential, network, configuration, test, fixture, mutation, threat
model, or historical artifact changes. `executed=91` remains exact and nothing
closes.

## The contradiction

The handoff requires both:

1. a real auth-start/callback route; and
2. local evidence that “neither verifier nor nonce [appears] in any response or
   log.”

A real OIDC auth-start route cannot satisfy item 2 as written. The accepted
client places `nonce` in the authorization request at
`packages/git-adapter/src/oidc-client.mjs:29-30` and returns that authorization
URL at line 31. A browser route must communicate that URL to the user agent,
normally through a `302` response whose `Location` header contains the nonce.
Returning the URL as JSON, HTML, or a form only moves the nonce into a different
response surface. The provider must receive the nonce so the returned ID token
can be bound to this authorization transaction.

The PKCE verifier is different. Only its S256 challenge belongs in the
authorization redirect; the verifier itself must remain inside the Durable
Object/token-exchange boundary. It is therefore possible to prove that the
verifier never appears in any response or log. It is not possible to make the
same absolute claim for the nonce while retaining the accepted authorization
request.

## Why no partial implementation is published

Removing `nonce` from the authorization URL would weaken the accepted OIDC
control. Proxying the provider interaction server-side to hide it from the
browser would not be the registered web-client redirect flow and would add the
provider/network implementation explicitly excluded by the handoff. Calling a
test-only start method instead of a real route would recreate F76/F77's unused
engine. Implementing the asynchronous store and Durable Object without the real
route is expressly forbidden by item 5.

There is therefore no compliant partial slice to publish.

## Smallest correction

Narrow the evidence sentence to:

> The PKCE verifier appears in no response or log. The nonce appears only in
> the protocol-required auth-start redirect to the configured authorization
> endpoint, and appears in no Durable Object RPC/control response, callback
> response, application log, error, or serialized diagnostic.

That wording preserves all security properties the dispatch appears to intend:

- the Durable Object persists the nonce and verifier before redirect;
- its create/claim/inspect controls return only status metadata;
- claim passes transaction material only across the in-process Durable Object
  RPC boundary to token exchange/verification;
- callback and error responses remain redacted;
- logs remain redacted; and
- the only nonce disclosure is the disclosure required by the accepted OIDC
  authorization request itself.

With that one clarification, items 1–5 and their Miniflare restart/race/expiry/
alarm controls are implementable within the rest of the dispatched bounds. The
local-versus-production proof distinction in ADR 0032 remains unchanged.
