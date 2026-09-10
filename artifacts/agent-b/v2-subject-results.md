# V2 subject implementation results

Actor: agent-b, Codex Builder.
Handoff: 01a08d9c-e101-72ef-b158-2822663ccf63, thread v2-subject-blob.
Base revision: fd4e651a5af1513c34ef59572321565be9e725cd.
Environment observed with `node -p 'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,observed_at:new Date().toISOString()})'`: Node v26.5.0, darwin, arm64, 2026-09-10T23:36:31.574Z. Dirty Git worktree with the log at its root.

## Bound evidence

Read the complete handoff and its bound event at events/agent-b/20260910T173045Z_01a08c5f-3832-733f-add7-f2787b64ad98.md, then opened its results artifact. `shasum -a 256 artifacts/agent-b/adr54-results.md` returned 6886eafa8f5b3520991752695cf8dd7a8d7e5da51f1140e830311f3581af6e50, matching the event pin. Read the ADR 0054 amendment. Historical results were treated as evidence, not new observations.

## Change

The v2 schema and verifier now require null, `blob:<40 lowercase hex>`, or `worktree:<1 to 200 non-whitespace characters>` for version.subject. The verifier emits V2_ENV_SUBJECT for invalid subjects; the existing CLI propagates it unchanged. PROTOCOL.md documents committed blob bytes and working-tree path semantics. AGENTS.md tells builders to use `git rev-parse HEAD:<path>` for committed blob subjects and the worktree prefix for working-tree reads. The unpublished 0.5.0 changelog records the change.

This implements the handoff's exact syntax rule. It does not establish that a blob exists, attest to the observed bytes, or enforce path resolution inside the repository. Existing accepted events and artifacts were not edited. The existing ADR54 fixture subject was updated to worktree:fixture so unrelated environment tests retain valid inputs.

## Commands and observed results

All listed commands completed with exit 0.

- `npm run build --prefix packages/sdk`: SDK 0.5.0 rebuilt before CLI controls. No publication.
- `node --test tests/adr54.test.mjs`: `tests 39`, `pass 39`, `fail 0`, `skipped 0`.
- `ADR54_USE_BUNDLE=1 node --test tests/adr54.test.mjs`: `tests 39`, `pass 39`, `fail 0`, `skipped 0` against the rebuilt bundle.
- `node tests/run-adr54-mutations.mjs`: `ADR54_MUTATIONS executed=27 killed=27 survived=0 restored=0`. Here restored=0 is the restored test process exit code. The runner mutates a disposable source copy, restores it, and reruns the full ADR54 controls.
- `npm test`: completed the entire command chain with exit 0. The final rendered HTML test block reported `tests 4`, `pass 4`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`. These four are the final block, not an aggregate count. The full output is retained in v2-subject-npm-test.log.
- `npm run proof:verify`: `verified 609 events across 129 thread(s) and 3 actors` before the completion, both before and after implementation. No historical event failed the new subject rule.
- `git diff --check`: exit 0.

The npm test run explicitly skipped Docker gates w1-7:canary, db:test, and kms:test because access to the Docker socket was denied. It also emitted OIDC_RUNTIME_SKIP for Node 26.5.0 and skipped the conditional ADR52 pre-fix baseline test. A successful aggregate exit does not establish results for those skipped checks.

## Paired controls and mutation

Source and rebuilt-bundle controls invoke both appendEvent and the actual CLI in disposable fixture repositories. blob, worktree, and null subjects append and verify. Bare path `packages/sdk/src/cli.mjs` and release `0.5.0` are refused with V2_ENV_SUBJECT in the CLI output. Schema validation independently agrees for every case. Additional controls cover short and uppercase blob IDs, empty and whitespace-containing worktree subjects, and the 200/201 character boundary.

The discriminating mutation removes only the V2_ENV_SUBJECT verifier guard in a disposable source copy. The observed witness was `ADR54_MUTATION name=subject killed=true witness=# ADR54_OBS subject-bare ok=true errors=[] executed=1`: the bare path appended, causing its refusal assertion to fail. Restoring the original copy returned all ADR54 controls to exit 0. The working source guard remained intact.

## Criteria

- schema-and-protocol: satisfied.
- verifier-refuses-free-text: satisfied.
- mutation-kills: satisfied.
- history-verifies: satisfied. Historical verification and the complete npm test command passed, with the explicit skipped-check limits above.

## Evidence digests

Produced by `shasum -a 256` over the completed logs:

```text
96ef189f7d17c90dc3eef119c8c2ed74ab0f9aa4d74a28052b22909bff591680  artifacts/agent-b/v2-subject-build.log
e69d4503c0953b7e2b527c9b85d6c14797722e9e89bca16f3c766ba4452fce26  artifacts/agent-b/v2-subject-bundle-controls.log
a7dd9d89f7f0a596554c3e006d078e1f525c882843583b92c902c56d525fb6aa  artifacts/agent-b/v2-subject-controls.log
248d0870392f86f7e473549030036d36ff66c2489766e3f1a8ab49d74c0028d7  artifacts/agent-b/v2-subject-history.log
6115ac8d0c994773ea661d606fd9cc72a4d64a807468071919a1466c5fd86f44  artifacts/agent-b/v2-subject-mutations.log
e409382bf3b879967822b75c1433d0827650d5f05282f60be4074fd79361e969  artifacts/agent-b/v2-subject-npm-test.log
```
