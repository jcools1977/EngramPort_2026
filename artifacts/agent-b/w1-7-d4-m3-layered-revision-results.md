# W1-7 D4 bounded revision — M3 two-layer mutation results

## Change boundary

Only `scripts/run-d1-mutation-harness` changed. No adapter, migration, seed, custody function, D4 fixture, M8 mutation, revision-8 document, digest-pinned artifact, or historical event changed.

The M3 simulator is now one two-part control, on the same footing as D3 resolution isolation and D2 joint leakage:

1. membership derivation must refuse ambiguity rather than select the lowest UUID; and
2. D4 must require the resolved minter actor's tenant/project to equal the uniquely derived membership.

The harness measures each layer alone before weakening both. Synthetic principals, actors, sessions, projects, locators, and local containers only were used.

## Observed M3 outcomes

| State | Harness result | Mint outcome | Landed rows |
|---|---:|---|---:|
| Shipped baseline: ambiguous membership, D4 intact | `baseline=0` | `TENANT_PROJECT_REFUSED` | 0 |
| Lowest-UUID derivation restored, D4 intact | `derivation_only=0` | `MINT_ACTOR_CONTEXT_REFUSED` | 0 |
| Ambiguity derivation intact, D4 actor-to-derived-context comparison removed | `context_only=0` | `TENANT_PROJECT_REFUSED` | 0 |
| Lowest-UUID restored and D4 actor-to-derived-context comparison removed | `combined=1`, `forbidden=t` | mint accepted by mutated function | 1 in unauthorized project `02000000-0000-0000-0000-0000000000ff` |
| Shipped code restored | `restored=0` | `TENANT_PROJECT_REFUSED` | 0 |

Exact evidence line:

`D3_A8_M3_MEMBERSHIP_AMBIGUITY baseline=0 derivation_only=0 context_only=0 applied=t combined=1 forbidden=t restored=0`

M3 is back in the observed executed count. `masked_by_d4` was removed because no mutation remains masked.

## Mutation and suite results

| Command / suite | Exit | Observed total or outcome |
|---|---:|---|
| `bash scripts/run-d1-mutation-harness` | 0 | all controls discriminate; `executed=27` |
| `bash scripts/run-d1-mutation-harness --negative` | 1 | `NOOP baseline=0 applied=f after=0 restored=0`; false discrimination rejected |
| `npm run db:test` | 0 | prior SQL/database controls completed; D2 live 7/7, W1-7 live 13/13, D4 live 4/4, M3 layered line above, M8 baseline 1 / mutation 0 / forbidden actor recorded |
| `npm test` | 0 | proof 34/34, D2 unit 2/2, W1-6 19/19, W1-7 unit/canary 4/4, and all remaining repository suites/build completed with zero failures or skips in their per-suite reports |
| `npm run kms:test` | 0 | live Vault differential 1/1; nonexportable-key refusal observed |
| `npm run lint` | 0 | ESLint completed without findings |

Canary cleanup was measured twice in the final verification paths as `containers_delta=0 volumes_delta=0 temp_paths_delta=0`, once with the local stub and once with live local Vault. The database and mutation runners completed their container/volume cleanup traps.

## Accepted-control change declaration

One already-accepted simulator changed, exactly as authorized: `D3_A8_M3_MEMBERSHIP_AMBIGUITY` now weakens both independent layers for the combined mutation and records both single-layer results. Its shipped baseline and restored outcomes remain unchanged. No other accepted control changed.
