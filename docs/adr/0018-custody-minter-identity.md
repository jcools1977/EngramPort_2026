# ADR 0018: the custody minter is a delegated trusted service, enforced in the database

Status: accepted, 2026-08-24. Author: agent-a.
Context: thread `wizard-w1-7-design`, agent-b's D4 pre-implementation finding `01a033d3-264f-71b9-946a-154201bce885`. Related: `docs/security/setup-credential-threat-model.md` §5A control M8, `docs/design/w1-7-durable-custody.md` §4, ADR 0015, ADR 0016, ADR 0017.

## Context

§5A authorizes only "the custody service" to mint `credential` and forbids providers, plans, callers, agents, runners and the general application identity. **The schema contains no `custody_service` kind.** Verified: `actor_kind` is `('human','agent','service')`, `trust_level` is `('system','verified_human','trusted_service','trusted_agent','untrusted_agent','imported')`, `agent_sessions` binds one actor to a tenant and project and **carries no principal**, and `actor_delegations(actor_id, principal_id, scopes, expires_at)` binds an actor to a principal with scopes.

So the minter's identity has to be **composed** from trusted-store facts. agent-b returned that reading before writing code, for the third time in this thread, and it is the right instinct.

**The seed makes the risk concrete rather than hypothetical.** All three seeded actors are `kind='agent'`, `trust='trusted_agent'`, and `agent-a` is delegated to `11000000-…-0001` — the exact principal every custody fixture mints as. The system's minting principal is, in the seed, agent-delegated. M8 is not a theoretical control here.

## Decision

**A `credential` mint is authorized only when every one of these trusted-store facts holds inside the mint transaction:**

1. The verified session supplies a **session id, never an actor id**. The adapter binds it transaction-locally beside `app.principal_id`. A caller-supplied `actorId`, `sessionId` or `principalId` is ignored, exactly as `principalId` already is.
2. A live `agent_sessions` row exists for that session id with `ended_at IS NULL`, resolving exactly one actor.
3. That actor is active — `disabled_at IS NULL` — with `kind='service'` **and** `trust='trusted_service'`.
4. The actor's tenant and project equal the session's tenant and project **and** the unique membership derived for the bound principal under ADR 0016.
5. A live `actor_delegations` row binds that actor to the bound principal, is unexpired against `clock_timestamp()`, and contains the **exact** required scope `custody:mint:credential:<class>:<model>`.
6. `custody_rows.minted_by_actor_id` records the actor **resolved above**, never a mint parameter.

**Why composed rather than a single label.** The kind and trust comparison rejects agents and every other actor class. The exact delegation is what distinguishes *the* custody service from *a* trusted service — without it, "trusted service" would be a label claiming a narrower identity than the comparison enforces, which is the defect ADR 0017 named. The tenant and project comparisons stop a valid session in one project authorizing custody in another.

**`trust='system'` is refused for services, deliberately.** It is broader, and it would let unrelated system actors mint credentials. A system actor that must mint can be given the service class and the delegation explicitly. **Narrowness is recoverable; breadth is not.**

**Enforced in the database function, not only the adapter.** Every other custody authority fact — tenant derivation, model derivation, scope containment, the class gate — is read inside `mint_custody_reference`, and this joins them. An adapter-only check would be bypassable by anything holding `engram_maintenance`.

**The honest limit, stated so it is not overread.** `app.session_id` is exactly as forgeable as `app.principal_id`: both are session GUCs set by the privileged role. **This does not solve what ADR 0015 deferred.** It narrows *which* identity may mint **given** a trusted session, which is what M8 asks and no more.

**Delegation revocation is by row removal.** `actor_delegations` has no `revoked_at`; only `expires_at`. Evidence must not imply a revocation flag exists.

## Consequences

1. **The requirement is unconditional.** An optional identity check is not a check. Every `credential` mint requires a bound session.
2. **The blast radius is large and must be handled as declared work.** `mint_custody_reference` has **32 call sites** across `tests/`, `scripts/` and `packages/`, and **no fixture seeds an `agent_sessions` row today**. Every minting fixture must seed an actor, a session and a delegation. **No accepted control's observed outcome may change**: a before-and-after outcome table is required, and any control whose outcome moves is a **finding to return**, not something to fix silently.
3. **The paired positive needs a new synthetic actor**, since every seeded actor is an agent. The discriminating mutation is close to the existing seed: give the seeded `trusted_agent` the custody scope and a session, remove **only** the kind and trust refusal, and observe the agent-backed mint succeeding with the forbidden actor recorded in `minted_by_actor_id`.
4. **ADR 0016's project-context deferral is NOT discharged.** D4 makes `agent_sessions.tenant_id/project_id` reachable, and that is reported, but using the session's project to disambiguate a multi-membership principal would let session state select authority and needs its own decision. Ambiguous membership continues to refuse.
5. **A8 closes when this lands with its mutation**, and **A7 closes with it**, on the reasoning recorded in ADR 0017 and F44.
6. Nothing here changes the threat model. Revision 8 stays digest-pinned, as with ADR 0014 through 0017.
