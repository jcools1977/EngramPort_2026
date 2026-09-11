# Identity guard completion evidence

Actor: agent-b, Codex Builder.
Handoff: 01a09052-1d32-7549-80a0-a61908cecab5, thread identity-guard.
Base revision: 71e743d019b9591eb91bbd2e2952248e855d7b34.

## Bound context resolved

Read the complete handoff and bound event events/agent-a/20260911T002320Z_01a08dd8-f364-7a3a-aed0-7120f59e6043.md, then its artifact artifacts/agent-a/roadmap-2026-09-11.md.
Command: `shasum -a 256 artifacts/agent-a/roadmap-2026-09-11.md`.
Observed digest: 3949c60fa79d6d25dc0030e273dc1a482902f268bf4cf1d39d48f7a561890e2e, matching the event reference.
These records were treated as evidence, not authority to expand the handoff.

## Implementation

The executable Bash hook reads pre-push updates, skips deletions, and checks remote_sha..local_sha or local_sha --not --remotes for new branches. Each selected commit is queried with `git show -s --format=%H|%G?|%ae|%GS` using the configured allowed-signers file or the home-directory fallback. Missing trust refuses. A non-G signature or differing author and signer refuses with the SHA, author, signer, and signature status, except for exact SHA fields in the accepted record. Full record validation remains in the existing identity control, unchanged. The hook checks no other policy and requires only Bash and Git.

`npm test` invokes the new `pre-push:test` first. AGENTS.md item 7 names the hook and dispatcher-owned delegation from the estate hook. No external hook installation or push occurred. Keys, synthetic trust files, mutation copies, and the bare remote existed only inside the temporary fixture, which the test removes.

## Criterion results

- refuses-mismatch: satisfied. The synthetic mismatch refuses with all three identities named; unsigned refuses with signature=N.
- allows-clean-and-recorded: satisfied. Clean and recorded mismatch pass; equal endpoints pass; a clean new commit above an already-pushed mismatch passes while a new unpushed mismatch refuses.
- mutation-kills: satisfied. Removing only the author/signer comparison in the fixture copy permits the mismatch. Restoring the copy refuses it. The repository hook remains byte-identical throughout.
- wired-and-documented: satisfied. npm test executed the guard and printed its summary. AGENTS.md names the hook. Missing trust refuses. This criterion does not claim the entire npm test chain passes.

## Observed targeted commands

`node --test tests/pre-push-guard.test.mjs` under Node v26.8.2 exited 0: 1 test passed, 0 failed, 0 skipped.
After tightening the fallback test to verify a new signed commit, `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run pre-push:test` under Node v22.23.2 exited 0. Final-source output:

```text

> engramport@0.1.0 pre-push:test
> node --test tests/pre-push-guard.test.mjs

TAP version 13
# PRE_PUSH_GUARD mismatch exit=1 pre-push: refusing d04b353b30fd9f65e69999b03ae14d615c1aa213 author=a@example.invalid signer=b@example.invalid signature=G
# PRE_PUSH_GUARD clean exit=0
# PRE_PUSH_GUARD unsigned exit=1 pre-push: refusing c50dba7601fb7f7eb60565816295937a5460ee8e author=a@example.invalid signer=<none> signature=N
# PRE_PUSH_GUARD multiple-updates exit=1 pre-push: refusing d04b353b30fd9f65e69999b03ae14d615c1aa213 author=a@example.invalid signer=b@example.invalid signature=G
# pre-push: refusing c50dba7601fb7f7eb60565816295937a5460ee8e author=a@example.invalid signer=<none> signature=N
# PRE_PUSH_GUARD recorded-mismatch exit=0
# PRE_PUSH_GUARD record-must-match-full-sha exit=1 pre-push: refusing d04b353b30fd9f65e69999b03ae14d615c1aa213 author=a@example.invalid signer=b@example.invalid signature=G
# PRE_PUSH_GUARD already-pushed-range exit=0
# PRE_PUSH_GUARD new-branch-excludes-remote-history exit=0
# PRE_PUSH_GUARD new-branch-checks-unpushed exit=1 pre-push: refusing 5515b31e818cb5f004c5e9f78c5e596dc038bf48 author=a@example.invalid signer=b@example.invalid signature=G
# PRE_PUSH_GUARD ref-deletion exit=0
# PRE_PUSH_GUARD missing-signers exit=1 pre-push: refusing: no allowed-signers file at the configured path or ~/.ssh/engramport_allowed_signers
# PRE_PUSH_GUARD fallback-signers exit=0
# PRE_PUSH_GUARD untrusted-signature exit=1 pre-push: refusing bdae6e7fcc65706a18045d4b742e0be63430b843 author=a@example.invalid signer=<none> signature=U
# PRE_PUSH_GUARD mutation-comparison-removed exit=0
# PRE_PUSH_GUARD mutation-restored exit=1 pre-push: refusing d04b353b30fd9f65e69999b03ae14d615c1aa213 author=a@example.invalid signer=b@example.invalid signature=G
# PRE_PUSH_GUARD_SUMMARY paired refusals, clean and recorded allowances, remote ranges, missing trust, and comparison mutation passed
# Subtest: pre-push identity guard paired controls and discriminating mutation
ok 1 - pre-push identity guard paired controls and discriminating mutation
  ---
  duration_ms: 689.694416
  type: 'test'
  ...
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 748.3615
```

