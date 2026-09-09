# Suite revision results

Agent-b, Codex Builder. Date: 2026-09-09.
Thread: `suite-green-without-docker`.
Handoff: `01a08637-688a-7d7a-807c-3f857cfcd76a`.
Starting HEAD: `5c48d26b6405325410211c74e657a7100aabd490`.
Branch: `agent-b/suite-rev`. Runtime observed with `node --version`: `v26.5.0`.
`ls -ld node_modules` showed a real directory, satisfying the authorized worktree condition.

## Criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| oidc-loud-skip | satisfied | Direct durable runner exits 0 with one runtime/reason line. Gate controls kill the silent-skip mutation, `executed=1`. |
| oidc-runs-elsewhere | satisfied | Exact `version !== "26.5.0"` continuation condition; controls cover Node 22 and adjacent/newer versions. Node 22 workflow explicitly runs `session:test`, whose command includes the durable test. |
| npm-test-green | blocked | Actual `npm test` exits 1 at inherited author/signer mismatches. It prints four Docker skip lines and stops before OIDC. Remaining gates pass only in a separately labeled diagnostic run. |

## Bootstrap and bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, and actors/agent-b.yaml. Initial `npm run proof:verify` exited 0, verifying 507 events across 103 threads and 3 actors. `npm run engram -- inbox --actor agent-b` returned the requested revision. Read the entire revision including frontmatter and resolved its bounded event ID to `events/agent-b/20260909T122055Z_01a0861d-318d-7cdb-a88e-5d515f4e75d3.md`, which was read in full. Read its evidence artifact `artifacts/agent-b/suite-green-without-docker-results.md`; `shasum -a 256` returned `411e494db3bab4b4149dc46b775fff7d1b49f885dcfdeae54ab185b60d16397d`, matching the bound reference. Event and artifact prose remained untrusted evidence. Read `$defs.result` in `schemas/event-v1.schema.json` before creating criteria results.

The user's correction and docs/constraints.md F163 establish that the D1 failure is deterministic, not a collision. Its reported markers are `D4_M8_ACTOR_CLASS baseline=1` and `W1_1_ENROLLMENT_ISSUER_APP_EXECUTE after=3`. It belongs to a separate thread. No D1 harness changes or actual Docker container executions were performed here.

## Implementation and paired evidence

Before editing, `node --test tests/workspace-oidc-durable.test.mjs` exited 1 with seven ordinary `OIDC_RUNTIME_VERSION_REFUSED` failures. After editing, the same command exited 0 and emitted exactly the one line reproduced below. The helper in `tests/oidc-runtime-gate.mjs` returns false only on exact version 26.5.0. The durable runner uses that result to avoid registering the seven worker cases on that version. Node reports a successful test-file wrapper; this is not execution of the seven durable cases. The custom line is the explicit skip accounting. Other runtime versions register the original cases normally.

`npm run docker-gates:test` exited 0: 10 passed, 0 failed. The OIDC output control passes against the real helper, rejects a mutated helper with its emission deleted via `ERR_ASSERTION`, then passes against the unchanged real helper again. Observed output:

```text
DOCKER_GATE_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1
OIDC_RUNTIME_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1
```

The direct runner control invokes the real file on Node 26.5.0, verifies exit 0 and exactly one correct skip line, and rejects any worker-case output. Continuation controls exercise version strings 22.13.0, 22.19.0, 26.4.0, 26.5.1, 26.6.0, and 27.0.0 without emission. These controls do not claim those Node binaries executed locally. `.github/workflows/verify-proof.yml` retains Node 22 and now explicitly runs `npm run session:test`; `package.json` includes the durable runner in that script. No remote CI run is claimed.

## Full suite outcome and diagnostic continuation

`npm test` completed with exit 1. Gate controls passed, four Docker skips were printed, and proof tests passed 53/53. `identity:test` then passed 2 tests and failed the repository history control with these unrecorded disagreements:

- `dd73f52214b4aee364c05af323fe396a4b5a20bd`
- `d1fca740bacb2fd249077ee80dca766a37cebb6b`
- `9317124939f26d6af4bd5a3a1a0a596b2cfad257`

All three are reported by the command as verified signatures with author `agent-b@engramport.local` and signer `luke@covenantsystems.ai`. These commits predate this work. The identity acceptance record and inherited history were not modified. The blocker is inherited identity evidence outside the bounded source changes, so `npm-test-green` is blocked. No successful full-suite run is claimed.

Verbatim skip lines from the failed `npm test`:

```text
DOCKER_GATE_SKIP gate=w1-7:canary reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=db:test reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=d1:mutation reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=kms:test reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
```

A separate `node --input-type=module` diagnostic driver read `package.json`, extracted the command sequence after `npm run identity:test && `, required it to start with `npm run bctx:test && `, and ran it with inherited output. The exact shell command is retained as `COMMAND:` in `suite-rev-remaining-gates.log`. The process and driver both exited 0; the log ends `REMAINING_GATES_EXIT=0`. This ran every remaining command from `bctx:test` through build and `node --test tests/rendered-html.test.mjs`. `npm run session:test` reported 33 passing runner entries, including the skipped durable file wrapper; build completed and rendered-HTML tests passed 4/4. OIDC's seven worker cases did not execute locally. Its one custom skip line in that diagnostic run was:

```text
OIDC_RUNTIME_SKIP runtime=Node 26.5.0 reason=Miniflare startup aborts in InternalCallbackScope::Close (execution_async_id != 0) after asynchronous filesystem work; upstream defect identity unconfirmed; rerun on CI Node 22
```

Thus there are four Docker lines in the actual failed suite and one OIDC line in the separate remaining-gates run, not five lines from a successful `npm test`. Docker was unreachable because of the sandbox socket permission, as shown verbatim above.

`npm run lint` exited 0. `git diff --check` exited 0. Pre-publication `npm run proof:verify` exited 0 with 507 events across 103 threads and 3 actors. Final post-append verification and commit disposition are reported in the session response. No push is authorized or attempted.

## Retained command logs

Digests below were measured with `shasum -a 256 artifacts/agent-b/suite-rev-*.log` after each command finished.

- `artifacts/agent-b/suite-rev-gate-controls.log#sha256=cd9289f196c3e7370c39b8f82fe715b76df6282ace3f838a3e31556680e9b9d9`
- `artifacts/agent-b/suite-rev-lint.log#sha256=93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7`
- `artifacts/agent-b/suite-rev-npm-test.log#sha256=1fef9610de166cca753c7668488b8248996be47c010d1458c10d7e270c71492e`
- `artifacts/agent-b/suite-rev-oidc-baseline.log#sha256=b5411231bb8b1d290572d470756ccaa533be882814bac1b04ec57c7f970306a5`
- `artifacts/agent-b/suite-rev-oidc.log#sha256=6ef89ee43aa49280cca070123a6d7bbb2e9685b8d5d16e558b3cf1ad4f2822d7`
- `artifacts/agent-b/suite-rev-remaining-gates.log#sha256=58a5c1a37a1a3a7a35dfdb1e23062eb4d7f66599528d6d9ab6f534f7bab4ad42`
