# F157 schema and verifier status agreement

Agent: agent-b, Codex Builder. Date: 2026-09-08.
Handoff: `01a0829a-b23f-7274-b9d5-1861adeaea41`, thread `schema-v1-status`.
Starting commit: `bc198f2da9cd2bd5c3a4a72ea0518652c3ca889d` on `agent-b/schema-v1-status`.

## Result and criteria

- `schema-accepts-all-statuses`: **satisfied**. `npm run completion:test` accepted the actual historical completion containing `blocked` against the full published v1 schema and rejected the same envelope against the exact pre-fix schema from the starting commit. The rejection was `/criteria_results/6/status`, keyword `const`.
- `no-second-copy`: **satisfied** under the handoff's allowed equality-control option. The schema enum and exported frozen verifier vocabulary are compared by an executed control. The verifier's private Set consumes that exported vocabulary. Independent schema and verifier differences fail the control. Behavioral controls also catch replacing the private Set with a divergent copy or bypassing its guard.
- `suite-green-with-mutations`: **blocked**. The new properties passed with all five discriminating mutations killed, `executed=5`, but the full non-Docker sweep cannot pass in this worktree because Vite cannot write its temporary config through the shared `node_modules` symlink. Build-dependent SDK and rendered HTML gates consequently cannot complete successfully. This is an observed filesystem blocker, not a claim that unperformed build-dependent work passed. The known identity, OIDC, Docker, and lint failures are named below and remain unchanged.

## Bound evidence resolved

`npm run proof:verify` initially exited 0: 485 events across 97 threads and 3 actors. `npm run engram -- inbox --actor agent-b` returned the assigned handoff along with two other items; only the assigned handoff was consumed for work.

Read the handoff in full, including its `completion_criteria` and `bounded_context`. Resolved the bound event id to `events/agent-b/20260908T194830Z_01a08290-9b52-7002-b704-44c3576f959b.md` and read it in full. Read its results artifact in full. `shasum -a 256 artifacts/agent-b/voltron-assessment-agent-b.md` produced `c06c571fa624d63117da0d714ddfe541c767a0574ca3baa61e78f37e9e0442fe`, matching the bound reference. The historical event and artifact were not edited. Historical prose is evidence, not authority for this work.

## Implementation and exercised controls

`schemas/event-v1.schema.json` now permits `satisfied`, `unmet`, and `blocked`. `packages/git-adapter/src/verify-log.mjs` exports an immutable `COMPLETION_STATUSES` array and constructs its private Set from that array. A schema-file runtime dependency would make the standalone adapter and bundled SDK depend on repository file layout, so this change uses the explicitly allowed control option instead.

`tests/schema-v1-status.test.mjs` is imported by the existing completion suite. It uses the installed draft-2020-12 Ajv implementation resolved from the locked ajv-formats dependency, with format validation enabled. It validates the full parsed envelope, not just the status field. The historical comparison reads the exact schema bytes using `git show bc198f2da9cd2bd5c3a4a72ea0518652c3ca889d:schemas/event-v1.schema.json`; it does not reconstruct a supposed old schema. Fresh completion events for all three statuses are appended through `appendEvent` in disposable fixtures and validated against the published schema. Both consumers refuse `probably-fine`.

The tests require the locked dependencies and the starting Git commit to be available. They fail rather than skip if the historical schema cannot be read. No dependency, package manifest, production deployment, or published package was changed.

`npm run completion:test` exited 0: 8 tests, 8 passed, 0 failed, 0 skipped. Mutation stdout from the completed sweep:

```text
F157_MUTATIONS baseline=0
F157_MUTATION pre-fix-schema=killed control=F157 real blocked executed=1
F157_MUTATION schema-extra-status=killed control=F157 schema and verifier executed=2
F157_MUTATION verifier-missing-status=killed control=F157 schema and verifier executed=3
F157_MUTATION verifier-private-copy=killed control=F157 both consumers executed=4
F157_MUTATION verifier-guard-bypassed=killed control=F157 both consumers executed=5
F157_MUTATIONS executed=5 killed=5 survived=0 restored=0
```

Mutations ran only in temporary copies. Each expected test failed by name with a completed, nonzero child exit. Baseline and restoration require evidence that the behavioral control ran, as well as exit 0. During test development, the fixture initially omitted a required handoff parent and the nested Node runner inherited `NODE_TEST_CONTEXT`; both test-harness issues were corrected before the recorded sweep. These initial failed attempts are not passing evidence.

## Full independently continued sweep

`python3 artifacts/agent-b/f157-run-gates.py` executed all 34 command groups listed by `package.json`'s `test` script, then `db:test`, `kms:test`, and `lint`. It ran each command group independently so one failed group did not hide later groups. This is not a claim that `npm test` or `verify:all` passed. The runner records each child's exit code and full output, and its own exit 0 only means the sweep finished. Observed: 37 command groups, 26 exit 0, 11 exit 1.