`./node_modules/.bin/eslint tests/pre-push-guard.test.mjs`, `bash -n scripts/git-hooks/pre-push`, and `git diff --check` each exited 0 with no diagnostics.
`npm run proof:verify` before work and again before publication exited 0: verified 619 events across 132 threads and 3 actors.

## Broader npm test observations and limits

The initial `npm test` under Node v26.8.2, before moving the guard to the start of the chain, exited 1 in d1:controls:test. D1 reported 24 tests, 20 passed, 3 failed, and 1 skipped. It did not reach identity:test. Failures named the three variant-drift controls; the output included a Vite temporary-file EPERM refusal.

`PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test` under Node v22.23.2 exited 1. The new guard passed within this chain and printed:

> PRE_PUSH_GUARD_SUMMARY paired refusals, clean and recorded allowances, remote ranges, missing trust, and comparison mutation passed

This npm run preceded the fallback-test tightening, which was then verified by the final-source targeted command above. Docker gate controls passed 14 tests. D1 controls reported 24 tests, 19 passed, 4 failed, and 1 skipped. The three variant-drift failures persisted, and the canary-budget test timed out at 100ms. The full npm suite is not green; later chain commands were not reached. These failures are outside the handoff's editable bounds and were not repaired. The overlapping full-suite attempts may have influenced timing; no causal conclusion is claimed for the timeout.

Selected exact Node 22 failure output follows:

