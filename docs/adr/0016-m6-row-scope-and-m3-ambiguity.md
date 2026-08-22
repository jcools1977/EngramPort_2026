# ADR 0016: M6 is row-scoped and inapplicable to the shipped mint; ambiguous membership must fail closed

Status: accepted, 2026-08-22. Author: agent-a.
Context: thread `wizard-w1-7-design`, agent-b's pre-implementation finding `01a02b42-71f4-7d72-ac5b-3e7cdde56008`. Related: `docs/design/w1-7-durable-custody.md` §4 and §5, `docs/security/setup-credential-threat-model.md` §5A controls M3 and M6 and row G14, ADR 0015.

## Context

The A7/A8 control mapping left six of fourteen §5A controls without discriminating evidence. Two of them, M6 and M3, could not be implemented without first settling what the contract means. agent-b returned a reading rather than writing code, which is what the handoff asked for. This ADR decides both.

## Decision 1: M6 is row-scoped, and its negative is inapplicable to the shipped mint

Design §5 says a revoked custody row "refuses resolution and refuses to back any further mint. That is M6, and it is **G14's counterpart at the custody boundary**."

**G14 settles it.** Threat model row G14 reads: *"Custody row revoked while grant remains active / Refused."* G14 is an **invocation** comparison. Its custody-boundary counterpart is therefore that a revoked row must not authorize **use** — not that a revoked row blocks a future mint for the same logical identity.

**No identity tombstone is added.** An identity-wide guard rejecting a mint whenever a revoked row exists for that tenant, project, namespace and class would:

- introduce a permanent tombstone that appears nowhere in §5A;
- break lawful rotation, which is the ordinary response to a revoked credential;
- make compromise recovery impossible for that logical identity, so the control would harm the case it exists to serve.

**M6's status is `inapplicable`, not `satisfied`.** The resolution half is enforced and evidenced: `resolve_custody_reference` excludes rows with `revoked_at IS NOT NULL`, verified live, and revocation is atomic and irreversible. The mint half has no operative referent, because **no mint in the shipped shape is backed by a pre-existing custody row** — the API accepts no prior-row input, so the attempt "mint against a revoked custody row" cannot be expressed. That is a precondition that cannot arise, and it must be recorded as such. Recording it as "satisfied" would let a later reader take M6 for a proven guard, which is the overclaiming pattern this project has refused throughout.

If a future shape lets one custody row back another mint — a chained or derived mint — M6 becomes live and needs a real guard. That is the trigger to revisit this ADR.

## Decision 2: ambiguous membership fails closed

Design §4: "Tenant and project are derived, never supplied… A caller-supplied tenant or project is refused, not overridden. That is M2 and M3." It does not say what happens when the principal has more than one eligible membership.

`derive_mint_membership` is `ORDER BY tenant_id, project_id LIMIT 1`. **Measured live**: a principal whose membership was project `12000000-…-0001` gained a second membership in the same tenant at project `02000000-…-00ff`, and the mint then landed in `02000000-…-00ff`. **Adding a membership silently moved where that principal's credentials are minted.** Nothing authorized the change; the lower UUID won.

**That is storage ordering acting as authority, and it is refused.** The rule is:

| Eligible memberships | Result |
|---|---|
| zero | `TENANT_PROJECT_REFUSED` |
| exactly one | derive it |
| more than one | `TENANT_PROJECT_REFUSED` |

A caller-supplied `tenant_id` or `project_id` stays refused and must never be used to disambiguate — permitting that would reintroduce M2 and M3 through the back door.

**The cost is accepted deliberately.** A principal legitimately belonging to two projects in one tenant cannot mint until a trusted, authenticated **project context** exists, in the same way ADR 0015 accepted that D1 begins with a trusted session principal and assigned the binding to D2. Refusing is recoverable; minting into an unauthorized project is not. **Project context is assigned to the same layer that owns principal binding**, and is out of scope for D3.

## Consequences

1. **No migration for M6.** A committed rotation-lifecycle fixture is wanted — revoke, old reference no longer resolves, mint a replacement, new reference resolves — but it is **lifecycle evidence, not a discriminating control**, and `executed=` must not increase for it. M6 is carried as `inapplicable` with the reason recorded.
2. **One forward-only migration for M3**, replacing `LIMIT 1` with uniqueness enforcement that refuses on more than one eligible membership, plus a same-tenant two-project fixture and a mutation restoring lowest-UUID selection so the forbidden mint is observable.
3. **A8 cannot reach fourteen of fourteen discriminating controls.** M6 is inapplicable; M11 and M12 are structurally bounded by PostgreSQL's implicit abort. A8's closure standard is therefore every control either discriminating **or** individually justified as structurally bounded, which is the standard already applied to the D1F reference assertions, the D2 committed-state observation and the D3 resolution-isolation layers.
4. **M8's identity half stays open and is not decided here.** Where actor trust is checked is a separate architecture decision.
5. Nothing here changes the threat model. Revision 8 stays digest-pinned; this ADR records readings the specification left implicit, as ADR 0014 and ADR 0015 did.
