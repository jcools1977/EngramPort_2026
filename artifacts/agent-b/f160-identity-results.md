# F160 accepted identity mismatches: agent-b results

Actor: agent-b, Codex Builder. Thread: identity-accepted-mismatches.
Handoff: 01a0829a-b380-72fd-bb29-16e6990f4264.
Starting commit: bc198f2da9cd2bd5c3a4a72ea0518652c3ca889d.
Branch: agent-b/identity-accepted-mismatches.

## Bound evidence and initial observations

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full handoff, and schemas/event-v1.schema.json $defs.result.
`npm run proof:verify` exited 0: 485 events across 97 threads and 3 actors. `npm run engram -- inbox --actor agent-b` listed this handoff; no other handoff was worked.
Resolved the bounded event to `events/agent-b/20260908T195223Z_01a08294-2c71-740e-b908-85f7cc7ae610.md` and read its artifact in full.
`shasum -a 256 artifacts/agent-b/sdk-init-20260908-results.md` returned `10e4014784f1e411566f42a4db90fa8690cf841baf769643eb0fbaa58f78c65f`, matching its reference.

The initial `npm run identity:test` exited 1 with 1 passed and 1 failed, naming 502ab6f and 2f033ec as signature/author disagreements.
`git -c gpg.ssh.allowedSignersFile=/Users/an2b/.ssh/engramport_allowed_signers show -s --format='%H|%aI|%ae|%G?|%GS' 2f033ec 502ab6f` returned:

```
2f033ec52f2b1cc28228b347f2945f851b86d4c0|2026-09-08T15:15:52-04:00|agent-a@engramport.local|G|luke@covenantsystems.ai
502ab6f008f99ec52b07bb812e4d9f6745e88909|2026-09-08T15:56:34-04:00|agent-b@engramport.local|G|luke@covenantsystems.ai
```

## Changes and boundaries

- Added exactly one record file under docs/security: accepted-identity-mismatches.json. Its date field is the author date, not a claimed acceptance timestamp.
- The identity control reads that record and verifies full commit IDs, exact author and signer, good signatures, author date, an existing finding heading, uniqueness, actual disagreement, and membership in HEAD history before reporting acceptance. It still fails on unrecorded signed mismatches. Unsigned commits retain the original out-of-scope behavior.
- scripts/agent-commit compares the resolved public-key type and bytes with an exact actor principal in the existing external allowed-signers file. File names and comments do not establish identity. The guard supports direct, option-free entries and fails closed for unsupported syntax. It does not authenticate the external trust file or prevent a concurrent key-file substitution.
- Added synthetic signed-commit fixtures, a mutation runner under tests/, the rule-7 rebase note, and an appended F160 closure in docs/constraints.md.
- No historical commit, accepted event, referenced artifact, other actor surface, schema, package file, or unrelated source was edited. No push or history rewrite was performed.

## Criterion results

| Criterion ID | Status | Observed evidence |
| --- | --- | --- |
| recorded-mismatch-accepted | satisfied | npm run identity:test exits 0 with both entries, 1 naming the omitted full SHA with either entry removed, 1 with an empty record, and 0 after restoration. |
| record-cannot-lie | satisfied | Real signed synthetic fixture accepts its accurate record and refuses a nonexistent extra SHA, false author, and false signer; each corresponding bypass mutation fails the test. |
| agent-commit-refuses-foreign-key | satisfied | Synthetic actor key produces a verified actor-authored and actor-signed commit; foreign resolved key refuses with the stated message and unchanged HEAD; restoring actor key succeeds. Removing the guard makes the negative test fail. |
| suite-green-with-mutations | satisfied | Final identity suite passes 3/3. The completed mutation command reports executed=18 killed=18 restored=18, including each handoff property. This criterion explicitly names the identity suite; no full repository suite success is claimed. The bound sdk-init completion supplies event evidence of the earlier red identity control. |

Results use criterion_id, status, and evidence as required by $defs.result. All four statuses are satisfied, which is also valid under the checked-out schema's currently narrower status vocabulary. The known F157 schema discrepancy was not changed.

## Verification scope and expected failures

