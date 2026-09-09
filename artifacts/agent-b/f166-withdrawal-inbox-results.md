# F166 withdrawal inbox results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: `withdrawal-inbox-rule`.
Handoff: `01a0864a-ef80-737f-a01e-470da79fe511`.
Starting HEAD: `ca8d772e6d9c67792bd10735530d7b20fd5dced2`.

## Observed result

All four handoff criteria are satisfied by the local observations below. The inbox excludes withdrawals by type. Ordinary unanswered handoffs remain listed. An addressee can still append one completion of a withdrawal without that withdrawal appearing in its inbox; a second completion is refused. The verifier and schemas are unchanged.

## Bound context and integrity

Read `AGENTS.md`, `PROTOCOL.md`, `engramport.yaml`, `actors/agent-b.yaml`, the entire specified handoff envelope and body, and `$defs.result` in `schemas/event-v1.schema.json`. Initial `npm run proof:verify` exited 0 with 521 events across 108 threads and 3 actors. `npm run engram -- inbox --actor agent-b` listed three pending events; only the specified handoff was handled.

Resolved the bounded event id to `events/agent-b/20260909T130639Z_01a08647-12cd-7a54-8190-65abf3bc15c1.md` and opened it and its results artifact. `shasum -a 256 artifacts/agent-b/adr-0052-withdrawal-results.md` produced `41da5910a892b552bbbbdc2f027033eb96702b9dd86b0bd5c2edb8653bde9202`, matching the accepted reference. Those historical observations are context, not evidence that this run passed.

Before publishing this completion, `git diff --exit-code HEAD -- events artifacts actors schemas packages/git-adapter/src/verify-log.mjs` exited 0 with no output. Existing accepted files, actor records, schemas and verifier source remain unchanged. `git diff --check` exited 0. A fresh `npm run proof:verify` again exited 0 with 521 events across 108 threads and 3 actors.

## Criteria

| Criterion id | Status | Evidence observed in this run |
| --- | --- | --- |
| withdrawal-not-listed | satisfied | Pre-fix CLI inbox control exited 1 with original=false withdrawal=true ordinary=true. Current control observed original=false withdrawal=false ordinary=true. Removing the exclusion in a temporary source copy restored withdrawal=true and failed the matching assertion. |
| late-completion-still-lawful | satisfied | After CLI inbox excluded the withdrawn handoff and withdrawal, append accepted the addressee's completion with original criteria and refused a second with parent has 2 replies. Existing non-handoff controls observed empty inboxes and accepted one completion for next=null and next=a, then refused the second. |
| other-work-unchanged | satisfied | The same temporary scaffold had an ordinary unanswered handoff. CLI inbox listed it before withdrawal, after withdrawal, and after late completion and the refused duplicate. |
| suite-green-with-mutations | satisfied | All four named suites exited 0. Withdrawal executed=15 killed=15; completion executed=5 killed=5; SDK init executed=10 killed=10. The unchanged historical log verified, and proof tests passed 53/53. |

## Commands and exits

| Command | Exit | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-name-pattern='^ADR52 F166' tests/withdrawal.test.mjs` before production edit | 1 | Expected discrimination: withdrawal still listed; 1 failed control. |
| `npm run withdrawal:test` | 0 | 25 passed, 0 failed; 1 pre-fix-only test skipped in current-source run and executed separately in the mutation driver. `ADR52_MUTATIONS executed=15 killed=15 survived=0 restored=0`. Here restored=0 is the final restored run exit status. |
| `npm run completion:test` | 0 | 8 passed, 0 failed; `F157_MUTATIONS executed=5 killed=5 survived=0 restored=0`. |
| `npm run bctx:test` | 0 | 3 passed, 0 failed. |
| `npm run sdk:package:test` | 0 | 3 passed, 0 failed; `SDK_INIT_MUTATIONS executed=10 killed=10 restored=10`. Local tarball packing, installation and SDK exercises completed. |
| `npm run proof` | 0 | Verified 521 events across 108 threads and 3 actors; 53 passed, 0 failed. |
| `node_modules/.bin/eslint packages/git-adapter/src/event-core.mjs tests/withdrawal.test.mjs tests/run-withdrawal-mutations.mjs` | 0 | No lint output. |
| `node --test tests/repository-surface-policy.test.mjs` | 0 | 4 passed, 0 failed. |
| `npm run proof:verify` before completion | 0 | Verified 521 events across 108 threads and 3 actors. |

## Implementation and scope

The production edit adds `event.meta.type !== "withdrawal"` to `resolveWorkInbox`. Tests use real append operations and invoke the CLI inbox command in child processes with temporary scaffolds. The new mutation removes that predicate only in a temporary source copy; its kill requires both the exact control failure and the observation that the withdrawal was listed while the ordinary handoff stayed listed. The existing mutation runner restores copied source and reruns its baseline.

`PROTOCOL.md` gained one sentence describing thread discovery and late completion without an inbox entry. `docs/constraints.md` gained an F166 closure. SDK package tests rebuilt `packages/sdk/dist/`, which remains ignored under existing repository rules. No manifest change was necessary. No schema change, verifier change, package publication, push, or withdrawal append to the repository log occurred. No work was performed on `second-builder-dry-run` or `second-builder-dry-run-2`. No full `npm test`, deployment, provider execution or external-effect claim is made.

## Raw command logs

The completion artifact list binds each log below independently. Digests were measured with `shasum -a 256 artifacts/agent-b/f166-*.log` and checked while preparing this artifact.

| Path | SHA-256 |
| --- | --- |
| `artifacts/agent-b/f166-bctx.log` | `c948153574c4c1537825a4b5e986c0162fffa88dec7573bcc08b3ed7fdfc63ca` |
| `artifacts/agent-b/f166-completion.log` | `6cb5885647c5224722d8ac318474db034451cbcfca8e1b091d1a7375e943af4f` |
| `artifacts/agent-b/f166-lint.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `artifacts/agent-b/f166-pre-completion-verify.log` | `4dfe732687dd65aabddf08ef8ee660b70b0604bd65acd5f26947d32837b3bf9a` |
| `artifacts/agent-b/f166-pre-fix.log` | `7d5b9680d9ac1f1ab6c96c842678dea3fde5345900fabda93a40c3f3bd8237f0` |
| `artifacts/agent-b/f166-proof.log` | `f642b1a69534e527f00e93051ca30cdb3538dfd66f788577400bdcff7bbf42aa` |
| `artifacts/agent-b/f166-sdk-package.log` | `d4b2f369e1a7f8794536754becdd1eb6512625ea0a6631917ad4811a88c28a22` |
| `artifacts/agent-b/f166-surface-policy.log` | `3ebb618056e2ea9c36b34a7e0ce530c88333ce76f1c550f5eb85a236be4bda07` |
| `artifacts/agent-b/f166-withdrawal.log` | `821878f56d3b5ea461a5c563b44226ece51ed48076f60235f7f791236a350c12` |
