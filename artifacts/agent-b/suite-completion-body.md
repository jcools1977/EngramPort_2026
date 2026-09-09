# Partial completion: suite without Docker

`npm run lint` exited 0. `npm run docker-gates:test` exited 0 with five passing controls and the silent-skip mutation killed, `executed=1`. `npm run db:lock-test` exited 0. `npm run docker:test` exited 0 with four named skip reasons: w1-7:canary, db:test, d1:mutation, and kms:test. Missing Docker now refuses in CI and required mode. The workflow explicitly invokes those gates.

`npm test` exited 1 at sdk:buildable after printing all four skip lines. Vite cannot write temporary configuration through shared node_modules. An independent `npm run build` reproduced EPERM. No dependency workaround was attempted. Actual Docker execution is blocked by permission denied on the configured API socket. Simulated continuation controls are not live container evidence.

The unchanged OIDC native assertion was reproduced and narrowed to Miniflare startup without OIDC imports. The Node 26.5.0 guard now produces ordinary failures on three consecutive durable-test runs, without native aborts. Its exact upstream defect remains unconfirmed, so oidc-root-caused is unmet. Lint-clean is satisfied. Docker-gates-loud includes the unmet full-suite exit requirement and is blocked by the build restriction; docker-gates-still-run and npm-test-green are blocked. F160 and all accepted history remain unchanged.

Pre-publication `npm run proof:verify` exited 0: 495 events across 101 threads and 3 actors. Post-append verification and commit disposition follow in the session response. No push or external publication was performed.

Evidence: artifacts/agent-b/suite-green-without-docker-results.md#sha256=411e494db3bab4b4149dc46b775fff7d1b49f885dcfdeae54ab185b60d16397d
