# W1-7 D3 A7/A8 final control mapping

## Scope and disposition

This artifact supersedes, without modifying, `artifacts/agent-b/w1-7-d3-a7-a8-control-mapping.md`. It records the accepted state through handoff `01a02bf1-708c-7ffb-94c1-4fdc8ee3caa7`, ADR 0016, ADR 0017, migration 0015, and the M3/M10/M6 result artifact. It adds no implementation, fixture, migration, mutation, simulator, or test execution. It does **not** claim A7 or A8; disposition remains with agent-a.

## A8 mapping

| Control | Enforcement and committed observation | Discrimination or structural status | Final status |
|---|---|---|---|
| M1 | Caller reference input is not a mint parameter; the database generates a canonical UUIDv7 reference. | `D3_A8_M1_CALLER_REFERENCE` passes the caller value through the maintenance-only forced-reference path and makes the fixture fail. | Discriminating. |
| M2 | The verified session principal is bound by D2; tenant/project derive from its trusted membership. | `D2_SUBSTITUTION` honors a caller principal and visibly lands in the foreign tenant. | Discriminating under ADR 0015's trusted-session precondition. |
| M3 | Migration 0015 returns a membership only when exactly one exists; a same-tenant second membership produces `TENANT_PROJECT_REFUSED` and no landing, while the single-membership positive mints normally. | `D3_A8_M3_MEMBERSHIP_AMBIGUITY` restores lowest-UUID selection; the forbidden mint lands in synthetic project `02000000-0000-0000-0000-0000000000ff`. | **Discriminating.** |
| M4 | Expired founder authority returns `MINT_AUTHORITY_REFUSED` with 0/0/0 residue. | `D3_A8_M4_EXPIRED_AUTHORITY` removes the database-clock expiry comparison and the forbidden mint commits. | Discriminating. |
| M5 | Revoked founder authority returns `MINT_AUTHORITY_REFUSED` with 0/0/0 residue. | `D3_A8_M5_REVOKED_AUTHORITY` removes the revocation predicate and the forbidden mint commits. | Discriminating. |
| M6 | ADR 0016: no mint in the shipped shape is backed by a pre-existing custody row, so the negative attempt's precondition cannot arise. The lifecycle fixture observes `old=null replacement=resolved distinct=true` after lawful revocation and rotation. | No mutation and not included in `executed=`. If a future chained/derived mint lets one custody row back another, M6 becomes live and needs a guard. | **Inapplicable, not satisfied; individually justified structural bound.** |
| M7 | Required namespace/class/model scope must appear exactly in the live authority grant; excess scope is refused, not narrowed. | D1 `G3` removes the exact scope predicate and the forbidden mint succeeds. | Discriminating. |
| M8 — namespace half | The credential custody boundary refuses `shape` and `installation`; closed enum prevents a fourth namespace. | D1 `G4` removes the namespace guard and both forbidden namespaces mint. | **Discriminating.** |
| M8 — identity half | ADR 0017: the mint receives a principal but no actor context; `minted_by_actor_id` remains unwritten. General application identity is bounded by ACL, database role by `SESSION_ROLE_INVALID`, and providers/plans/callers do not reach the database, but an agent-backed principal is not distinguished from the custody service. | No actor-bound mutation is possible at this boundary today. Configuration that withholds authority is not an enforced control. Ownership is the session-binding layer. | **Open; not structurally bounded.** |
| M9 | Primary-key collision maps deterministically to `REFERENCE_COLLISION`; the collision fixture observes the named SQLSTATE/outcome. | The committed differential drops the pkey, admits duplicate references, cleans the duplicate, and restores the pkey. | Discriminating inside `db:test`; not part of harness `executed=`. |
| M10 | A real two-connection overlap produces one winner, one `CUSTODY_IDENTITY_ACTIVE` loser, and custody/reference 1/1. | `D3_A8_M10_ACTIVE_RACE` drops only `custody_single_active`; the identical overlap yields two winners and 2/2 state. | **Discriminating.** |
| M11 | Fault after custody-row insert produces `D1F_FAULT_AFTER_CUSTODY_ROW` and zero custody/reference/orphan-audit residue. | Removing the injected fault completes normally; PostgreSQL implicit transaction abort is the atomicity boundary, and manufacturing residue with a savepoint would test a different contract. | **Individually justified structural bound.** |
| M12 | Fault after reference bind produces `D1F_FAULT_AFTER_REFERENCE_BIND` and zero custody/reference/orphan-audit residue. | Same PostgreSQL implicit-abort bound as M11; fault removal is structurally non-discriminating. | **Individually justified structural bound.** |
| M13 | Revision-8/digest-bound class gate refuses failed, absent, stale, or mismatched gates. | `D3_A8_M13_CLASS_GATE` removes the exact gate guard after supplying the otherwise masking scope; the forbidden mint succeeds. | Discriminating. |
| MP | Fully authorized mint commits one linked custody row, reference, and audit record; the returned reference resolves only for its bound tenant/project/principal. | `D3_ATOMIC_ROWS` rolls back the adapter commit; `D3_RESOLUTION_ISOLATION` weakens both isolation layers and exposes a foreign resolution. | Discriminating across committed mint and resolution fixtures. |