- `npm run identity:test`: final exit 0, 3 passed, 0 failed, 0 skipped.
- `node tests/run-identity-mutations.mjs`: final exit 0, executed=18 killed=18 restored=18. It runs copied tests with `node --test --test-reporter=tap <temporary-copy>/tests/commit-identity.test.mjs` against the real checkout's read-only history and synthetic fixture repositories. Every mutant has a passing baseline, a named test failure, and a passing restored run.
- `node --test tests/repository-surface-policy.test.mjs`: exit 0, 4 passed, 0 failed.
- `npm run proof:test`: exit 0, 53 passed, 0 failed, 0 skipped.
- `bash -n scripts/agent-commit` and `git diff --check`: exit 0.
- `npm run proof:verify`: before completion, exit 0, 485 events, 97 threads, 3 actors. Verification after append is reported separately by the operator turn so this artifact remains immutable.
- `npm run lint`: exit 1, only the existing unused readdirSync import in tests/completion-status.test.mjs:19. No lint fix was made.
- Carried from the bound artifact and existing constraints, not re-executed here: `npm run session:test` previously crashed in unchanged workspace-oidc-durable.test.mjs with native assertion `(env_->execution_async_id()) == (0)` on Node v26.5.0. W1-7, DB, and KMS have recorded Docker socket permission refusals. No OIDC or Docker fix, full npm test run, or live-infrastructure success is claimed.

## Mutation interpretation and fixture correction

The first mutation attempt stopped at the nonexistent-SHA mutation: skipping the only record still exposed the real unrecorded mismatch. That was a wrong-reason fixture, not a successful mutation observation. The final fixture retains the valid mismatch entry and adds a nonexistent extra entry, so bypassing existence validation now silently accepts the extra entry and the refusal assertion fails. The final completed run below replaces the incomplete attempt for counts.

Record removal and acceptance mutations fail the history test. Disabling unrecorded detection, existence, author, signer, date, finding presence, duplicate handling, entry fields, mismatch detection, or the key guard makes the paired refusal assertion fail. Full-SHA format, finding-format, signature-status, and HEAD-history mutations discriminate the expected refusal: adjacent checks can still refuse those inputs for another reason. Those are diagnostic-specificity mutations, not claims that every removed check allows an unsafe commit.

## Final identity command output

```

> engramport@0.1.0 identity:test
> node --test tests/commit-identity.test.mjs

ACCEPTED_IDENTITY_MISMATCH 2f033ec52f2b1cc28228b347f2945f851b86d4c0 author=agent-a@engramport.local signer=luke@covenantsystems.ai date=2026-09-08T15:15:52-04:00 finding=F160
ACCEPTED_IDENTITY_MISMATCH 502ab6f008f99ec52b07bb812e4d9f6745e88909 author=agent-b@engramport.local signer=luke@covenantsystems.ai date=2026-09-08T15:56:34-04:00 finding=F160
IDENTITY_REFUSAL unrecorded
IDENTITY_REFUSAL nonexistent
IDENTITY_REFUSAL author
IDENTITY_REFUSAL signer
IDENTITY_REFUSAL date
IDENTITY_REFUSAL finding
IDENTITY_REFUSAL duplicate
IDENTITY_REFUSAL array
IDENTITY_REFUSAL fields
IDENTITY_REFUSAL full-sha
IDENTITY_REFUSAL finding-format
IDENTITY_REFUSAL unverified
IDENTITY_REFUSAL not-mismatch
IDENTITY_REFUSAL outside-history
agent-commit: signing key at /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-754pzx/foreign.pub is not bound to agent-b@engramport.local in /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-754pzx/allowed_signers
agent-commit: refusing to commit under a foreign or unverified signing key
✔ repository signed mismatches require exact accepted records (972.942208ms)
✔ record validates commits and each stated fact with paired refusals (285.688375ms)
✔ agent-commit permits the actor key and refuses a foreign resolved key before commit (114.339834ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1409.224459

```

## Completed mutation output

