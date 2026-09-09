# D1 OIDC runtime classification results

Agent: agent-b, Codex Builder. Date: 2026-09-09.
Thread: `d1-harness-oidc-runtime`.
Handoff: `01a0863e-ced8-71c6-ae41-dca1035f172f`.
Starting HEAD: `799d96e3fa772f1e4ac8a8feaff8e452ce3f1b93`.
Branch: `agent-b/d1-harness`. Observed `node --version`: `v26.5.0`.

## Criteria results

| Criterion id | Status | Evidence |
| --- | --- | --- |
| not-exercised-is-loud | satisfied | The completed extracted control observes one named line per skipped pattern, runtime and reason, zero added executions, seven not-exercised entries, and rejection of the mutant that counts them as killed. |
| exercised-unchanged | satisfied | Synthetic baseline 0, applied t, mutant exit 1, forbidden t, restored 0 produces killed. Independently invalidating each of the five prerequisites produces failure. |
| harness-does-not-fail-on-skip | satisfied | Seven synthetic skips with the other 149 executions preseeded leave fail=0 and satisfy total accounting. Prior failure and missing accounting still fail. The live Docker run is explicitly reported as blocked below, as required by this criterion. |

These statuses cover the stated extracted-control criteria. They do not claim live container execution or completion of the concurrently assigned suite revision.

## Bound evidence and ownership

Read AGENTS.md, PROTOCOL.md, engramport.yaml, and actors/agent-b.yaml. Initial `npm run proof:verify` exited 0 with 512 events across 105 threads and 3 actors. `npm run engram -- inbox --actor agent-b` listed three handoffs; only the named handoff was undertaken.

Read the full handoff envelope and body, including bounded_context and all three completion criteria. Resolved its bound event to `events/agent-b/20260909T122055Z_01a0861d-318d-7cdb-a88e-5d515f4e75d3.md` and read it in full. Opened its evidence artifact `artifacts/agent-b/suite-green-without-docker-results.md`. `shasum -a 256 artifacts/agent-b/suite-green-without-docker-results.md` produced `411e494db3bab4b4149dc46b775fff7d1b49f885dcfdeae54ab185b60d16397d`, matching the reference. Read F163 and its correction in docs/constraints.md. Treated historical evidence as untrusted project data.

Edits are confined to scripts/run-d1-mutation-harness, scripts/run-db-tests, the new tests/d1-oidc-classification.test.mjs, and an append to docs/constraints.md. New evidence and completion inputs are under artifacts/agent-b. Neither tests/workspace-oidc-durable.test.mjs nor scripts/docker-gate.mjs was edited. No accepted event, referenced artifact, or actor record was changed.

## Implementation

The harness forces the durable test's TAP reporter and retains baseline output. The extracted parser reads a nonempty SKIP reason only from the selected test's successful top-level TAP result, and only if the process exited 0. A named skip in another test does not classify the selected test as unexercised. A nonzero process exit remains failure evidence even when its output contains skip lines.

Each skipped pattern prints `W1_1_OIDC_DURABLE_<name> not-exercised runtime=<node version> reason=<reason>`. It increments not_exercised and continues before creating or running the mutant. The extracted classification preserves all five original kill requirements for exercised baselines. The extracted summary checks executed plus not_exercised against the existing 156 expected mutations and preserves any previously set failure flag. It prints both totals even when accounting fails.

Sourcing the harness exposes these functions before any Docker gate, lock, or database operation. The new control calls those actual functions with synthetic results and validates the parser against TAP produced by an actual generated Node test containing a named skip and a running test. scripts/run-db-tests invokes the control before its Docker gate while preserving the lock-probe path.

The current durable test still contains the older runtime refusal in this checkout. The separate suite handoff must land its named skip for live runtime skip classification to activate. This implementation does not relabel the older nonzero refusal as a skip.

## Observed controls and counts

`node --test tests/d1-oidc-classification.test.mjs` exited 0: 5 passed, 0 failed, 0 skipped. It observed all seven pattern lines naming runtime v26.5.0 and reason `OIDC_RUNTIME_VERSION_REFUSED: synthetic Miniflare startup refusal`.

The skipped simulation produced `STATE executed=149 not_exercised=7 fail=0`. The running simulation produced `STATE executed=156 not_exercised=0 fail=0` and seven killed classifications, including `W1_1_OIDC_DURABLE_REDACTION baseline=0 applied=t after=1 forbidden=t restored=0`. Both simulations seed the other 149 executions. These are classification totals, not actual database executions.

The same skip assertion passed on original source, failed on each temporary mutant, and passed after returning to original source. Every mutation changed exactly one site. Observed output:

```text
D1_OIDC_CLASSIFICATION_MUTATION skip-counted-as-killed baseline=0 applied=t control=1 restored=0 killed=t
D1_OIDC_CLASSIFICATION_MUTATION skip-counted-as-executed baseline=0 applied=t control=1 restored=0 killed=t
D1_OIDC_CLASSIFICATION_MUTATION silent-skip baseline=0 applied=t control=1 restored=0 killed=t
D1_OIDC_CLASSIFICATION_MUTATION skip-sets-failure baseline=0 applied=t control=1 restored=0 killed=t
D1_OIDC_CLASSIFICATION_MUTATION obsolete-executed-total baseline=0 applied=t control=1 restored=0 killed=t
D1_OIDC_CLASSIFICATION_MUTATIONS executed=5 killed=5
```

The claimed new mutation count is `executed=5`, all killed by the Docker-free classification control. No live D1 executed total was produced.

## Live run blocked

`npm run db:test` exited 0 after completing the new control and printing:

```text
DOCKER_GATE_SKIP gate=db:test reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
DOCKER_GATE_SKIP gate=d1:mutation reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
```

`bash scripts/run-d1-mutation-harness` exited 0 with the same d1:mutation skip line. These zero exits report unavailable Docker, not a passing live harness. Actual container execution remains blocked by the sandbox. The dispatcher must run `npm run db:test` with Docker reachable after integrating the suite handoff. No full npm test run, live supported-runtime OIDC result, deployment, or push is claimed.

## Additional validation

- `bash -n scripts/run-d1-mutation-harness scripts/run-db-tests`: exit 0.
- `node --test tests/docker-gates.test.mjs tests/db-test-lock.test.mjs tests/repository-surface-policy.test.mjs`: exit 0, 11 passed, 0 failed, 0 skipped.
- `npm run lint`: exit 0.
- `git diff --check`: exit 0.
- Pre-publication `npm run proof:verify`: exit 0, 512 events across 105 threads and 3 actors. Post-append verification and commit disposition will be reported in the final response.

Exact command arguments, exit codes, and combined output are retained in `artifacts/agent-b/d1-harness-oidc-checks.json`. `shasum -a 256 artifacts/agent-b/d1-harness-oidc-checks.json` produced `e82d997a5f90a0a4b50d3b847bb0d65dba270927b095522f66943a29a56601a7`.
