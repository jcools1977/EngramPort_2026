# sdk-init results

Actor: agent-b (Codex Builder). Handoff: 01a08279-d3e1-707e-b650-4dae0289136d.
Thread: sdk-init. Starting commit: 63d26fdadaa74674068dc33d01867d3176552640.
This artifact records observations before the one required completion is appended. Publication and push were not performed.

## Bound evidence

Read bootstrap, protocol, actor record, full handoff, and bound events:
- events/agent-c/20260831T142631Z_01a05836-f46c-77d1-9ed9-a0d2096f2410.md
- events/agent-a/20260831T144456Z_01a05847-cf55-77ce-bcd1-7eee53a3b432.md

`shasum -a 256 artifacts/agent-c/reviews/01a05834-1a7f-7545-a6f9-704e2d1276f0.json` returned de57cb15ed644722b0dc703f0147a3ce2751b041d80aa08371125ca382d38b03, matching the reference.
`npm run proof:verify` initially passed: 475 events, 95 threads, 3 actors. `npm run engram -- inbox --actor agent-b` discovered this handoff.

## Implementation

Init imports the verifier's SLUG and writes its named INIT_PATHS templates only. It requires explicit kind, checks inputs and an empty directory before writing, and uses exclusive directory creation and wx files. Filesystem errors can leave a partial scaffold. It copies no repository files and performs no Git or network operation.
The SDK bundles the API and executable engram CLI with shared chunks. Version 0.3.0 is prepared, not published. README describes init, no grant or authentication, and the separate existing-project admission path. The root lockfile's pre-existing SDK 0.1.0 entry is outside the allowed edit paths.

## Criteria results

| Criterion | Status | Evidence |
| --- | --- | --- |
| init-scaffolds-verifiable | satisfied | Packed bin scaffolds, verifies zero events, appends, and verifies one event in both modes. |
| init-refuses-existing-project | satisfied | INIT_PROJECT_EXISTS names CONTRIBUTING.md; every file digest and directory entry is unchanged. |
| init-refuses-bad-input | satisfied | Invalid and absent actor, missing kind, and invalid kind refuse with named codes and no entries created; shared SLUG is imported. |
| init-never-overwrites | satisfied | Existing actor refuses with INIT_PATH_EXISTS and identical digest; injected concurrent config survives wx, while its w mutant overwrites it. |
| bin-from-clean-consumer | satisfied | Extended existing control installs npm pack output and runs node_modules/.bin/engram outside the repository. |
| readme-install-rewritten | unmet | Install rewrite is complete. counts:check passed before completion, but preserving the three count sentences as explicitly bounded leaves the mandatory new completion's event-count increment unreflected. |
| suite-green-with-mutations | unmet | executed=10, killed=10, restored=10. Historical identity failure and a repeated Node native crash prevent all non-Docker suites passing. Docker gate was attempted and refused by the environment. |

## Packed positive and refusal evidence

`npm run sdk:package:test` exited 0: 3 packaging tests passed, then SDK_INIT_MUTATIONS executed=10 killed=10 restored=10. It uses npm pack with prepack build, local tarball installation with scripts disabled, and the installed bin outside repository source. It asserts INIT_PATHS, actual files and directories, and empty .gitkeep contents.
Both agent/free_form defaults and human/strict_relay with custom-project verified 0 events, appended successfully, and verified 1 event with 1 actor.

Default scaffold SHA-256 values observed in the packed control:
- actors/clean-builder.yaml: fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17
- artifacts/clean-builder/.gitkeep: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
- engramport.yaml: a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a
- events/clean-builder/.gitkeep: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

Unchanged before/after SHA-256 values from the same command:
- existing-project, engramport.yaml: 6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc
- existing-project, nested/evidence.txt: 2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0
- existing-actor, actors/clean-builder.yaml: ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c

Invalid inputs and an unknown flag logged named refusals with before={} and after={}. Unrelated contents and a dangling actors symlink refused with INIT_NOT_EMPTY and unchanged snapshots.

## Discriminating mutations

The harness mutates installed tarball CLI copies in temporary directories and runs each fixture before mutation and after restoration. Every mutant fails its own assertion, not module loading or syntax. The wx pair injects a competing config immediately before writing in both versions.

| Mutation | Observed mutant behavior |
| --- | --- |
| existing-project | Wrong code INIT_PATH_EXISTS; bytes unchanged. |
| invalid-slug | Exit 0; wrote four files. |
| missing-kind | Exit 0; wrote four files. |
| invalid-kind | Exit 0; wrote four files. |
| invalid-mode | Exit 0; wrote four files. |
| invalid-project | Exit 0; wrote four files. |
| existing-actor | Wrong code INIT_NOT_EMPTY; bytes unchanged. |
| nonempty | Exit 0; wrote four files. |
| unknown-flag | Exit 0; wrote four files. |
| exclusive-write | Exit 0 and competing file overwritten after wx becomes w. |

Code-specific mutants prove refusal specificity; the wx mutant proves overwrite prevention.

## Observed suite results

`npm test` exited 1 after proof:test passed 53/53 and identity:test passed 1/2. The identity failure names historical commit 2f033ec: its author and verified signer differ. No history was rewritten.
All remaining commands in the npm test pipeline were run individually to completion:

- `npm run bctx:test`: exit 0.
- `npm run turn:test`: exit 0.
- `npm run completion:test`: exit 0.
- `npm run sdk:buildable`: exit 0.
- `npm run blast:test`: exit 0.
- `npm run scan:test`: exit 0.
- `npm run counts:test`: exit 0.
- `npm run onboarding:test`: exit 0.
- `npm run ledger:test`: exit 0.
- `npm run sdk:package:test`: exit 0.
- `npm run sdk:test`: exit 0.
- `npm run second-builder:test`: exit 0.
- `npm run agent-c:test`: exit 0.
- `npm run agent-c:spend-test`: exit 0.
- `npm run d2:test`: exit 0.
- `npm run w1-6:test`: exit 0.
- `npm run w1-7:test`: exit 1.
- `npm run report:test`: exit 0.
- `npm run report:r2:test`: exit 0.
- `npm run report:correspondent:test`: exit 0.
- `npm run welcome:test`: exit 0.
- `npm run setup:test`: exit 0.
- `npm run watch:test`: exit 0.
- `npm run session:test`: exit 1.
- `npm run approval:test`: exit 0.
- `npm run dry-run:test`: exit 0.
- `npm run db:lock-test`: exit 0.
- `npm run db:static-test`: exit 0.
- `npm run dispatch:test`: exit 0.
- `npm run build`: exit 0.
- `node --test tests/rendered-html.test.mjs`: exit 0.

W1-7: 3/4 passed; its canary failed with Docker API socket permission denied. No live Docker/KMS success is claimed. session:test: 32 passed and workspace-oidc-durable.test.mjs crashed in Node v26.5.0 with native assertion `(env_->execution_async_id()) == (0)`. A separate complete `npm run session:test` repeat reproduced the failure. These files were unchanged.
`npm run lint` exited 1 solely for the existing unused readdirSync import at tests/completion-status.test.mjs:19. `git diff --check` exited 0.
`npm run counts:check` passed before completion: 475 events, 64 findings, 39 ADRs. The exported scripts/readme-counts check with derive().events + 1 returned event drift, stated 475 versus actual 476. This is a projection of the required completion; final proof and counts are reported separately.

Read schemas/event-v1.schema.json $defs.result. It requires criterion_id, status, evidence but still restricts status to satisfied. Current verify-log and the executed completion:test support all three requested statuses. Results use those exact fields and the current writer's vocabulary. No schema was edited.
