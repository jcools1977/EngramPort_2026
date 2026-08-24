# W1-7 D4 custody-minter identity — observed results

## Scope and boundary

D4 implements ADR 0018 only. It narrows which identity may mint a credential given a trusted privileged database session; it does not make `app.session_id` or `app.principal_id` unforgeable and does not discharge ADR 0015. ADR 0016's project-context deferral remains open: ambiguous principal membership still refuses, and session project state is not used to select authority. Delegation revocation is row removal because `actor_delegations` has no `revoked_at` column.

All fixtures use synthetic principals, actors, sessions, locators, and local containers. Revision 8 and its digest-pinned artifacts were not modified. The two newly declared simulators are the synthetic trusted custody services/sessions in `deploy/seed.sql` and the isolated D4 M8 kind/trust-removal mutation in `scripts/run-d1-mutation-harness`.

## Enforcement observed

- Paired positive: `service` / `trusted_service`, active session, exact live delegation, matching tenant/project => mint succeeded and `minted_by_actor_id=13000000-0000-0000-0000-000000000008`.
- Absent and ended sessions => `MINT_SESSION_REFUSED`.
- `agent` at all six trust levels => 6/6 `MINT_ACTOR_REFUSED`.
- `service` at all five trust levels other than `trusted_service` => 5/5 `MINT_ACTOR_REFUSED`, including `system`.
- Disabled actor => `MINT_ACTOR_REFUSED`.
- Missing exact delegation and expired exact delegation => 2/2 `MINT_ACTOR_DELEGATION_REFUSED`.
- Session project mismatch => `MINT_SESSION_REFUSED` at the forced-RLS lookup boundary.
- Caller `actorId`, `sessionId`, and `principalId` substitutions remain ignored; the verified session supplies both bound values.
- Discriminating M8 mutation removed only the kind/trust comparison. Baseline agent-backed mint refused (exit 1); mutated mint succeeded (exit 0) and stored forbidden seeded agent `13000000-0000-0000-0000-000000000001` in `minted_by_actor_id` while derivation, exact delegation, context checks, and actor recording remained active.

## Before/after table — all 32 pre-D4 source occurrences

The `occurrences` column counts literal pre-D4 `mint_custody_reference` source occurrences; the rows sum to 32. “Same” means the observed accepted outcome did not move after D4.

| Source / fixture | Occurrences | Before | After |
|---|---:|---|---|
| `packages/git-adapter/src/d2-session-binding.mjs` mint path | 1 | verified principal mint / named refusal | Same; verified session id also bound |
| `scripts/run-db-tests` D1F race A/B | 2 | exactly one winner; loser `CUSTODY_IDENTITY_ACTIVE` | Same |
| `tests/failure/d1-behavioural.sql` G3/G4 | 2 | `SCOPE_EXCEEDED`; `NAMESPACE_REFUSED` | Same |
| `tests/failure/d1-mutations.txt` G3/G4 definitions and checks | 4 | each guard-removal discriminated | Same |
| `tests/failure/d1-regression.sql` ACL catalog reference | 1 | app execute denied | Same |
| `tests/failure/d1f-collision.sql` natural UUIDv7 | 1 | success | Same |
| `tests/failure/d1f-collision.sql` model-A positive | 1 | success | Same |
| `tests/failure/d1f-collision.sql` forced reference collision | 1 | `REFERENCE_COLLISION` | Same |
| `tests/failure/d1f-collision.sql` active identity collision | 1 | `CUSTODY_IDENTITY_ACTIVE` | Same |
| `tests/failure/d1f-collision.sql` unknown unique violation | 1 | original `23505` re-raised | Same |
| `tests/failure/d1f-collision.sql` dropped reference PK | 1 | duplicate accepted under mutation | Same |
| `tests/failure/d1f-controls.sql` unknown stage | 1 | `D1F_STAGE_UNKNOWN` | Same |
| `tests/failure/d1f-controls.sql` after-custody fault | 1 | `D1F_FAULT_AFTER_CUSTODY_ROW`, zero residue | Same |
| `tests/failure/d1f-controls.sql` after-reference fault | 1 | `D1F_FAULT_AFTER_REFERENCE_BIND`, zero residue | Same |
| `tests/failure/d1f-postgres-inert.sql` | 1 | postgres stage setting inert; mint succeeds | Same |
| `tests/failure/m13-class-gate.sql` positive | 1 | success | Same |
| `tests/failure/m13-class-gate.sql` failed class | 1 | `CLASS_GATE_NOT_PASSED` | Same |
| `tests/failure/m13-class-gate.sql` authority ordering | 1 | `MINT_AUTHORITY_REFUSED` | Same |
| `tests/wizard-w1-7.test.mjs` M10 race | 1 | one winner / one `CUSTODY_IDENTITY_ACTIVE` | Same |
| mutation harness caller-reference source transform | 1 | mutation discriminated | Same |
| mutation harness M4 expired authority mutate/check | 2 | mutation discriminated | Same |
| mutation harness M5 revoked authority mutate/check | 2 | mutation discriminated | Same |
| mutation harness M13 class-gate mutate/check | 2 | mutation discriminated | Same |

Total: **32/32 source occurrences covered**. All normal accepted control outcomes stayed unchanged.

## Returned finding: one old mutation simulator is masked

The D3 A8 M3 lowest-membership mutation's normal baseline remains exactly `TENANT_PROJECT_REFUSED`, but its mutated forbidden-mint outcome moved: D4's independent session/actor project comparison now refuses before a row can land. Observed harness line:

`D3_A8_M3_MEMBERSHIP_AMBIGUITY baseline=0 applied=t after=1 forbidden=f masked_by_d4=t restored=0`

This is returned rather than silently co-mutating or weakening D4. The harness therefore reports 26 observed, unmasked discriminating mutations: one new D4 M8 mutation replaced one newly masked D3 M3 simulator in the executed count. The no-op negative remains separate.

## Verification

| Command / suite | Exit | Observed result |
|---|---:|---|
| `npm test` | 0 | full repository suite and production build passed; proof sub-suite 34/34, D2 unit 2/2, W1-6 19/19, W1-7 canary/unit 4/4 |
| `npm run db:test` | 0 | D2 live 7/7; W1-7 live 13/13; D4 live 4/4; all prior SQL/database controls completed |
| `bash scripts/run-d1-mutation-harness` | 0 | `executed=26`, `masked_by_d4=1`; D4 M8 baseline 1, mutation 0, forbidden actor recorded |
| `npm run proof:verify` before work | 0 | 201 events / 29 threads / 2 actors |

The canary measured cleanup deltas `containers_delta=0 volumes_delta=0 temp_paths_delta=0`. The database runner and mutation harness also completed their cleanup traps with exit 0.