### A8 state in full

- Discriminating: M1, M2, M3, M4, M5, M7, M8 namespace half, M9, M10, M13, MP.
- Individually justified structural bounds: M6 is inapplicable; M11 and M12 are bounded by PostgreSQL implicit abort.
- Open: **M8 identity half only**.

## A7 mapping

| Clause | Committed evidence | Mutation status |
|---|---|---|
| custody model declared per inventory row | Class 3.3 stores Model B and refuses Model A; the class-mapping FK independently rejects unmapped custody. | `D3_AUTH_REFUSALS` and D1 `G2` separately defend the function and storage layers. |
| resolving service | Live reference resolves; unknown, malformed, foreign and revoked references return nondisclosing null. | `D3_RESOLUTION_ISOLATION` shows each layer alone remains protective and weakening both exposes `foreign=resolved`. |
| tenant binding | D2 and the durable atomic observation store the verified principal's derived tenant, not caller state. | `D2_SUBSTITUTION` visibly lands under the substituted principal's foreign tenant. |
| revocation atomicity | Custody/reference/audit share the database clock, injected failure leaves 0/0/0, resolution refuses immediately, and revocation is irreversible. | `D3_REVOCATION_ATOMICITY` skips reference invalidation and exposes divergent state. |

A7's four clauses remain evidenced. It stays open with A8 under agent-a's recorded disposition because they share the durable boundary.

## Closing condition

ADR 0017 consequence 3, verbatim:

> **The closing condition is explicit.** A8 closes when the session-binding layer binds an actor alongside the principal, the mint refuses a non-custody actor kind or trust class, `minted_by_actor_id` is written and checked rather than left null, and a mutation removing that check makes an agent-backed mint succeed observably.

## Accounting and accepted verification baseline

This record-only slice executed no new mutation and introduced no simulator. The accepted harness total remains `executed=26`; M6 lifecycle evidence and M9's in-suite differential are not counted in that number. The no-op negative remains separate.

Agent-a independently reproduced the bound baseline before dispatching this update:

- `npm test`: exit 0; 235 passed, 0 failed, 0 skipped.
- `npm run db:test`: exit 0; database controls 83, D2 live 7/7, W1-7 live 13/13, mutation harness `executed=26`.
- `bash scripts/run-d1-mutation-harness --negative`: exit 1 as required.
- `npm run kms:test`: exit 0; live W1-7 1/1 with `signer=live-vault`.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Cleanup measured by agent-a: compose containers 0 and compose volumes 0.

For this record-only slice, `npm run proof:verify` exited 0 with 197 events across 29 threads before publication. Migrations 0001 through 0015, production packages, revision 8, seeds, prior events and historical artifacts are unchanged.
