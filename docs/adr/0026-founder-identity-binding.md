# ADR 0026: the OIDC verifier and the founder identity binder are separate; the binding is a registry lookup, never a derivation

Status: accepted in part, 2026-08-25. Author: agent-a. **One question is deferred to DeVere and is marked as such.**
Context: thread `wizard-w1-1-scope`, agent-b's finding `01a0367c-fd47-744b-8158-233b5c9d1ecc`, artifact `artifacts/agent-b/w1-1-oidc-principal-binding-finding.md`. Related: ADR 0016, ADR 0018, ADR 0020, W1-1 criterion 1, the trusted-session caveat on A6/A7/A8.

## Context

agent-b was dispatched to build a synthetic OIDC verifier and returned a reading instead, on the clause that required one if the token-to-`principal_id` binding was underdetermined. **It is underdetermined, and every claim was verified against source.**

- `SetupSessionManager.start` accepts an authenticator result **only** when it contains exactly one string field, `principal_id`. Verified issuer and subject cannot cross that interface.
- `principals` scopes external identity **per tenant**: `UNIQUE NULLS NOT DISTINCT (tenant_id, external_issuer, external_subject)`.
- `founder_authorities` is `principal_id uuid PRIMARY KEY` — **no external identity column at all**.
- `bootstrap_workspace` writes the synthetic pair `('bootstrap', p_principal_id::text)` and never records the verified OIDC identity.
- **No global issuer/subject resolver exists anywhere in `migrations/`.**

Founder authentication happens **before a tenant exists**, so the one place external identity is stored is the one place that cannot yet be reached. **This is the root of the trusted-session caveat carried on A6, A7 and A8**: the "authenticated founder" fact is injected today, and nothing binds it to a verified external identity.

## Decision 1: the verifier and the binder are separate components

**The cryptographic verifier never returns a `principal_id`.** It returns verified claims, or it refuses. A separate binder maps verified claims to an internal principal, and **only the binder's output crosses the manager's authenticator interface**.

This preserves the accepted identity-surface control unchanged, and it **unblocks the entire cryptographic slice immediately**: signature verification, key rotation, algorithm confusion, issuer, audience, expiry and nonce are all provable against synthetic fixtures without knowing what principal the claims eventually resolve to. agent-b's finding treats the crypto slice as blocked on the mapping; **it is not, once the seam is placed here.**

## Decision 2: the binding is a lookup in a trusted registry, never a derivation

agent-b's rejections 1 and 2 are adopted. An OIDC `sub` is an issuer-scoped opaque string and is not an EngramPort principal, and returning it would discard the issuer half of the identity. A UUID derived from issuer and subject is refused because **this repository defines no namespace, canonicalisation, collision policy, migration rule or recovery rule for such a derivation** — and a derivation with no recovery rule is unfixable once wrong.

## Decision 3: shape of the pre-bootstrap registry

A new forward-only relation binds verified `(issuer, subject)` to `founder_authorities.principal_id`, **globally unique on `(issuer, subject)`** precisely because no tenant exists to scope it. It is populated out of band, **never writable by the authenticating path**, with forced RLS and reachable only through a `SECURITY DEFINER` resolver on the `0016`/`0018`/`0019` pattern.

**The caller can never assert the internal id.** The resolver ignores any caller-supplied principal id, exactly as `create_setup_session_delegation` ignores `p_asserted_founder_principal_id` and `create_invocation_grant` ignores `p_asserted_granted_by_principal_id`. That pattern is already accepted twice and is reused rather than reinvented.

## Decision 4: four distinct named refusals, all failing closed

`FOUNDER_BINDING_ABSENT`, `FOUNDER_BINDING_AMBIGUOUS`, `FOUNDER_BINDING_DISABLED`, `FOUNDER_BINDING_CONFLICT`. **Ambiguity fails closed**, following ADR 0016's disposition of ambiguous membership. Each needs a paired positive and its own discriminating mutation; none may be folded into another, for the reason ADR 0025 refused to fold `RETENTION_EXCEEDED`.

## Deferred to DeVere, because it is a product decision and not an engineering one

**May one external identity found more than one tenant, and if so does it receive one principal id or distinct tenant-local principal ids?**

This is not a technical detail. It decides whether EngramPort founder identity is global or per-tenant, which is the same product-versus-client structural question the estate is organised around. Both answers are implementable and they produce different registries, different uniqueness, and different behaviour when a founder returns to create a second workspace. **agent-a is not choosing it.**

**Also for DeVere**: carrying the verified issuer and subject into the tenant-scoped `principals` row at bootstrap **changes `bootstrap_workspace`, an accepted function**. That is flagged rather than done.

## Consequences

1. **The cryptographic slice is dispatched now** and is not blocked by any of the above.
2. **The binder is blocked** on the deferred question, and W1-1 criterion 1 stays open regardless, since its real half needs an identity provider DeVere has not authorised.
3. **No accepted control changes** and `executed=` does not move on this ADR.
4. The trusted-session caveat on A6, A7 and A8 is **unchanged**; this ADR explains its root rather than discharging it.
