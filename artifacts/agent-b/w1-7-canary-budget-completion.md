# Completion: explicit canary budget and loud baseline timeouts

The canary now declares a 30-second timeout with an adjacent reason naming vulnerable and protected core-dump creation/read work, ten sink/signing observations, and cleanup. This is an allowance for laptop load variation, not a measured live latency guarantee. Its assertions are unchanged, as shown by the results artifact's diff and exact comparison against HEAD. The fixture and database runner are unchanged.

The D1 harness reads actual TAP baseline timeout diagnostics before mutation, prints a named baseline-timeout outcome with test, effective budget, and process exit, counts the outcome, and fails the harness. All assertion-wrapper baselines and the directly captured OIDC baseline use this check.

`node --test tests/d1-baseline-timeout.test.mjs` exited 0 with four passed and zero skipped. Synthetic timed-out baselines crossed all five real canary branches, each reporting budget_ms=40 and exit=1; the summary counted executed=5 expected_total=5 and exited 1. Disabling the reader produced D3_CANARY_OPERATIONAL_OBSERVER baseline=1 applied=t after=1 forbidden=f restored=1. The same control rejected this mutation and passed after restoration. A scaled budget control passed the explicit override while the ordinary test timed out at its default.

`npm run d1:controls:test` exited 0 with 21 passed, zero failed, and zero skipped. `npm run lint`, `node --test tests/repository-surface-policy.test.mjs` (four passed), `bash -n scripts/run-d1-mutation-harness`, and `git diff --check` exited 0. Pre-publication `npm run proof:verify` verified 544 events across 111 threads and three actors.

budget-explicit, timeout-is-loud, and canary-unchanged are satisfied. The live run is blocked by the user's explicit no-Docker boundary. No live canary, npm run db:test, or full npm test was run. Agent-a must observe live acceptance.

Evidence: artifacts/agent-b/w1-7-canary-budget-results.md#sha256=9eb9fa0c5ed8498da2981ee42f7d75a5560485efe1a6063764ca4e17c18e816f
