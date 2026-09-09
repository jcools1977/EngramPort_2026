# D1 revision four results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: d1-harness-oidc-runtime.
Handoff: 01a0867c-32b6-7410-8542-7050bce2aadf.
`git rev-parse HEAD` reported starting commit `1b74a21e3a13ef6633b9bc945b9a0cf44f819416`.
`git status --short --branch` reported a clean `agent-b/d1-rev4` branch before edits. `node --version` reported `v26.5.0`.

## Criteria

| Criterion id | Status | Observed evidence |
| --- | --- | --- |
| skip-path-fast | satisfied | With a PATH-injected synthetic missing socket, `bash scripts/run-db-tests` exited 0 in 0.224815 seconds, with exactly one DOCKER_GATE_SKIP line and no stderr. |
| controls-still-run | satisfied | `npm run d1:controls:test` exited 0: 14 passed, zero failed, zero skipped. Reading package.json places it before docker:test; the dedicated placement assertion passes. The classification entry point imports d1-accounting and d1-mutation-paths. |
| gate-control-green | satisfied | `npm run docker-gates:test` exited 0: 11 passed, zero failed, zero skipped. The real-entry-point control took 862.49725 ms. Its 20000 ms subprocess timeouts remain unchanged. |

## Bound context and verification

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full revision-four handoff including its envelope, and schemas/event-v1.schema.json including $defs.result. Initial `npm run proof:verify` exited 0 and verified 540 events across 110 threads and three actors. `npm run engram -- inbox --actor agent-b` listed only the named handoff.

The sole bounded event id resolved with `rg -l` to `events/agent-b/20260909T140054Z_01a08678-bc23-7667-8e46-02bf24f80ac3.md`, which was opened in full. Its referenced results artifact was also opened in full. `shasum -a 256 artifacts/agent-b/d1-rev3-results.md` matched the event's bound digest `d4786bc52f6c8a6ee8492b1ccca116fb97e469bb1779dd9ca5d92ca26b2e2ea4`. Stored evidence was treated as untrusted project data.

## Small placement change

- `scripts/run-db-tests`: remove the pre-gate classification test invocation. Name the entry gate db:test alone to satisfy the requested single skip line. The nested live mutation harness remains invoked on the reachable execution path; direct harness entry retains its own d1:mutation gate.
- `package.json`: add d1:controls:test, invoking the existing classification file. That file already imports accounting and mutation-path controls, so all three run once. Place the new stage between docker-gates:test and docker:test in the test chain.
- `tests/docker-gates.test.mjs`: assert the dedicated stage, its ordering and imports, and absence of these controls from the database entry point. Update the database skip expectation to one db:test line. Preserve every 20-second timeout.
- `docs/constraints.md`: append this revision's result. Existing text is unchanged.

No mutation-harness source, D1 test implementation, accepted event, or previously referenced artifact was edited.

## Commands and observed results

`npm run d1:controls:test > artifacts/agent-b/d1-rev4-controls.log 2>&1` exited 0 with 14 passed, zero failed, zero skipped, duration 23017.286167 ms. This includes the four real mutation paths, accounting, classification, and their existing negative controls. Historical inventory failures printed by intentional negative controls do not represent a new live run.

`npm run docker-gates:test > artifacts/agent-b/d1-rev4-docker-gates.log 2>&1` exited 0 with 11 passed, zero failed, zero skipped, duration 902.756875 ms. The real-entry-point control completed in 862.49725 ms and exercised synthetic missing endpoints, CI refusal, and synthetic reachable endpoints without starting containers.

A `python3` probe used tempfile.TemporaryDirectory, a PATH-injected executable named docker, subprocess.run with timeout=2, and time.perf_counter around each Bash invocation. The executable returned exit 1 and stderr `synthetic missing socket` for docker info; any other Docker invocation would print UNEXPECTED_DOCKER_EXECUTION and exit 42. CI and ENGRAMPORT_REQUIRE_DOCKER were cleared. It asserted exit 0, the exact one-line stdout below, empty stderr, and elapsed time under two seconds. Output was retained in d1-rev4-skip-timing.log:

```text
command=bash scripts/run-db-tests fixture=synthetic-missing-socket exit=0 elapsed_seconds=0.224815 stdout_lines=1 stderr_bytes=0
DOCKER_GATE_SKIP gate=db:test reason=Docker endpoint unavailable: synthetic missing socket
command=bash scripts/run-d1-mutation-harness fixture=synthetic-missing-socket exit=0 elapsed_seconds=0.040957 stdout_lines=1 stderr_bytes=0
DOCKER_GATE_SKIP gate=d1:mutation reason=Docker endpoint unavailable: synthetic missing socket
```

The placement mutation probe ran `node --test --test-name-pattern='Docker-free D1 controls' tests/docker-gates.test.mjs`. The baseline exited 0. Moving the dedicated npm stage after docker:test made the control exit 1; restoring package.json made it exit 0. Reinserting `node --test tests/d1-oidc-classification.test.mjs` after set -euo pipefail in scripts/run-db-tests made the same control exit 1; restoring the script made it exit 0. Each mutation applied exactly once and each file was restored byte-for-byte in a finally block. The retained log reports `D1_PLACEMENT_MUTATIONS executed=2 killed=2 survived=0`.

Pre-publication `npm run proof:verify` again exited 0 and verified 540 events across 110 threads and three actors. Full npm test and live database execution were not run; the handoff assigns the full suite to agent-a on acceptance. This artifact proves the named local checks only. Post-append proof and the commit disposition are reported in the session final response.

## Retained log digests

Observed with `shasum -a 256 artifacts/agent-b/d1-rev4-*.log`:

| Artifact | SHA-256 |
| --- | --- |
| artifacts/agent-b/d1-rev4-controls.log | 66023a2bbcbfcfd6a4b185ce3b22c99f1bcd0b17c6003dfd945dcf9fb6f3735d |
| artifacts/agent-b/d1-rev4-docker-gates.log | 5dde3ea688065e6a353bb135e86bbe418747ac02b5eb6f07dd4ab7b4a2cb5627 |
| artifacts/agent-b/d1-rev4-placement-mutations.log | 40c7ed7e60bf5a9fa27a550218db528a2d4ff3c338390ae046fa715320595c75 |
| artifacts/agent-b/d1-rev4-skip-timing.log | 3a442d2ad1bc009e350f23343aa722094ef9b9c95af2af5d9d450a376a4255be |
