# W1-7 D3 canary real-landing correction results

## Bound scope

Parent revision: `01a024b2-1fc1-7819-a6da-4190e8abac6b`.

Implementation commit: `4df6c178285c1e8d90e1ca8763e746f1aed724da`.

This revision corrects only the first four section-10 canary sinks and the accepted CLI empty-`--artifacts` regression. The remaining six sinks, A7, A8, B5, W1-8, W3, AEGIS, real providers and real credentials remain out of scope and unclaimed.

## Real vulnerable and protected twins

The vulnerable and protected variants now execute the same production operations from separate module graphs. Only the vulnerable graph has `detectCredential` disabled. Both are confined to `synthetic-canary-tenant` and key `synth-a`; the vulnerable path receives no signer and cannot reach the non-exportable-key path.

| Sink | production path | real observer | vulnerable | protected |
|---|---|---|---:|---:|
| event | `cli.run(append)` | written event file | dirty | refused and clean |
| artifact | `cli.run(append --artifacts)` | registered artifact file on disk | dirty | refused and clean |
| plan | `compileSetup` | returned compiled plan object | dirty | refused and clean |
| Re:PORT | `runReportIfChanged` | returned generated Re:PORT output | dirty | refused and clean |

Observed baseline:

`W1_7_CANARY vulnerable_dirty=4/4 protected_clean=4/4 signed=4/4 isolation=separate-production-module-graphs-and-landings observers=event-file,artifact-file,compiled-plan,report-output`

The protected run signs the known digest through live Vault after every detector refusal. Four Vault signatures succeeded. The vulnerable run never calls the boundary.

## Executable discrimination

The canonical scratch harness still reports `executed=17`; no new control is counted merely for being rewritten. The two canary controls are observed against the real landing observers:

- `D3_CANARY_DETECTOR`: baseline 0, mutation applied, protected landing becomes dirty `0/4` while signing remains `4/4`, failing exit 1, restore 0.
- `D3_CANARY_OBSERVER`: baseline 0, mutation applied, all four real dirty landings are suppressed to `vulnerable_dirty=0/4`, failing exit 1, restore 0. The forbidden condition is now an observer failing to report the canary present in the written event file, artifact file, compiled plan, or generated Re:PORT output.
- Separate no-op invocation: `applied=f`, forbidden behavior absent, exit 1 with `NOOP false discrimination correctly rejected`; it is not included in `executed=17`.

## Accepted code touched

`packages/git-adapter/src/cli.mjs` is accepted production code and was changed explicitly. Empty artifact entries are filtered before validation and metadata emission. The new proof regression invokes `append ... --artifacts ""`, observes exit 0, verifies the appended event, and verifies that it carries no artifacts field. This closes the `EISDIR` regression without changing non-empty artifact behavior.

## Verification

All commands were run from committed implementation `4df6c178285c1e8d90e1ca8763e746f1aed724da`.

- `npm test`: exit 0; 235 passed, 0 failed, 0 skipped across the canonical Node/site sweep.
- Per-suite Node/site totals: proof 34, D2 structural 2, W1-6 19, W1-7 structural 4, Re:PORT 54, R2 8, welcome 19, setup 22, watch 16, session 12, approval 25, dry-run 6, DB static 6, dispatch 6, rendered HTML 2.
- `npm run db:test`: exit 0; PostgreSQL 16.15, pgvector 0.8.6; database controls 83, D2 live 7/7, W1-7 live 9/9, mutation harness `executed=17`.
- `npm run kms:test`: exit 0; live W1-7 1/1, 0 skipped; four protected canary signatures plus the accepted non-exportable/export/policy differential.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0, independently rerunning the complete Node/site, database, Vault and lint composition.
- `npm run proof:verify` before publication: exit 0; 181 events, 29 threads, 2 actors.

Migrations `0001` through `0014` are byte-identical to the parent. No migration, seed, accepted historical event or historical artifact changed.

Cleanup was verified after successful, mutated and no-op-negative paths: zero task-owned containers, networks, volumes or mutation directories. Temporary repositories, module copies, event files and artifacts are removed by the fixture. The worktree was clean after the implementation commit before adding this bound artifact.

## Limitations and disposition

This evidence covers only events, artifacts, plans and Re:PORT output. Logs, process arguments, process environment, core dumps, backups and error surfaces remain unimplemented and unclaimed. D3 remains active; A7, A8 and B5 remain open. No real provider, founder, credential, key or production service was used.