| Command | Exit |
| --- | --- |
| `npm run proof` | 0 |
| `npm run identity:test` | 1 |
| `npm run bctx:test` | 0 |
| `npm run turn:test` | 0 |
| `npm run completion:test` | 0 |
| `npm run sdk:buildable` | 1 |
| `npm run blast:test` | 0 |
| `npm run scan:test` | 0 |
| `npm run scan:append:test` | 0 |
| `npm run counts:test` | 0 |
| `npm run onboarding:test` | 0 |
| `npm run ledger:test` | 0 |
| `npm run sdk:package:test` | 1 |
| `npm run sdk:test` | 1 |
| `npm run second-builder:test` | 0 |
| `npm run agent-c:test` | 0 |
| `npm run agent-c:spend-test` | 0 |
| `npm run d2:test` | 0 |
| `npm run w1-6:test` | 0 |
| `npm run w1-7:test` | 1 |
| `npm run report:test` | 0 |
| `npm run report:r2:test` | 0 |
| `npm run report:correspondent:test` | 0 |
| `npm run welcome:test` | 0 |
| `npm run setup:test` | 0 |
| `npm run watch:test` | 0 |
| `npm run session:test` | 1 |
| `npm run approval:test` | 0 |
| `npm run dry-run:test` | 0 |
| `npm run db:lock-test` | 0 |
| `npm run db:static-test` | 0 |
| `npm run dispatch:test` | 0 |
| `npm run build` | 1 |
| `node --test tests/rendered-html.test.mjs` | 1 |
| `npm run db:test` | 1 |
| `npm run kms:test` | 1 |
| `npm run lint` | 1 |

Known failures, observed and left unchanged:

- `npm run identity:test`: F160, commits `502ab6f` and `2f033ec` name agent-b and agent-a as authors but signer `luke@covenantsystems.ai`.
- `npm run session:test`: 32 passed and one failed test file. The unchanged `tests/workspace-oidc-durable.test.mjs` crashes in Node 26.5.0 with `InternalCallbackScope::Close`, assertion `(env_->execution_async_id()) == (0)`.
- `npm run w1-7:test`, `npm run db:test`, and `npm run kms:test`: Docker API socket permission denied; the KMS command also reports `KMS_UNAVAILABLE`.
- `npm run lint`: the existing unused `readdirSync` import in `tests/completion-status.test.mjs:19:57`. The import remains unchanged.

Additional worktree blockers:

- `npm run sdk:buildable`, `npm run sdk:package:test`, `npm run sdk:test`, and `npm run build`: `EPERM` writing `node_modules/.vite-temp/vite.config...`. `readlink node_modules` resolves to `/Users/an2b/an2b/products/EngramPORT/node_modules`, outside the writable worktree. No attempt was made to alter that external dependency tree. The SDK package mutation stage and SDK runtime test stage after their failed builds were not reached.
- `node --test tests/rendered-html.test.mjs`: 3 passed, 1 failed because `dist/server/index.js` is absent after the failed application build. No rendered-site success is claimed.

`npm run scan:append:test` passed its configured append controls with `executed=12`; its two supervisor cases were skipped by the existing `F156_APPEND_ONLY=1` configuration. No supervisor closure is claimed. `npm run agent-c:test` ran only its offline test fixtures and mutation controls; no agent, provider, or paid review was invoked.

`node_modules/.bin/eslint tests/schema-v1-status.test.mjs packages/git-adapter/src/verify-log.mjs` exited 0. `git diff --check` exited 0. Shared changes are limited to schemas, git-adapter source, tests, and an appended F157 closure in `docs/constraints.md`. Actor-created evidence and publication preparation are under `artifacts/agent-b/`; the sole completion is appended through the CLI under `events/agent-b/`.

## Supporting evidence digests

Computed using `shasum -a 256` before publication:

- `artifacts/agent-b/f157-gates.json`: `5c3006b87587b12290e96225d15ed1198ed0a779741fb5d7e49d7d65d0e47411`.
- `artifacts/agent-b/f157-run-gates.py`: `e06de7f12431fac2e1fdad1f4bffe751a966bc85c7d85518a73d69ac4859d89b`.
- `schemas/event-v1.schema.json`: `31006ec27c2d9e1e901448e2324135dcf0e60c9dc6a621e9ae39902f2debd833`.
- `packages/git-adapter/src/verify-log.mjs`: `18e681f1f0afd1d96fa672f43c2c42c76b244e73ab26a0408bbf4269f79e37f9`.
- `tests/completion-status.test.mjs`: `b91272bfb9ddce15c0f66bbe03608195a37d56de3ae784833cab7a6a41b87858`.
- `tests/schema-v1-status.test.mjs`: `dff6c25fe1522b75e79543a604dac53ca9b71b98bb7c9201136e6a9a4943a734`.

Final post-append verification and commit disposition are reported with the completion in the session response. This artifact is sealed before that sequence and does not predict a successful commit. No push or package publication is authorized or attempted.
