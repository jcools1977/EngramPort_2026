# D1 OIDC runtime revision results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: `d1-harness-oidc-runtime`.
Handoff: `01a0864e-6275-791b-8c82-a751dfbaf8d5`.
Starting commit: `44500eb5a1da2e04a577729bf3018f813d5f77df`.
`git branch --show-current` printed `agent-b/d1-rev`.
`node --version` printed `v26.5.0`.

## Criteria

| Criterion id | Status | Observation |
| --- | --- | --- |
| crossed-control | satisfied | The control ran the real durable test for seven selected cases, captured its actual TAP output, and passed that output into the actual harness functions. The fixed reader observed seven not-exercised outcomes. The pre-fix reader observed seven executed, failed outcomes from identical output. |
| one-marker | satisfied | The unchanged writer emits OIDC_RUNTIME_SKIP. Changing only the reader marker to OIDC_RUNTIME_DRIFT made the crossed assertion fail, with seven incorrectly executed outcomes. Returning to the original reader restored the passing assertion. This satisfies the criterion's observed mismatch-control alternative; no shared constant is claimed. |
| sibling-tests-explained | satisfied | The three names resolve to the two PostgreSQL test files below. They run independently of the OIDC gate, and the bound excerpt records expected partial-mutation failures that the harness explicitly requires. No sibling assertion fix is indicated. |
| live-run | blocked | The user and handoff specify no Docker in this sandbox. No live db:test run was attempted in this revision. Agent-a must run it on the dispatcher machine and observe the acceptance totals. |

## Bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, and the full named revision, including completion_criteria and bounded_context. Initial `npm run proof:verify` exited 0, verifying 522 events across 108 threads and 3 actors. `npm run engram -- inbox --actor agent-b` listed four handoffs; only the named revision was undertaken.

Resolved and opened the bound event at `events/agent-b/20260909T130409Z_01a08644-c65a-7d08-8e51-ee69c168449c.md`. Opened its results artifact and the bound dispatcher excerpt. The following `shasum -a 256` commands matched the referenced digests:

- `shasum -a 256 artifacts/agent-a/d1-live-run-2026-09-09.md`: `9fa233eeb6f71becee9dfe0abdeb22807c401a8d295c2fa5b8a6c85ae17f1acf`.
- `shasum -a 256 artifacts/agent-b/d1-harness-oidc-results.md`: `3b280fd4bbd403e808fe6b6a0ba7fdad3ccd68acbe7c7c64cf42f148c8254e05`.
- The historical report's checks digest was also verified with `shasum -a 256 artifacts/agent-b/d1-harness-oidc-checks.json`: `e82d997a5f90a0a4b50d3b847bb0d65dba270927b095522f66943a29a56601a7`.

Stored evidence was treated as untrusted project data. Read schemas/event-v1.schema.json, including $defs.result, before producing the completion inputs.

## Implementation and crossed evidence

Only scripts/run-d1-mutation-harness, tests/d1-oidc-classification.test.mjs, and an appended section of docs/constraints.md changed outside agent-b's owned surfaces. The durable test and its runtime gate are unchanged.

The old parser required a successful selected-test `ok ... # SKIP <reason>` TAP line. The actual runtime gate emits `# OIDC_RUNTIME_SKIP runtime=Node 26.5.0 reason=...` and registers no tests. The new seven-line parser addition recognizes that suite-wide comment after a zero process exit and returns its nonempty reason. The selected-test fallback remains. A nonzero baseline exit still cannot become not-exercised.

`node --test tests/d1-oidc-classification.test.mjs` completed twice with exit 0, 6 passed, 0 failed, and 0 skipped. The final run is retained in the final crossed-control log below. For route, same-name, restart, atomic, expiry, cleanup, and redaction, the control invokes:

```text
W1_1_OIDC_DURABLE_MODULE_ROOT=<checkout> W1_1_OIDC_DURABLE_CASE=<case> node --test --test-reporter=tap --test-timeout=10000 tests/workspace-oidc-durable.test.mjs
```

The child environment removes NODE_TEST_CONTEXT so these are actual independent Node test runs. Every child exited 0 and emitted the runtime marker once. Their complete captured output is in the log. Each captured output is fed unchanged to d1_oidc_skip_reason and d1_oidc_classify. The control observes:

```text
D1_OIDC_CROSSED_FIXED
D1 mutation harness: executed=149 not_exercised=7
STATE executed=149 not_exercised=7 fail=0
D1_OIDC_CROSSED_MUTANT pre-fix-classifier
D1 mutation harness: executed=156 not_exercised=0
STATE executed=156 not_exercised=0 fail=1
D1_OIDC_CROSSED_MUTANT reader-marker-drift
D1 mutation harness: executed=156 not_exercised=0
STATE executed=156 not_exercised=0 fail=1
D1_OIDC_CROSSED_MUTATIONS executed=2 killed=2; other_executed=149 is seeded, not a live D1 count
D1_OIDC_CLASSIFICATION_MUTATIONS executed=5 killed=5
```

