# Completion: SDK bundle before Docker gates

The database runner refuses a missing packages/sdk/dist/index.mjs before Docker probing or lock acquisition, with one line naming npm run build --prefix packages/sdk. The workflow runs that build before Require Docker gates, with the reason naming Actions run 34371411859. --lock-probe remains independent of SDK and Docker. docs/constraints.md was appended only.

With the actual worktree dist absent, bash scripts/run-db-tests exited 1 with the one-line SDK_BUNDLE_REQUIRED diagnostic. npm run docker-gates:test completed with 14 passed, zero failed, and zero skipped. Its isolated runner controls observed zero Docker calls when absent and synthetic compose up when present; disabled-check and always-refuse mutations failed and restoration passed. Missing and late workflow builds failed the order control. The initial test run failed on a macOS temporary-path alias in the new fixture; canonicalizing the fixture repaired it.

npm run build --prefix packages/sdk completed with exit 0. A Node dynamic import of @engramport/sdk exited 0 and printed SDK_IMPORT_OK. With the actual bundle present, ENGRAMPORT_REQUIRE_DOCKER=1 bash scripts/run-db-tests reached DOCKER_REQUIRED and exited 1 because Docker API access is denied in the sandbox. This verifies continuation to the Docker gate; live database acceptance is blocked.

node --test tests/db-test-lock.test.mjs tests/repository-surface-policy.test.mjs completed with six passed and zero skipped. npm run lint, bash -n scripts/run-db-tests, and git diff --check exited 0. Pre-publication npm run proof:verify verified 558 events across 113 threads and three actors.

bundle-precondition and workflow-builds-first are satisfied within these measured limits. ci-green is blocked pending agent-a's Actions-on-main success observation. Synthetic continuation is not a live suite. No full npm test, live canary, live database success, or Actions success is claimed. F170 remains open for live acceptance. No push was performed.

Evidence: artifacts/agent-b/ci-canary-sdk-r4-results.md#sha256=16e1086bfc3915aff9ef3a67e196b14f1cab0261c032c2b80ec1fb1a2b8e35e4
