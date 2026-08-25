# ADR 0027: one external identity may found many tenants, each with a distinct tenant-local principal

Status: accepted, 2026-08-25. **Decided by DeVere.** Recorded and verified by agent-a.
Supersedes: ADR 0026's single-level registry. Everything else in ADR 0026 stands.
Context: thread `founder-tenancy-model`. DeVere and agent-b reached this independently; **agent-b's analysis is not yet in the event log**, so this ADR records DeVere's decision and agent-a's verification, not agent-b's reasoning.

## Decision

**EngramPort permits one verified external identity to found multiple tenants through separately authorized founding ceremonies. Each tenant receives a distinct tenant-local principal. External identity is global authentication metadata; principal identity remains tenant-local authorization and audit state.**

Creating another tenant is an explicit operation backed by a fresh **one-time founding authorization**. **Ordinary sign-in never creates a tenant.**

Rejected: **one global `principal_id`**, which conflicts with the tenant-scoped schema and RLS model and creates cross-tenant authorization and revocation risk. Rejected as platform policy: **one tenant per external identity**, which is easy now but excludes consultants, agencies, and anyone holding personal and business workspaces — a deployment may still impose that limit locally.

## Verified against the accepted schema before recording

- **No change is required to `bootstrap_establishments`.** Its `principal_id uuid PRIMARY KEY REFERENCES founder_authorities(principal_id)` is what makes one-principal-one-tenant structural, and the decision keeps that intact: each founding reserves a **fresh** principal, so each founding is a new primary-key row. The constraint stops being a limit on people and becomes a limit on ceremonies, which is what it should always have meant.
- **`principals`' `UNIQUE NULLS NOT DISTINCT (tenant_id, external_issuer, external_subject)` is exactly the right constraint and becomes load-bearing.** Different tenants give different keys, so the same identity may appear in many; the same tenant twice is refused. **The schema already anticipated this decision.**
- **`bootstrap_workspace` must change.** It writes `('human','bootstrap',p_principal_id::text)` and never records the verified identity. **This is a change to an accepted function, and DeVere's adoption of this architecture is its authorization**, recorded here rather than assumed later.
- **Ambiguity must fail closed using the existing pattern**, not a new one: `derive_mint_membership` already returns nothing unless `membership_count=1`.

## Required structure

**Two levels, replacing ADR 0026's single relation.**

1. **Global external identity** — unique on exact `(issuer, subject)`, carrying an internal `identity_id` that is **never exposed to tenants, events, or authorization code**. It provides authentication and emergency global disable.
2. **Tenant-local binding** — maps `identity_id + tenant_id` to exactly one tenant-local `principal_id`. **Never select the "first" matching tenant; missing context or ambiguity fails closed.**

Before a tenant exists, a one-time `founding_authorization` reserves the future `principal_id`. The binder receives verified claims plus that trusted authorization id — **never a caller-supplied principal or tenant** — and returns exactly the reserved `principal_id`.

**Bootstrap is one transaction**: re-verify and lock identity and authorization, consume the one-time authorization, create tenant, create its reserved principal, persist the tenant-local binding, create project and owner membership, create the setup delegation, and roll back entirely on any conflict.

**Only verified `iss` and `sub` enter the tenant's `principals` row.** No raw token, audience, expiry, nonce, signature or JWKS material, no email, no mutable profile claim. `display_name` stays non-authoritative.

**Disable and recovery.** Tenant offboarding disables only that tenant's binding and principal and revokes its sessions, grants and delegation. Global identity disable is reserved for issuer or account compromise and blocks every tenant. Rebinding is per tenant and **preserves the existing tenant-local `principal_id` so audit history survives**. Never auto-link or recover by email or display name.

## Three points agent-a is adding, having reviewed rather than ratified

**1. The stated containment and the global disable are in tension, and the resolution must be written down.** `identity_id` is to be invisible to authorization code, yet global disable must be enforced somewhere. **The check belongs in the binder, before any `principal_id` is returned** — so tenant-scoped authorization never sees `identity_id` and never needs to. Both properties then hold. Left unstated, an implementer would resolve this by leaking `identity_id` into the authorization path.

**2. The one-time founding authorization is a new root of trust and needs its own threat-model row.** Who issues it, how it is delivered, its lifetime, and what an attacker gains by obtaining one — which is the ability to found a tenant bound to *their own* verified identity, probably acceptable but not currently written anywhere. **Its one-time nature must be enforced in the datastore, not the application.**

**3. Cross-tenant correlation of one human now requires `identity_id`, which is deliberately hidden.** That is the intended trade, recorded here as an accepted consequence **so that nobody later "fixes" it by exposing `identity_id`** and quietly undoes the isolation this decision exists to protect.

## Consequences

1. **ADR 0026's registry is superseded**; its verifier/binder split, its refusal of derivation, and its four named refusals all stand.
2. **C17 stays held** and the trusted-session caveat on A6, A7 and A8 is undischarged until the binder exists and a real identity provider is authorized.
3. **`executed=` does not move on this ADR**, which decides and records only.
4. The `founder-tenancy-model` thread **still awaits agent-b's reply**; this ADR does not close it.
