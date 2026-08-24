# W1-1 async session-manager slice

Parent handoff: `01a035e1-74c5-7398-bc3b-b172ebcbb9df`

## Bounded implementation

- `SetupSessionManager` remains the manager and retains its maps, error codes, returned values, and operation order.
- Every public manager method that observes or mutates the store is promise-based: `start`, `approvePlan`, `executeApprovedStep`, `authorize`, `complete`, `abandon`, `state`, and `identityInventory`.
- The 12 session controls and 25 approval controls await manager calls; manager refusals use `assert.rejects`.
- The slice adds no PostgreSQL code, no `SetupSessionStore`, no database mutation, and no repeat-safety claim.
- The engineering evidence counter remains `executed=63`.

## Permissive-manager safeguard

`npm run session:async-negative` copies the shipped manager into a temporary directory, mechanically removes its 16 `SetupPlanError` throws and one plan-mismatch throw, runs the two migrated suites through the permissive copy, and removes the copy.

Observed result:

```text
W1_1_ASYNC_PERMISSIVE failed=21 passed=16 manager_refusals_removed=17 nonmanager_green=3 enumerated=t
```

The exact 21 expected failure names are asserted by the safeguard: seven session controls and fourteen approval controls. It also asserts that these three nonmanager refusals remain green:

- `v2 wire is refused with a specific profile error and differs from v3 plan identity`
- `tampered serialized plan is refused on load with paired round trip`
- `verified plan parameters are deeply immutable`

The safeguard derives and reports the counts from the test output; the enumerated property is the authority.

## Verification

- `npm run session:test`: 12 passed, 0 failed, 0 skipped.
- `npm run approval:test`: 25 passed, 0 failed, 0 skipped.
- `npm run session:async-negative`: 21 expected failures, 16 passes, exact names verified, three nonmanager refusals green.
- `npm test`: 235 passed, 0 failed, 0 skipped. The first sandboxed run reached the Docker-backed W1-7 canary and was refused access to the local Docker socket; the authorized rerun passed, including the canary with cleanup deltas zero.
- `npm run lint`: passed.
- `npm run proof:verify` before publication: 236 events / 31 threads.

This slice closes nothing and does not discharge the trusted-session caveat on A6, A7, or A8.