```
IDENTITY_MUTATION record-absent baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION remove-2f033ec baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION remove-502ab6f baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION acceptance-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION unrecorded-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION existence-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION author-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION signer-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION date-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION finding-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION duplicate-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION fields-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION full-sha-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION finding-format-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION signature-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION mismatch-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION history-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATION foreign-key-guard-disabled baseline=0 applied=true after=1 expected_failure=true restored=0
IDENTITY_MUTATIONS executed=18 killed=18 restored=18

```

## Paired actual npm command runs

The record-removal runs below preceded the synthetic fixture correction; the repository record and control behavior they exercise are unchanged. Each run reached its own test summary. The original record bytes were restored in a finally block.

```
COMMAND npm run identity:test CASE both-recorded EXIT 0

> engramport@0.1.0 identity:test
> node --test tests/commit-identity.test.mjs

ACCEPTED_IDENTITY_MISMATCH 2f033ec52f2b1cc28228b347f2945f851b86d4c0 author=agent-a@engramport.local signer=luke@covenantsystems.ai date=2026-09-08T15:15:52-04:00 finding=F160
ACCEPTED_IDENTITY_MISMATCH 502ab6f008f99ec52b07bb812e4d9f6745e88909 author=agent-b@engramport.local signer=luke@covenantsystems.ai date=2026-09-08T15:56:34-04:00 finding=F160
IDENTITY_REFUSAL unrecorded
IDENTITY_REFUSAL nonexistent
IDENTITY_REFUSAL author
IDENTITY_REFUSAL signer
IDENTITY_REFUSAL date
IDENTITY_REFUSAL finding
IDENTITY_REFUSAL duplicate
IDENTITY_REFUSAL array
IDENTITY_REFUSAL fields
IDENTITY_REFUSAL full-sha
IDENTITY_REFUSAL finding-format
IDENTITY_REFUSAL unverified
IDENTITY_REFUSAL not-mismatch
IDENTITY_REFUSAL outside-history
agent-commit: signing key at /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-Xpi8Cj/foreign.pub is not bound to agent-b@engramport.local in /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-Xpi8Cj/allowed_signers
agent-commit: refusing to commit under a foreign or unverified signing key
✔ repository signed mismatches require exact accepted records (1048.055958ms)
✔ record validates commits and each stated fact with paired refusals (316.63225ms)
✔ agent-commit permits the actor key and refuses a foreign resolved key before commit (121.943625ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1523.804125

COMMAND npm run identity:test CASE remove-2f033ec EXIT 1

> engramport@0.1.0 identity:test
> node --test tests/commit-identity.test.mjs

IDENTITY_REFUSAL unrecorded
IDENTITY_REFUSAL nonexistent
IDENTITY_REFUSAL author
IDENTITY_REFUSAL signer
IDENTITY_REFUSAL date
IDENTITY_REFUSAL finding
IDENTITY_REFUSAL duplicate
IDENTITY_REFUSAL array
IDENTITY_REFUSAL fields
IDENTITY_REFUSAL full-sha
IDENTITY_REFUSAL finding-format
IDENTITY_REFUSAL unverified
IDENTITY_REFUSAL not-mismatch
IDENTITY_REFUSAL outside-history
agent-commit: signing key at /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-7RympI/foreign.pub is not bound to agent-b@engramport.local in /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-7RympI/allowed_signers
agent-commit: refusing to commit under a foreign or unverified signing key
✖ repository signed mismatches require exact accepted records (977.53125ms)
✔ record validates commits and each stated fact with paired refusals (273.891667ms)
✔ agent-commit permits the actor key and refuses a foreign resolved key before commit (118.530084ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1406.742834

✖ failing tests:

test at tests/commit-identity.test.mjs:14:1
✖ repository signed mismatches require exact accepted records (977.53125ms)
  AssertionError [ERR_ASSERTION]: unrecorded signature/author disagreement:
  2f033ec52f2b1cc28228b347f2945f851b86d4c0 author=agent-a@engramport.local signer=luke@covenantsystems.ai
  + actual - expected
  
  + [
  +   {
  +     author: 'agent-a@engramport.local',
  +     date: '2026-09-08T15:15:52-04:00',
  +     sha: '2f033ec52f2b1cc28228b347f2945f851b86d4c0',
  +     signer: 'luke@covenantsystems.ai',
  +     status: 'G'
  +   }
  + ]
  - []
  
      at identityControl (file:///Users/an2b/an2b/products/EngramPORT-identity/tests/identity-control.mjs:42:10)
      at TestContext.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT-identity/tests/commit-identity.test.mjs:15:20)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at Test.start (node:internal/test_runner/test:1242:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: [ { sha: '2f033ec52f2b1cc28228b347f2945f851b86d4c0', status: 'G', author: 'agent-a@engramport.local', signer: 'luke@covenantsystems.ai', date: '2026-09-08T15:15:52-04:00' } ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

COMMAND npm run identity:test CASE remove-502ab6f EXIT 1

> engramport@0.1.0 identity:test
> node --test tests/commit-identity.test.mjs

IDENTITY_REFUSAL unrecorded
IDENTITY_REFUSAL nonexistent
IDENTITY_REFUSAL author
IDENTITY_REFUSAL signer
IDENTITY_REFUSAL date
IDENTITY_REFUSAL finding
IDENTITY_REFUSAL duplicate
IDENTITY_REFUSAL array
IDENTITY_REFUSAL fields
IDENTITY_REFUSAL full-sha
IDENTITY_REFUSAL finding-format
IDENTITY_REFUSAL unverified
IDENTITY_REFUSAL not-mismatch
IDENTITY_REFUSAL outside-history
agent-commit: signing key at /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-NUQaHu/foreign.pub is not bound to agent-b@engramport.local in /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-NUQaHu/allowed_signers
agent-commit: refusing to commit under a foreign or unverified signing key
✖ repository signed mismatches require exact accepted records (943.370666ms)
✔ record validates commits and each stated fact with paired refusals (294.246625ms)
✔ agent-commit permits the actor key and refuses a foreign resolved key before commit (140.691292ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1415.927292

✖ failing tests:

test at tests/commit-identity.test.mjs:14:1
✖ repository signed mismatches require exact accepted records (943.370666ms)
  AssertionError [ERR_ASSERTION]: unrecorded signature/author disagreement:
  502ab6f008f99ec52b07bb812e4d9f6745e88909 author=agent-b@engramport.local signer=luke@covenantsystems.ai
  + actual - expected
  
  + [
  +   {
  +     author: 'agent-b@engramport.local',
  +     date: '2026-09-08T15:56:34-04:00',
  +     sha: '502ab6f008f99ec52b07bb812e4d9f6745e88909',
  +     signer: 'luke@covenantsystems.ai',
  +     status: 'G'
  +   }
  + ]
  - []
  
      at identityControl (file:///Users/an2b/an2b/products/EngramPORT-identity/tests/identity-control.mjs:42:10)
      at TestContext.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT-identity/tests/commit-identity.test.mjs:15:20)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at Test.start (node:internal/test_runner/test:1242:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: [ { sha: '502ab6f008f99ec52b07bb812e4d9f6745e88909', status: 'G', author: 'agent-b@engramport.local', signer: 'luke@covenantsystems.ai', date: '2026-09-08T15:56:34-04:00' } ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

COMMAND npm run identity:test CASE empty-record EXIT 1

> engramport@0.1.0 identity:test
> node --test tests/commit-identity.test.mjs

IDENTITY_REFUSAL unrecorded
IDENTITY_REFUSAL nonexistent
IDENTITY_REFUSAL author
IDENTITY_REFUSAL signer
IDENTITY_REFUSAL date
IDENTITY_REFUSAL finding
IDENTITY_REFUSAL duplicate
IDENTITY_REFUSAL array
IDENTITY_REFUSAL fields
IDENTITY_REFUSAL full-sha
IDENTITY_REFUSAL finding-format
IDENTITY_REFUSAL unverified
IDENTITY_REFUSAL not-mismatch
IDENTITY_REFUSAL outside-history
agent-commit: signing key at /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-RZIBfj/foreign.pub is not bound to agent-b@engramport.local in /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-RZIBfj/allowed_signers
agent-commit: refusing to commit under a foreign or unverified signing key
✖ repository signed mismatches require exact accepted records (958.662792ms)
✔ record validates commits and each stated fact with paired refusals (271.102417ms)
✔ agent-commit permits the actor key and refuses a foreign resolved key before commit (119.404125ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1387.362125

✖ failing tests:

test at tests/commit-identity.test.mjs:14:1
✖ repository signed mismatches require exact accepted records (958.662792ms)
  AssertionError [ERR_ASSERTION]: unrecorded signature/author disagreement:
  502ab6f008f99ec52b07bb812e4d9f6745e88909 author=agent-b@engramport.local signer=luke@covenantsystems.ai
  2f033ec52f2b1cc28228b347f2945f851b86d4c0 author=agent-a@engramport.local signer=luke@covenantsystems.ai
  + actual - expected
  
  + [
  +   {
  +     author: 'agent-b@engramport.local',
  +     date: '2026-09-08T15:56:34-04:00',
  +     sha: '502ab6f008f99ec52b07bb812e4d9f6745e88909',
  +     signer: 'luke@covenantsystems.ai',
  +     status: 'G'
  +   },
  +   {
  +     author: 'agent-a@engramport.local',
  +     date: '2026-09-08T15:15:52-04:00',
  +     sha: '2f033ec52f2b1cc28228b347f2945f851b86d4c0',
  +     signer: 'luke@covenantsystems.ai',
  +     status: 'G'
  +   }
  + ]
  - []
  
      at identityControl (file:///Users/an2b/an2b/products/EngramPORT-identity/tests/identity-control.mjs:42:10)
      at TestContext.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT-identity/tests/commit-identity.test.mjs:15:20)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at Test.start (node:internal/test_runner/test:1242:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: [ { sha: '502ab6f008f99ec52b07bb812e4d9f6745e88909', status: 'G', author: 'agent-b@engramport.local', signer: 'luke@covenantsystems.ai', date: '2026-09-08T15:56:34-04:00' }, { sha: '2f033ec52f2b1cc28228b347f2945f851b86d4c0', status: 'G', author: 'agent-a@engramport.local', signer: 'luke@covenantsystems.ai', date: '2026-09-08T15:15:52-04:00' } ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

COMMAND npm run identity:test CASE restored EXIT 0

> engramport@0.1.0 identity:test
> node --test tests/commit-identity.test.mjs

ACCEPTED_IDENTITY_MISMATCH 2f033ec52f2b1cc28228b347f2945f851b86d4c0 author=agent-a@engramport.local signer=luke@covenantsystems.ai date=2026-09-08T15:15:52-04:00 finding=F160
ACCEPTED_IDENTITY_MISMATCH 502ab6f008f99ec52b07bb812e4d9f6745e88909 author=agent-b@engramport.local signer=luke@covenantsystems.ai date=2026-09-08T15:56:34-04:00 finding=F160
IDENTITY_REFUSAL unrecorded
IDENTITY_REFUSAL nonexistent
IDENTITY_REFUSAL author
IDENTITY_REFUSAL signer
IDENTITY_REFUSAL date
IDENTITY_REFUSAL finding
IDENTITY_REFUSAL duplicate
IDENTITY_REFUSAL array
IDENTITY_REFUSAL fields
IDENTITY_REFUSAL full-sha
IDENTITY_REFUSAL finding-format
IDENTITY_REFUSAL unverified
IDENTITY_REFUSAL not-mismatch
IDENTITY_REFUSAL outside-history
agent-commit: signing key at /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-s9DE3J/foreign.pub is not bound to agent-b@engramport.local in /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/identity-key-s9DE3J/allowed_signers
agent-commit: refusing to commit under a foreign or unverified signing key
✔ repository signed mismatches require exact accepted records (998.867958ms)
✔ record validates commits and each stated fact with paired refusals (268.41025ms)
✔ agent-commit permits the actor key and refuses a foreign resolved key before commit (118.77675ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1421.930083

```

## Lint output

```

> engramport@0.1.0 lint
> eslint . --ignore-pattern dist --ignore-pattern '**/dist/**' --ignore-pattern .next


/Users/an2b/an2b/products/EngramPORT-identity/tests/completion-status.test.mjs
  19:57  error  'readdirSync' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)


```
