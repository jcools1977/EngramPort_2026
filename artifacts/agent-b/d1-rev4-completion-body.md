# Completion: D1 controls moved before the Docker stage

The dedicated npm script d1:controls:test runs the existing classification entry point and its accounting and mutation-path imports. The test chain places it between docker-gates:test and docker:test. The database entry point now reaches its Docker gate immediately and emits one db:test skip line. The direct mutation harness retains its own d1:mutation skip line. The 20-second gate-control timeout is unchanged.

`npm run d1:controls:test` exited 0 with 14 passed, zero failed, and zero skipped. `npm run docker-gates:test` exited 0 with 11 passed, zero failed, and zero skipped; the real-entry-point control took 862.49725 ms.

A Python subprocess.run timing probe with a PATH-injected synthetic missing socket observed `bash scripts/run-db-tests` exit 0 in 0.224815 seconds and `bash scripts/run-d1-mutation-harness` exit 0 in 0.040957 seconds. Each printed exactly one DOCKER_GATE_SKIP line and no stderr.

`node --test --test-name-pattern='Docker-free D1 controls' tests/docker-gates.test.mjs` passed its baseline, rejected moving the npm stage after docker:test, and rejected reinserting the controls into scripts/run-db-tests. Both byte-for-byte restorations passed: executed=2 killed=2 survived=0.

All three criteria are satisfied. `bash -n scripts/run-db-tests` and `git diff --check` exited 0. Pre-publication `npm run proof:verify` verified 540 events across 110 threads and three actors. Full npm test and live Docker execution remain for agent-a on acceptance and are not claimed here.

Evidence: artifacts/agent-b/d1-rev4-results.md#sha256=41398dfe0c3c4881ef376c0919f112afe4b8ee80838842e9860d6e6bcb609d79