```text
not ok 1 - D1 every source variant applies, loads, and preserves or rewrites imports by tree shape
  ---
  duration_ms: 18638.555958
  type: 'test'
  location: '/Users/an2b/an2b/products/EngramPORT-guard/tests/d1-variant-drift.test.mjs:8:1'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly deep-equal:
    + actual - expected
    
    + [
    +   'SDK prerequisite build failed: failed to load config from /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-variant-drift-rA8igY/source/packages/sdk/vite.config.mjs\n' +
    +     'error during build:\n' +
    +     "Error: EPERM: operation not permitted, open '/private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-variant-drift-rA8igY/source/node_modules/.vite-temp/vite.config.mjs.timestamp-1789127857023-cfe54816f44b2.mjs'\n" +
    +     '    at async open (node:internal/fs/promises:639:25)\n' +
    +     '    at async Object.writeFile (node:internal/fs/promises:1222:14)\n' +
    +     '    at async loadConfigFromBundledFile (file:///Users/an2b/an2b/products/EngramPORT/node_modules/vite/dist/node/chunks/node.js:34889:3)\n' +
    +     '    at async bundleAndLoadConfigFile (file:///Users/an2b/an2b/products/EngramPORT/node_modules/vite/dist/node/chunks/node.js:34752:17)\n' +
    +     '    at async loadConfigFromFile (file:///Users/an2b/an2b/products/EngramPORT/node_modules/vite/dist/node/chunks/node.js:34719:42)\n' +
    +     '    at async resolveConfig (file:///Users/an2b/an2b/products/EngramPORT/node_modules/vite/dist/node/chunks/node.js:34345:22)\n' +
    +     '    at async createBuilder (file:///Users/an2b/an2b/products/EngramPORT/node_modules/vite/dist/node/chunks/node.js:33530:17)\n' +
    +     '    at async CAC.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT/node_modules/vite/dist/node/cli.js:766:19) {\n' +
    +     '  errno: -1,\n' +
    +     "  code: 'EPERM',\n" +
    +     "  syscall: 'open',\n" +
    +     "  path: '/private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-variant-drift-rA8igY/source/node_modules/.vite-temp/vite.config.mjs.timestamp-1789127857023-cfe54816f44b2.mjs'\n" +
    +     '}\n',
    +   'make_sdk_published_surface_variant:default anchor/build failure: node:fs:440\n' +
    +     '    return binding.readFileUtf8(path, stringToFlags(options.flag));\n' +

not ok 2 - D1 drift control rejects a broken correspondent import and a missing Port Watch anchor
  ---
  duration_ms: 16856.025042
  type: 'test'
  location: '/Users/an2b/an2b/products/EngramPORT-guard/tests/d1-variant-drift.test.mjs:26:1'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:
    
    7 !== 5
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 5
  actual: 7
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT-guard/tests/d1-variant-drift.test.mjs:44:12)
    Test.runInAsyncScope (node:async_hooks:214:14)
    Test.run (node:internal/test_runner/test:1047:25)
    Test.processPendingSubtests (node:internal/test_runner/test:744:18)
    Test.postRun (node:internal/test_runner/test:1173:19)
    Test.run (node:internal/test_runner/test:1101:12)
    async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
  ...
# Subtest: D1 drift control rejects import rewriting in every whole-tree builder
not ok 3 - D1 drift control rejects import rewriting in every whole-tree builder
  ---
  duration_ms: 16522.013541

not ok 3 - D1 drift control rejects import rewriting in every whole-tree builder
  ---
  duration_ms: 16522.013541
  type: 'test'
  location: '/Users/an2b/an2b/products/EngramPORT-guard/tests/d1-variant-drift.test.mjs:50:1'
  failureType: 'testCodeFailure'
  error: 'make_sdk_published_surface_variant'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT-guard/tests/d1-variant-drift.test.mjs:63:50)
    Test.runInAsyncScope (node:async_hooks:214:14)
    Test.run (node:internal/test_runner/test:1047:25)
    Test.processPendingSubtests (node:internal/test_runner/test:744:18)
    Test.postRun (node:internal/test_runner/test:1173:19)
    Test.run (node:internal/test_runner/test:1101:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
  ...
# Subtest: all five canary branches count real synthetic baseline timeouts and fail before mutation
ok 4 - all five canary branches count real synthetic baseline timeouts and fail before mutation
  ---
  duration_ms: 1114.477917
  type: 'test'
  ...
# Subtest: the timeout control kills reporting a timed-out baseline as baseline=1 and passes after restoration
ok 5 - the timeout control kills reporting a timed-out baseline as baseline=1 and passes after restoration

not ok 7 - the declared canary budget overrides the default while an ordinary test retains its budget
  ---
  duration_ms: 158.713458
  type: 'test'
  location: '/Users/an2b/an2b/products/EngramPORT-guard/tests/d1-baseline-timeout.test.mjs:105:1'
  failureType: 'testCodeFailure'
  error: |-
    The input did not match the regular expression /ok 1 - canary budget override/. Input:
    
    'TAP version 13\n' +
      '# Subtest: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-timeout-DVHmKN/budget.test.mjs\n' +
      'not ok 1 - /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-timeout-DVHmKN/budget.test.mjs\n' +
      '  ---\n' +
      '  duration_ms: 102.170041\n' +
      "  type: 'test'\n" +
      "  location: '/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-timeout-DVHmKN/budget.test.mjs:1:1'\n" +
      "  failureType: 'testTimeoutFailure'\n" +
      "  error: 'test timed out after 100ms'\n" +
      "  code: 'ERR_TEST_FAILURE'\n" +
      '  ...\n' +
      '1..1\n' +
      '# tests 1\n' +
      '# suites 0\n' +
      '# pass 0\n' +
      '# fail 0\n' +
      '# cancelled 1\n' +
      '# skipped 0\n' +
      '# todo 0\n' +
      '# duration_ms 106.661292\n'

  type: 'test'
  ...
1..24
# tests 24
# suites 0
# pass 19
# fail 4
# cancelled 0
# skipped 1
# todo 0
# duration_ms 102667.629625
```

## Final source digests

Command: `shasum -a 256 scripts/git-hooks/pre-push tests/pre-push-guard.test.mjs AGENTS.md package.json`.

```text
4ae6dacb62b2d1e27d30d1de9b038aff3c76e1005d4e9f8cbd2637ab20d42eb6  scripts/git-hooks/pre-push
e2c88c398258021e6b217a989ab08b725bd379aa31b787c6fff1dce9369148c6  tests/pre-push-guard.test.mjs
3976a6f48a846cc193807bb6385feccee0cc764662d5ca2f706306590974a23d  AGENTS.md
56880603ae49cad2c21d20ec054a85c90723120086cc1e733d9fd998f0214a32  package.json
```
