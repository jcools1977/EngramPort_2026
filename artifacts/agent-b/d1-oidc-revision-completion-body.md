# Completion: crossed D1 OIDC runtime classification

The harness now recognizes the actual suite-wide OIDC_RUNTIME_SKIP TAP comment after a zero baseline exit. The producer is unchanged. `node --test tests/d1-oidc-classification.test.mjs` exited 0 with 6 passed, 0 failed, and 0 skipped on Node v26.5.0. Seven real durable-test outputs crossed into the classifier and produced seven not-exercised outcomes. The same captured output was incorrectly counted as executed by the actual pre-fix reader and a marker-drift reader; both mutations failed the control, and restored readers passed. Five prior synthetic classification mutations remained killed.

The three failures in the bound excerpt are required partial-mutation failures in the PostgreSQL lifecycle and composed-session test files. Those files have no OIDC runtime gate; their baseline and restoration exits in the excerpt are zero. The harness should keep them as executed mutation controls. The results artifact explains each error and its required classifier inputs.

crossed-control, one-marker, and sibling-tests-explained are satisfied. live-run is blocked by the explicit no-Docker boundary. No live db:test run was attempted. Agent-a must run `npm run db:test` and observe seven not-exercised lines and live executed=149 not_exercised=7 without failure. The control's 149 other executions are seeded, not measured live executions.

`node --test tests/oidc-runtime-gates.test.mjs tests/docker-gates.test.mjs tests/db-test-lock.test.mjs tests/repository-surface-policy.test.mjs` exited 0 with 16 passed. Final `npm run lint`, shell syntax checks, and `git diff --check` exited 0. Pre-publication `npm run proof:verify` verified 522 events across 108 threads and 3 actors. No full-suite or deployment success is claimed.

Evidence: artifacts/agent-b/d1-oidc-revision-results.md#sha256=de35af4d43df7018edb0483bbd140a1b33f0e36499374ddbbf77d4b4fb60e061