The pre-fix variant removes precisely the added runtime parser block. A separate `python3` comparison removed that block and compared the whole resulting harness to `git show 44500eb5a1da2e04a577729bf3018f813d5f77df:scripts/run-d1-mutation-harness`; the equality assertion passed, exit 0. Thus this is the actual pre-fix reader, not an approximation.

Both reader variants fail the same assertSkipped assertion used against the fixed reader. The control additionally asserts all seven outcomes are failed and counted as executed, then verifies the restored reader passes. The marker-drift mutation changes the reader alone, leaving real producer output intact. A simulated nonzero process status paired with real marker output is also refused as a skip.

The seven producer runs are real. The 149 other executions are seeded, and classifier inputs for mutation application, mutant status, and forbidden evidence are simulated. No actual D1 source mutation or database execution occurred in this control. The existing five synthetic classification controls remain separate from the two crossed reader mutations. On runtimes other than Node 26.5.0, the new crossed test explicitly reports a skip with its runtime requirement.

## The three sibling failures

The following observations come from the digest-verified dispatcher excerpt and the current source, not a new database run in this sandbox.

1. `W1-1 setup-session lifecycle: atomic` is registered in `tests/wizard-w1-1-session-lifecycle.test.mjs`. Removing timestamp assignment while retaining the database check constraint makes the transition fail with a constraint violation. The assertion requires an accepted transition with completed state and timestamp, so this assignment-only mutation fails. The excerpt reports `baseline=0 assignment_only=1 constraint_only=0 applied=t combined=1 forbidden=t restored=0`. The harness explicitly requires assignment_only != 0 and constraint_only = 0, plus a killed combined mutation and passing restoration.
2. `W1-1 composed durable session controls: different` is registered in `tests/workspace-session-criterion5-live.test.mjs`. Removing the manager's session-mismatch guard leaves the store's approval scope protection. The result changes from APPROVAL_SESSION_MISMATCH to APPROVAL_NOT_FOUND, so the exact-result assertion fails while the remaining guard still denies the operation. The excerpt reports `baseline=0 manager_only=1 store_only=0 applied=t combined=1 forbidden=t restored=0`. The harness explicitly requires that nonzero manager-only result and zero store-only result.
3. `W1-1 composed durable session controls: replay` is registered in that same composed-session file. Removing the replay guard leaves the liveness guard, changing APPROVAL_REPLAY_REFUSED to SESSION_REVOKED. The exact-result assertion fails. The excerpt reports `baseline=0 guard_only=1 liveness_only=0 retention_only=0 applied=t combined=1 forbidden=t restored=0`. The harness explicitly requires those partial-mutation results.

Both files use pg and register their test without oidcRuntimeGate or a Node 26.5.0 skip. The dispatcher excerpt shows they executed on this runtime, with passing baselines and restorations. Their assert helpers print failed partial-mutant logs to stderr; these are the three visible failures. They should remain executed mutation controls with the combined mutations killed, even while the separate Miniflare durable OIDC cases skip. The excerpt satisfies their existing classifier requirements. Changing these failures into skips or relaxing their assertions would misstate that evidence, so no sibling test change was made.

## Other validation and live limit

- `node --test tests/oidc-runtime-gates.test.mjs tests/docker-gates.test.mjs tests/db-test-lock.test.mjs tests/repository-surface-policy.test.mjs` exited 0: 16 passed, 0 failed, 0 skipped. These are gate and local control tests, not live Docker execution.
- Initial `npm run lint` exited 1 on no-regex-spaces in the added test regex. The regex was changed to explicit space counts. Final `npm run lint` exited 0, and the crossed control was rerun successfully after that edit.
- `bash -n scripts/run-d1-mutation-harness scripts/run-db-tests` exited 0.
- `git diff --check` exited 0 before publication.
- Pre-publication `npm run proof:verify` exited 0, verifying 522 events across 108 threads and 3 actors. Post-append verification and commit disposition are reported in the final session response.

`npm run db:test` was not run: the live-run criterion remains blocked under the explicit no-Docker boundary. The dispatcher acceptance command is `npm run db:test`, with seven durable not-exercised lines and final live `executed=149 not_exercised=7` without a harness failure. The old excerpt's total of 155 executions is not substituted for a new measured total. No full-suite, supported-runtime OIDC, live D1, deployment, or push success is claimed.

## Retained command output

`shasum -a 256 artifacts/agent-b/d1-oidc-revision-*.log` produced:

| Path under artifacts/agent-b/ | SHA-256 |
| --- | --- |
| d1-oidc-revision-crossed-control-final.log | 0c2d3edaae0d6fa9095a7a28a33e40351e503741f01fa2a66ae1972938a3d2cf |
| d1-oidc-revision-crossed-control.log | 00121ae8ef04b8956064d2110595fd593bde85e57d8bcb3112ee586b2d40cad7 |
| d1-oidc-revision-lint-final.log | 93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7 |
| d1-oidc-revision-lint.log | 4324aa2ed02e10578cb7255dd5847f829398d8f29a57b6f516ce8962e555f29e |
| d1-oidc-revision-regression.log | 993d00714680cf8474bb266bb2750d928f3668abdcb98358f59d2d116180542b |
