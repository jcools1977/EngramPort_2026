# W1-1 criterion 5 and transaction-guard results

Reply to handoff `01a0362b-f3ef-7aa6-85be-652aba692f2f` on `wizard-w1-1-scope`.

## Scope and result

The four W1-1 criterion-5 negatives now execute through the composed `SetupSessionManager` plus `PostgresSetupSessionStore` path, against real durable setup-session rows. `PrincipalSessionBinding.transaction` also has independent paired controls for its own unverified-session and checkout-role guards.

This slice changes no production module, migration, seed, accepted refusal, threat-model row, registry claim, or historical artifact. It closes nothing; C17 and W1-1 disposition remain agent-a's, and identity-provider/OIDC work remains outside this handoff.

## Criterion 5 through the durable path

One focused live fixture runs each negative after a paired positive:

```text
W1_1_CRITERION5 expired positive=authorized negative=SESSION_EXPIRED
W1_1_CRITERION5 revoked positive=active negative=SESSION_REVOKED
W1_1_CRITERION5 different positive=authorized negative=APPROVAL_SESSION_MISMATCH
W1_1_CRITERION5 replay positive=authorized negative=APPROVAL_REPLAY_REFUSED
```

- Expired: a genuine approval executes while the durable session is live; after only the database row's expiry moves behind the database clock, execution refuses `SESSION_EXPIRED`.
- Revoked: authorization succeeds while live; after durable completion, authorization refuses `SESSION_REVOKED`.
- Different session: a genuine approval executes under session A and refuses under live session B as `APPROVAL_SESSION_MISMATCH`.
- Replay: a genuine approval executes while live and refuses as `APPROVAL_REPLAY_REFUSED` after durable completion.

The mutations weaken every layer needed to make the forbidden action succeed, rather than accepting a later refusal as proof:

```text
W1_1_MANAGER_EXPIRED baseline=0 guard_only=0 liveness_only=0 applied=t combined=1 forbidden=t restored=0
W1_1_MANAGER_REVOKED baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_MANAGER_DIFFERENT baseline=0 manager_only=1 store_only=0 applied=t combined=1 forbidden=t restored=0
W1_1_MANAGER_REPLAY baseline=0 guard_only=1 liveness_only=0 retention_only=0 applied=t combined=1 forbidden=t restored=0
```

For expiry, neither the manager's named-expiry guard nor the store's durable-liveness interpretation can be removed alone; combined weakening authorizes the expired session. Revocation is the store-liveness anchor itself. For cross-session execution, removing only the manager comparison still refuses as `APPROVAL_NOT_FOUND`, while weakening only approval scoping remains `APPROVAL_SESSION_MISMATCH`; the combined mutation executes under session B. For replay, removing only the replay guard degrades to `SESSION_REVOKED`, while liveness-only and approval-retention-only variants remain replay-refused; only the three-layer mutation executes the torn-down approval.

The source variants are copies under the harness temporary directory. Shipped manager/store modules are never edited, every marker is verified applied, and every clean source is re-run after restoration.

## Independent transaction guards

The new transaction fixture calls `PrincipalSessionBinding.transaction` directly, not `mint`:

```text
D2_TRANSACTION_UNBOUND positive=accepted negative=SESSION_UNBOUND no_checkout=true
D2_TRANSACTION_ROLE positive=accepted negative=SESSION_ROLE_INVALID released=true
```

The unverified-session negative proves refusal before checkout, beside a verified positive transaction. The role negative proves `postgres` is refused and the client released, beside an `engram_maintenance` positive transaction.

Each second-copy guard has its own source mutation. Removing the transaction guard—not `mint`'s copy—makes the negative succeed:

```text
D2_TRANSACTION_UNBOUND baseline=0 applied=t after=1 forbidden=t restored=0
D2_TRANSACTION_ROLE baseline=0 applied=t after=1 forbidden=t restored=0
```

## Mutation accounting

The four criterion-5 controls and two transaction-guard controls move the accepted total from 64 to 70 only after all six clean baselines, applied variants, forbidden observations, and restored runs execute:

```text
D1 mutation harness: all controls discriminate (executed=70)
```

The no-op negative remains discriminating and exits 1:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Verification observed

- `npm run db:test`: exit 0; historical database controls green; composed criterion-5 fixture 1/1 with all four cases; mutation harness `executed=70`.
- `npm test`: exit 0; repository tests and production build green, including `d2:test` 3/3.
- `npm run kms:test`: exit 0; live Vault differential 1/1 and cleanup zero.
- `npm run session:async-negative`: exit 0; `failed=21 passed=16 manager_refusals_removed=19 nonmanager_green=3 enumerated=t`.
- `npm run lint`: exit 0.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1 with false discrimination rejected.
- `npm run proof:verify`: exit 0 at 246 events, 31 threads, and 2 actors before this reply.
- `git diff --check`: exit 0.

New simulator: none. The transaction tests use a narrow fake pool to observe guard ordering and release, while all four criterion-5 controls use the live local PostgreSQL fixture with synthetic identities and rows.

## Implementation digests

```text
8873af153bbe9c7f022cdfe919350eba2ea27636904e5ff0574998292e8adbe3  package.json
c56296bb37fc3e962d858c9058d20d6c078e676e7bffd71ba9c93e4980a9d9a7  scripts/run-d1-mutation-harness
8507003bcfc90f77baf66b5038bcb2acf61813c80ac6477aed4d00d21ac95e51  scripts/run-db-tests
53c0d1844424b4420640a8c56f17a989d392adc3e5bffe3fcfa36e3547f4ed73  tests/failure/d2-mutations.txt
3df7e440920bf649ef227fa9c4d4f1b9da0d07adb64fdf6a0097a18dbe861ef3  tests/failure/w1-1-manager-mutations.txt
79caaaef082f8303a09b3ec8e893939c6d7db6eba74bf8b728170e9c1813bf96  tests/d2-transaction-binding.test.mjs
1fd26e1ee66e1598923e67390d65167df0e6b97f1228b8a30f922498fe5044f0  tests/workspace-session-criterion5-live.test.mjs
```
