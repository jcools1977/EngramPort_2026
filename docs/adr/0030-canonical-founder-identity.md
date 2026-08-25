# ADR 0030: the canonical founder identity is `luke@covenantsystems.ai` on Google Workspace

Status: accepted, 2026-08-25. **Decided by DeVere.** Recorded by agent-a.
Completes the one open fact in ADR 0029. Related: ADR 0026, ADR 0027, ADR 0029, F73, W1-1 criterion 1.

## Decision

**Issuer**: Google, `https://accounts.google.com`. **Canonical account**: `luke@covenantsystems.ai`, an organization-backed Google Workspace identity **personally controlled by DeVere**, confirmed as his own account rather than an identity an assistant authenticates as.

This satisfies ADR 0029's rule to use the organization-backed provider that already owns the founder identity. `an2b.com` was unavailable as an issuer — its mail resolves to Proton, which is not an OIDC identity provider.

## The trap this decision must not fall into

**`iss` alone does not distinguish a Workspace account from a personal Google account.** Both present `https://accounts.google.com`. Allowlisting the issuer therefore admits **every Google account in existence**, personal ones included.

**Authority comes from the exact `(iss, sub)` enrolled in the ADR 0027 registry, never from the issuer and never from a domain claim.** The `hd` claim exists for Workspace tokens, but ADR 0029 takes no `profile` or `email` authority and stores only `iss` and `sub`, so `hd` must not be load-bearing. **Organization-versus-personal is settled at enrollment time, out of band, and nowhere else.**

## The subject is not yet known, and must not be invented

Google's `sub` for this account is an opaque identifier obtainable only from a real ID token. **No component may guess, derive, or fabricate it.** Enrollment requires one out-of-band capture of a verified token for `luke@covenantsystems.ai`, after which that exact `(iss, sub)` is registered through the trusted binder path. Until then the registry has no founder row and `resolve_founder_principal` correctly refuses with `FOUNDER_BINDING_ABSENT`.

## What this changes in F73's trust analysis, stated plainly

F73 recorded that the authentication fact rests on two operational trust roots: the provider's enrollment and recovery judgement, and EngramPort's administrative registration of the `(iss, sub)`.

**Because DeVere administers the `covenantsystems.ai` Workspace and is also the founder, those two roots partially collapse into one person.** Google enforces authentication, key management, and revocation independently — real cryptography, real rotation, real account controls — but the *enrollment judgement* about who that account belongs to is made inside DeVere's own organization.

**This is materially stronger than an injected authentication fact and materially weaker than independent third-party attestation.** Recorded so that criterion 1's eventual closure is worded against it rather than around it, per F73's governing sentence: **a tested technical chain plus a named operational trust statement.**

## Accepted coupling

`covenantsystems.ai` is the domain associated with **GovScout**, which serves five paying clients. Rooting EngramPort's founder identity there couples one product's root of trust to another product's Workspace tenancy. **DeVere chose this knowingly** with `an2b.com` unavailable and a new tenancy the only alternative.

**The mitigation already exists in ADR 0027**: rebinding is per tenant and preserves the tenant-local `principal_id`, so if the Workspace is ever restructured the founder identity can be re-enrolled **without losing audit history**.

## Now live, previously theoretical

**The client secret question.** A confidential server-side web client requires a secret. It must live in the deployment's runtime secret manager or encrypted platform configuration — **never the repository, compose file, scratchpad, artifact, or a generated environment file.** Who holds and rotates it is an open item for the client-registration slice. PKCE does not remove this: it is not evidence that a confidential client needs no credential.

## Consequences

1. **Criterion 1 remains open.** F73's six missing surfaces — auth-start and callback routes, `state`/PKCE/nonce transaction state, discovery, JWKS retrieval and lifecycle, token exchange, binder composition — are all still absent, and the ten accepted verifier mutations cover none of them.
2. **The trusted-session caveat on A6, A7 and A8 stays undischarged** until the full live chain is implemented and mutation-defended.
3. **No provider is contacted and no credential exists** until the client-registration slice is dispatched.
4. **Sequencing**: the deployment-composition control on `c17-closure-refutation` is the active item at WIP one. The OIDC client slice follows; enrollment of the verified `(iss, sub)` follows that.
5. F73's two technical findings carry forward: the **non-standard `status` label** in the JWKS fixture, and the **undispositioned `azp`** rule for multi-audience tokens.
