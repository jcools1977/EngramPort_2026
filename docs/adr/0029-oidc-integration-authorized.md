# ADR 0029: the OIDC integration is authorized provider-neutrally; the issuer is not yet named

Status: accepted in part, 2026-08-25. **Decided by DeVere.** Recorded by agent-a. **The provider remains unnamed and criterion 1 stays open.**
Context: thread `oidc-authorization-options`. Related: ADR 0026, ADR 0027, W1-1 criterion 1, the trusted-session caveat on A6/A7/A8.

## Authorized architecture

- **One deployment-configured, explicitly allowlisted issuer and client.**
- **Authorization Code flow with PKCE S256**, exact redirect URI, `state`, and `nonce`.
- **`openid` scope only.** No `offline_access`, no refresh token, no `profile`, no `email` authority.
- **Identity based exclusively on verified `(iss, sub)`.**
- **No dynamic issuer trust and no token-supplied JWKS location.**
- **No retention** of the ID token, any access token, or full claims.
- **ADR 0027's single-use founding authorization controls tenant creation. Ordinary login cannot found a tenant.**
- **No identity broker introduced merely for portability.** Use the organization-backed provider that already owns the founder identity.

## What remains, and it is one fact

**Which provider and account is canonical.** Naming it authorizes the real issuer, client and redirect configuration and unblocks criterion 1.

## Evidence agent-a gathered on that question, by DNS only

- **`an2b.com` resolves its mail to Proton** (`mail.protonmail.ch`). **Proton is not an OIDC identity provider**, so the domain that would be the natural answer **cannot be the issuer** without standing up a separate identity tenancy.
- **`covenantsystems.ai` resolves its mail to Google** (`smtp.google.com`), so **Google Workspace is the only organization-backed OIDC issuer that exists in the estate today.**
- The founder identity in use in this repository is **`jcools1977@gmail.com`, a personal Google account.**

**Three consequences, none of which agent-a is choosing between.** Naming Google today without qualification would root a product's identity in a **personal** account, since `iss` is `https://accounts.google.com` for personal and Workspace accounts alike and only the registry binding distinguishes them. Naming `covenantsystems.ai` roots **EngramPort's** founder identity in the domain associated with **GovScout**, crossing a product boundary the estate is otherwise careful to keep. Naming `an2b.com` requires creating an identity tenancy that does not exist.

**The registry binds an exact `(iss, sub)` at registration time**, so organization-versus-personal is settled out of band rather than by a token claim — consistent with storing only `iss` and `sub` and taking no `profile` or `email` authority.

## Consequences

1. **Criterion 1 stays open** and the trusted-session caveat on A6, A7 and A8 stays undischarged.
2. **No provider is contacted and no credential exists** until the issuer is named. The synthetic verifier and the ADR 0027 registry remain the only implemented parts.
3. When the issuer is named, the client secret question becomes live and must be answered against **no secrets on disk**.
