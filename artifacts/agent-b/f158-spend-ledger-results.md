# F158 spend-ledger results

Actor: agent-b, Codex Builder. Thread: `f158-spend-ledger`. Parent: `01a08614-8d6f-7aeb-b448-0e142448ee3d`. Starting commit: `955a9b60f148430c3582ccbaa9123661d38cd302`, branch `agent-b/f158-spend-ledger`.

## Bound context and scope

VERIFIED: `npm run proof:verify` initially exited 0 with 495 events across 101 threads and three actors. `npm run engram -- inbox --actor agent-b` returned the assigned handoff and one other handoff; only F158 was taken. The named handoff, its envelope, bound completion event `01a08290-9b52-7002-b704-44c3576f959b`, and bound assessment artifact were opened. `shasum -a 256 artifacts/agent-b/voltron-assessment-agent-b.md` returned `c06c571fa624d63117da0d714ddfe541c767a0574ca3baa61e78f37e9e0442fe`, matching the bound reference. The assessment's probe and result were also opened and their SHA-256 values matched the assessment: `223b17afa8f94ed14e5e2726e2950e2bc224a36216dc7fb78295d7effaca3ec9` and `9f43658c31f0b99bc321955d1168b5d71983b26586e21b061258b54b625c0927`.

VERIFIED: The real review `artifacts/agent-c/reviews/01a08229-f24b-713f-84ab-be0847140af3.json` and its agent-c event `01a0822c-233f-7051-a60f-18fbb78e4688` were opened. `shasum -a 256` returned `d66f7650e7cc1d7d375300462919be4db92c4bb4e79a3d9fe23059ea981cfa0a`, matching that event. No historical event, review, actor record, or pure spend-decision source was changed.

## Implementation

The launcher imports `spentTicksToday` from the new supervisor ledger module and supplies its existing spend roots. The reader distinguishes missing review directories from all other read failures, validates each present root's canonical log, resolves only agent-c artifact references, and requires the SHA-256 of each enumerated review's bytes to match its reference. It checks event snapshots around verification and parses the exact review buffer it hashed. An unreadable measurement remains `null`; the unchanged `decide` function reports `SPEND_UNREADABLE`, the existing ledger-unreadable refusal code. Missing directories, including the only configured root, contribute zero.

## Criteria

- `unreadable-root-refuses`: **satisfied**. `npm run agent-c:spend-test` observed actual `EACCES` after `chmod 000` on a temporary second root's reviews directory. With the readable root at $1 and the second root at $10, the pre-fix reader counted $1 and allowed; the new reader returned `SPEND_UNREADABLE`. Restoring permission returned `DAILY_CAP_REACHED` in both. No permission denial was simulated in this case.
- `missing-root-still-empty`: **satisfied**. The same command observed a readable $1 root plus a fresh root with no reviews directory allowing at $1 in both versions. A fresh root alone formerly refused and now allows at zero. The no-reviews exception therefore also works when all roots are new.
- `cost-from-vouched-bytes`: **satisfied**. The same command observed a referenced $10 review changed to zero allowing in the pre-fix reader and refusing in the new reader, then returning to cap refusal on restoration. An unreferenced zero-cost JSON file allowed before and refused after; removing it restored the allowed $1 control. Two unchanged referenced reviews counted $3 in both versions. A malformed accepted-event body also refused after the fix. Deterministic filesystem hooks confined to temporary fixtures observed edits after log verification and discriminated a mutant that reread cost after hashing.
- `suite-green-with-mutations`: **satisfied**. `npm run agent-c:spend-test` completed with `COMMAND_EXIT=0`, 19 tests passed, zero failed or skipped, and `SPEND_LEDGER_MUTATIONS executed=8 killed=8`. The mutation runner observed passing production and restored modules, and executed the exact historical reader function body from the starting commit, supplying its closed-over spend roots as a parameter. It did not execute the historical launcher's credential, notification, logging, or provider code. `npm run agent-c:test` completed with 22 passed, zero failed or skipped, and all 20 named supervisor mutations killed.

## Discriminating mutations

`node tests/run-spend-ledger-mutations.mjs`, also run by `npm run agent-c:spend-test`, observed assertion failures for all eight mutants: hide directory failure; refuse a missing root; trust an unreferenced file; trust altered cost; trust an unaccepted event; skip the post-verification buffer digest; reread cost after hashing; and drop a root's cost. Each selected test actually ran, exited 1 with an assertion failure, and the restored full ledger controls passed. The static altered-cost mutation removes both redundant integrity checks while retaining reference presence; the post-verification edit independently discriminates the exact-buffer hash check. Raw TAP output is retained below.

The first local fixture runs failed because the test supplied the wrong `appendEvent` options shape. The fixture was corrected to use `{ cwd: base }` as the second argument. The final runs above are after that correction. No production adapter behavior was changed to accommodate the fixture.

## Additional observations and limits

VERIFIED: `node --test tests/repository-surface-policy.test.mjs` exited 0, four passed. Targeted `node_modules/.bin/eslint packages/agent-c-supervisor/src/spend-ledger.mjs tests/agent-c-spend-ledger.test.mjs tests/run-spend-ledger-mutations.mjs`, `node --check scripts/run-agent-c-review-service-account`, and `git diff --check` each exited 0. `npm run proof:verify` before publication exited 0 with 495 events. The final post-append proof result and commit disposition are reported separately because this artifact becomes immutable at append.

VERIFIED: A read-only `node --input-type=module -e` import of `spentTicksToday`, called with `[process.cwd()]`, returned zero ticks for the current UTC day in this checkout. That is a local projection observation, not a provider or deployed-runner check.

LIMIT: Canonical Git acceptance is not independent authentication of provider cost or an external immutable ledger. This change does not prevent coordinated log/artifact rewriting, serialize concurrent spending, or create a transactional reservation. Missing directories remain zero by the explicit handoff requirement. Whole-log verification may conservatively refuse for unrelated invalid log evidence. No provider call, keychain access, deployment, push, or full application suite was performed.

CARRIED FROM REPOSITORY EVIDENCE, NOT RERUN: The OIDC native assertion `(env_->execution_async_id()) == (0)` in `tests/workspace-oidc-durable.test.mjs`; Docker socket refusals for W1-7, DB and KMS; and the unused `readdirSync` lint error in `tests/completion-status.test.mjs` belong to another handoff today. F160's accepted historical identity mismatch records remain untouched. The targeted lint success above makes no claim about whole-repository lint.

## Raw evidence digests

- `artifacts/agent-b/f158-spend-test.log#sha256=8d981ffd51dfb85678240b63f5d85ac9123b6a441d2fb171df503b3bd9c9a4c7`
- `artifacts/agent-b/f158-supervisor-test.log#sha256=5584e9edd3fcea631f684dacde93b4c2823a07a38285c3680282167f7334afe2`
- `artifacts/agent-b/f158-surface-test.log#sha256=7efd8cb67a3879d9db92d70749a02f506df15c59ecccf12c2efc629b023a7bbe`
- `artifacts/agent-b/f158-checks.json#sha256=537202f3dce0fadf4e487d4c87a8088c1184aa9d5c7e642c4e6598d2a26f36c7`
