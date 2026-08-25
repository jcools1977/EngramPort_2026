# ADR 0033: the real Google provider composition is authorized, bounded to the loopback redirect

Status: accepted, 2026-08-25. **Decided by DeVere.** Recorded by agent-a.
Narrows the standing synthetic-only constraint for one named scope. Related: ADR 0029, ADR 0030, ADR 0031, ADR 0032, F73, F80, F83, F84, F87.

## What is authorized

**Real OIDC discovery, JWKS retrieval, token exchange and ID-token verification against Google**, using the client registered in F83 and the secret referenced in F84.

This is the first authorization in this project to permit **a real provider, a real credential and real network egress**. The standing rule — *synthetic principals, synthetic keys, local containers only* — is **narrowed for this scope and remains in force everywhere else.**

## What is not authorized, and the boundaries are the point

1. **Google only, this client only.** No other issuer, no second client, no broker.
2. **The loopback redirect only.** `http://localhost:8787/auth/callback`, which Google permits for development. **Production deployment — the `app.engramport.com` Custom Domain, `wrangler secret put`, and any Cloudflare API call — is a separate authorization and is not granted here.**
3. **Custody is unchanged.** ADR 0031 as amended by ADR 0032 governs. **The secret must not reach disk, a `.env`, a `.dev.vars`, a `--secrets-file`, shell history, an artifact, a log or a diagnostic.**
4. **No retention.** The ID token, any access token and the full claim set are non-retained, on the boundary already proven in `oidc-verifier.mjs` and extended in F87.
5. **`openid` scope only**, per ADR 0029. No `email`, no `profile`, no `offline_access`, no refresh token.

## How the secret reaches a local run without touching disk

An environment file containing **`op://` references rather than values** is not a secret and may exist in the repository. `op run` resolves them at launch, so the plaintext exists only in the launched process:

```
op run --env-file=./oidc.env -- npx wrangler dev
```

**This satisfies ADR 0031's intent for a local run**: the value travels 1Password → process memory, never a file. **Setting the secret in a shell variable first is refused**, because it enters shell history and the process table.

## What becomes provable, and what still does not

**Newly provable**: real discovery and its pinning; **F80's authorization-endpoint defect, now testable against Google's published document rather than a convention**; real JWKS retrieval and key rotation against Google's actual keys; real token exchange; and **F73's undispositioned `azp` question, now decidable against tokens Google actually issues** rather than by speculation.

**The `sub` capture becomes possible and is the point of this authorization.** ADR 0030 requires the subject come from a token issued to **this** client; that is now available.

**Still not provable, and this does not change**: that the provider's enrollment judgement is sound. **F73's conclusion stands — criterion 1's closure will be a tested technical chain plus a named operational trust statement, not a claim that authentication became trust-free.** F74 records the further narrowing: because DeVere administers the Workspace and is also the founder, the provider's judgement and EngramPort's registration partially collapse into one person.

## Consequences

1. **Criterion 1 becomes closable** once the chain runs and the subject is enrolled. It is not closed by this ADR.
2. **The trusted-session caveat on A6, A7 and A8 gains a path to discharge**, which it has not had at any point in this project's history.
3. **Every accepted synthetic control keeps running unchanged.** The synthetic verifier, its ten mutations and the seven Durable Object controls are not re-pointed at Google; **a real-provider control is additional evidence, never a replacement.**
4. **`executed=` moves only on observed execution**, and no real-provider observation may be counted as a local control.
