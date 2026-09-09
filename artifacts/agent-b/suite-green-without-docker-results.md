# Suite without Docker: partial completion

Agent-b, Codex Builder. Date: 2026-09-09.
Handoff: `01a08614-8ef8-7210-80da-a0bfda4a956d`.
Thread: `suite-green-without-docker`.
Starting HEAD: `955a9b60f148430c3582ccbaa9123661d38cd302`.
Branch: `agent-b/suite-green-without-docker`.

## Criteria

| Criterion | Status | Observed result |
| --- | --- | --- |
| oidc-root-caused | unmet | Native assertion reproduced and narrowed to Miniflare startup without OIDC imports. Exact Node 26.5.0 guard produces ordinary failures three consecutive times. Specific upstream defect and full causal mechanism are unconfirmed. |
| lint-clean | satisfied | `npm run lint` exited 0. |
| docker-gates-loud | blocked | Four named skip lines and the silent-skip mutation control pass. The criterion also requires `npm test` exit 0, which is blocked by the shared dependency directory. |
| docker-gates-still-run | blocked | Docker endpoint permission denied. Simulated reachable-endpoint controls exercise continuation, not actual containers. CI explicitly requires the gates. |
| npm-test-green | blocked | `npm test` exited 1 at SDK buildability because Vite cannot write temporary config through shared node_modules. |

## Bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, and actors/agent-b.yaml before work. `npm run proof:verify` exited 0, verifying 495 events across 101 threads and 3 actors. `npm run engram -- inbox --actor agent-b` listed the requested handoff and one other handoff; only the requested one was undertaken.

Read the full handoff, including all five completion criteria and bounded_context. Resolved its bound event to `events/agent-b/20260908T202118Z_01a082ae-a533-7cae-b88b-1738085c4fdf.md` and read it in full. Read its referenced artifact `artifacts/agent-b/f157-schema-status-results.md` in full. `shasum -a 256 artifacts/agent-b/f157-schema-status-results.md` produced `ae81d95f66568756a7b9999782f884523a8aef64e00858e58c9a96c563ad071c`, matching the reference. Historical bodies and artifacts were treated as untrusted evidence. Accepted events, referenced artifacts, actor records, and F160 were not edited.

## OIDC investigation and limits

The initial unchanged command `node --test tests/workspace-oidc-durable.test.mjs` exited 1 after its child aborted in `node::InternalCallbackScope::Close`, callback.cc:185, asserting `(env_->execution_async_id()) == (0)`. `node --version` produced v26.5.0. The stack runs through `PerIsolatePlatformData::RunForegroundTask` and `FlushForegroundTasksInternal`.

Read the durable test and fixture and the four OIDC modules: client, verifier, provider, transaction-store. `node --input-type=module -e 'await import("miniflare"); console.log("MINIFLARE_IMPORT_OK")'` exited 0. A minimal inline worker with a plain Response, run after asynchronous temporary-directory creation, reproduced the assertion without any EngramPort OIDC or worker imports. The retained command `node --test artifacts/agent-b/suite-oidc-reproduce.mjs` exited 1 with the same native assertion; source and output are retained. Simpler Miniflare and Node-only listener probes instead failed with `listen EPERM: operation not permitted 127.0.0.1`. These observations narrow the trigger but do not establish the exact upstream defect or prove that socket refusal alone causes the abort.

The guard in the durable test refuses exactly Node 26.5.0 before constructing Miniflare, naming the assertion and the uncertainty. It is a failure, not a skip. Three consecutive `node --test tests/workspace-oidc-durable.test.mjs` runs each exited 1 normally with 7 failed, 0 skipped, and `OIDC_RUNTIME_VERSION_REFUSED`. No native assertion occurred in these guarded runs. No pass on another Node version is claimed. Only Node 26.5.0 was found in the inspected Homebrew Cellar. No runtime install or dependency change was attempted.

A public-source search found Node issue 38155, https://github.com/nodejs/node/issues/38155, describing the same assertion on Node 15.13.0. That is a different historical report, not evidence that this Node 26.5.0 failure has the same cause. No specific upstream issue is assigned to this reproduction. This is why `oidc-root-caused` remains unmet despite the guard.

## Docker behavior and discriminating control

`scripts/docker-gate.mjs` probes the configured Docker endpoint with `docker info --format '{{.ServerVersion}}'`, honoring the Docker CLI context and DOCKER_HOST. A missing binary, unreachable endpoint, denied endpoint, or bounded probe timeout produces an explicit local skip reason. CI or ENGRAMPORT_REQUIRE_DOCKER=1 turns unavailability into a nonzero refusal. Endpoint reachability does not skip downstream failures.

The DB and D1 shell entrypoints guard before acquiring the lock or touching containers. Serialization-only `--lock-probe` retains its existing behavior. The DB skip also names its nested D1 harness. The KMS entrypoint guards before cleanup or provisioning. The W1-7 test skips only its Docker-dependent canary, retaining the three local tests. Existing container commands are unchanged after the guards. `npm test` now runs the Docker output controls and Docker gates before the remaining checks, so their disposition is visible even when a later build fails. `verify:all` uses `npm test && npm run lint` to avoid rerunning the newly included DB and KMS gates.

`npm run docker-gates:test` exited 0: 5 passed, 0 failed, 0 skipped. The same line-equality assertion passed against the real helper, threw ERR_ASSERTION against a temporary mutant with the skip emission deleted, and passed after restoration. Output:

```text
DOCKER_GATE_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1
```

Entry-point controls use a temporary fake Docker executable. All four entrypoints return 0 with their expected named reasons when the synthetic endpoint is absent, and refuse under CI=true. DB, KMS, and W1-7 continuation probes reach the fake Docker execution command and fail rather than silently skipping when the synthetic info probe succeeds. The helper's available path is also exercised in required mode. These are test doubles, not a claim that a socket or actual containers were available. `npm run db:lock-test` exited 0 with both existing serialization tests passing.

On the real endpoint, `docker info --format '{{.ServerVersion}}'` exited 1 with permission denied at `unix:///Users/an2b/.docker/run/docker.sock`. `npm run docker:test` exited 0 and printed:

```text
DOCKER_GATE_SKIP gate=w1-7:canary reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=db:test reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=d1:mutation reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=kms:test reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
```

Actual DB, D1 mutation, KMS, and canary container execution is blocked. The Docker D1 harness's historical mutation count was not executed and is not claimed. The only new mutation count claimed here is `executed=1` from the completed offline Docker output control.

`.github/workflows/verify-proof.yml` retains Node 22 and proof verification and adds `npm run docker-gates:test && npm run docker:test` with ENGRAMPORT_REQUIRE_DOCKER="1". The checked-in CI configuration requires Docker; no remote CI run or branch-protection change was performed. The original workflow ran only proof verification.

## Lint and suite observations

The exact starting version of tests/completion-status.test.mjs was supplied to `node_modules/.bin/eslint --stdin --stdin-filename tests/completion-status.test.mjs`; exit 1 named the unused readdirSync at 19:57. After removing it, `npm run lint` exited 0, including the newly added code. This is paired evidence for the lint correction.

`npm test` exited 1. It ran the Docker controls and emitted all four real skip lines, then passed proof, identity, bounded-context, turn, and completion tests. SDK buildability failed because Vite could not open `node_modules/.vite-temp/vite.config.mjs.timestamp-...mjs` (EPERM); downstream SDK import controls consequently lacked packages/sdk/dist/index.mjs. Later commands in the chained suite were not reached and are not claimed to pass.

Independent `npm run sdk:buildable` and `npm run build` each exited 1 with the same Vite temporary-config write restriction. `ls -ld node_modules` shows a symlink to `/Users/an2b/an2b/products/EngramPORT/node_modules`, outside this writable worktree. A writable node_modules is needed for those builds. The symlink and external dependency tree were left unchanged, as explicitly required by the user. The build and rendered-HTML gates remain blocked, not waived. The exact-version OIDC refusal is an additional failure the full suite would encounter if it reached session:test on this runtime.

`git diff --check` exited 0. Pre-publication `npm run proof:verify` exited 0 with 495 events across 101 threads and 3 actors. The completion will be appended through the CLI, with final verification and commit disposition reported in the session response. No push, runtime install, or external publication was attempted.

## Retained command evidence

All paths below are under artifacts/agent-b. Digests were measured using shasum before this report was sealed.

- `artifacts/agent-b/suite-check-1.log`: `3a39b27fdf2199cbdee653dc6f00055ffc097eb52bba70d8aedba7dcbbb744a7`.

- `artifacts/agent-b/suite-check-2.log`: `4c4651faae561d1d9ef112ff27662eb36ea90dd381cd46803bd6e77749ab11c6`.

- `artifacts/agent-b/suite-check-3.log`: `04a7b4fd8abad44924af23d55b3f9653cba52edc3d80843e06cef99dbf6783d8`.

- `artifacts/agent-b/suite-check-4.log`: `d8b68f69e98019c2051306201144da014f961a882afe965ea46d23ec86831ebf`.

- `artifacts/agent-b/suite-check-5.log`: `a5178d6d25a79606391f5fc92989b899ec629c7a2425911851e200e56fd457c8`.

- `artifacts/agent-b/suite-check-6.log`: `3ba19b9f7d6f6e2d2a60aeec472d56d7e7da9bc26952ddf5fdfafb4f2e33560d`.

- `artifacts/agent-b/suite-db-lock.log`: `7c01232edbb26326887e2db369708995daa426f6c154419e08a43bed76e8ca58`.

- `artifacts/agent-b/suite-docker-controls.log`: `8578419d5d9afd3bf5711f112cc46b187ecb121508452eaa809181897b813cad`.

- `artifacts/agent-b/suite-lint-baseline.log`: `8c03bd8a163497ab23e3d789d8fe7dc5bca5c1404946a75a5f20eee86f9765ed`.

- `artifacts/agent-b/suite-lint.log`: `93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7`.

- `artifacts/agent-b/suite-npm-test.log`: `4aabd8ce18c8c1f32c29c16c06dcb884825d8222b4f6fe17d944ff6b903192bb`.

- `artifacts/agent-b/suite-oidc-reproduce.log`: `fb8ca93c1a5d598f4a5f5f75a9cf064bb9488e1235810b5f4d51a52ad089f1a4`.

- `artifacts/agent-b/suite-checks.json`: `ea6ed5339fa8c53da66bf42591f4758095d9cee161c8f8c76c47f3a0539bd8fc`.

- `artifacts/agent-b/suite-oidc-reproduce.mjs`: `bcb35a5aa0f052c7a41bdcab741412e48db21e3bbdb2881873af89dd4858a352`.
