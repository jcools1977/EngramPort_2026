# F174 checkout results

Handoff: 01a08d6c-64cf-74d4-b5c8-3aeaab933ea3, thread f174-checkout.
Source revision: e102012138bea9d5e33839fe02828b46f522cdf7 plus this uncommitted patch.
Environment: Darwin arm64, Node v26.5.0, branch agent-b/f174, Git worktree with real node_modules.

## Results

- init-writes-attribute: satisfied. `npm run sdk:package:test` observed five scaffold paths, exact `* -text` contents, and packed artifact verification after checkout with core.autocrlf=true. Dropping the scaffold attribute produced CRLF bytes and CHECKOUT_ALTERED_BYTES. Attribute mutation executed=1, killed=1.
- verifier-names-cause: satisfied. `node --test tests/f174-checkout.test.mjs tests/repository-surface-policy.test.mjs` observed CRLF-only diagnosis and hash mismatches for a one-byte edit, combined rewrite/edit, and trailing-space edit in both consumers before any commit. A non-UTF-8 byte and lone CR were preserved. Normalization mutation executed=1, killed=1.
- one-helper: satisfied. The same focused command checked both calls to verifyArtifactDigest and rejected source mutations replacing either call with a restated comparison. Structural mutations executed=2, killed=2.
- repository-attribute: satisfied. The focused command checked the actual root attribute, AGENTS.md declaration, policy acceptance, and undeclared-root rejection.
- suite-green-with-mutations: satisfied. `npm run proof`: 53 passed; `npm run bctx:test`: 3 passed; `npm run sdk:package:test`: 5 passed and SDK_INIT_MUTATIONS executed=10 killed=10 restored=10; `node --test tests/adr54.test.mjs`: 28 passed; `node tests/run-adr54-mutations.mjs`: executed=26 killed=26 survived=0. All commands completed with exit 0. Final `npm run proof:verify` verified 597 events across 125 threads and 3 actors. `git diff --exit-code HEAD -- events actors` returned 0.

## Bound context verification

Read the handoff in full, its dispatch and criteria artifacts, the bound agent-c event 01a08d6b-e519-7397-97c9-bde02aea2439, and that event's review artifact. `shasum -a 256` matched:
- artifacts/agent-a/f174-dispatch-final.md: dccab0da02bc47119c8ae09c30d8a6dd50f5414cfe690c86afb302230b1bfbcd
- artifacts/agent-a/f174-criteria-final.json: 6cb50df7a2be3b81e65508b7dfb4fdc9ed1a3af54b63427f27c0c04a20c05635
- artifacts/agent-c/reviews/01a08d68-209a-76d5-9b17-b98b3d7a3df6.json: 345b10c2de4d67ff079ba2150443819576fc1aa77016af015b50e36066766251

## Delivery boundary

No completion event was appended and no repository commit or push was attempted, honoring the final operator instruction: "Nothing on the live log; commit nothing." Temporary scaffold commits exercised the requested checkout behavior only. Criteria results are prepared as a local JSON artifact. SDK bundles were rebuilt by npm pack's prepack step; dist is ignored by this repository. No package was published. This does not claim native Windows validation or arbitrary checkout-filter protection.

Staging attempt: `git add -- <explicit changed and created paths>` exited 128: unable to create `/Users/an2b/an2b/products/EngramPORT/.git/worktrees/EngramPORT-f174/index.lock`, Operation not permitted. Files remain unstaged because the Git index is outside the writable sandbox. No agent-commit was attempted, per the final no-commit instruction.

## Transcript digests

Command for each: `shasum -a 256 <path>`.

```
aba92687cc1c13a979ed9b7e5a3c4086a057d57ea9786e9092e4689ce2c99bab  artifacts/agent-b/f174-adr54-mutations.log
cf1f0c178f31b1c9fdddf391456f7ee528e8dab40a5858ef08831c735f3b8acc  artifacts/agent-b/f174-adr54.log
b406830c521ea306395375aed4d7e9a1195830b3075ee7c263c2b4a8dc64983f  artifacts/agent-b/f174-bctx.log
f90e4f28cae887d19bd97ee11f0f66abe470f1701dd8ba840182a0ad668e14f1  artifacts/agent-b/f174-final-verification.log
4768403e81a44997d6fe0d35d4b6e34a61c79dce20a08aecdfd75b03ff5aad07  artifacts/agent-b/f174-focused.log
4d4570abcba36bcbf2477a212e9617d82bca7f880ef0b6ec24b87a4179915165  artifacts/agent-b/f174-proof.log
ea4588444cded1274083e0beab8a7dbde8f274fd2ac9e83bd1fbb1ee4410da11  artifacts/agent-b/f174-sdk-package.log
```
