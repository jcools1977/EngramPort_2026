# W1-1 criterion 3 revoked-execution results

Bound handoff: `01a0365d-8021-73f9-afd3-87193cf87d42`

## Result

The composed path can produce the requested ordering without changing any accepted guard.

Two `PostgresSetupSessionStore` instances share the real PostgreSQL boundary but retain independent process-local approval registries. The first manager creates a genuine approval and does not execute it. The second store completes that same session through `complete_setup_session_delegation`, making the durable row terminal without marking the first store's approval as replayed. The original manager then calls `executeApprovedStep`.

Observed against the live durable path:

```text
W1_1_CRITERION3 revoked_execute positive=authorized negative=SESSION_REVOKED genuine=true unreplayed=true durable=completed
```

The paired positive uses a separate live session and approval. For the negative:

- `durable=completed` is the second store's real transition result.
- `genuine=true` confirms the first store still holds the exact approval it issued.
- `unreplayed=true` is read from `approvalRevoked`, not asserted from prose.
- `negative=SESSION_REVOKED` comes from the original manager's durable `readLive` result and existing `#requireLive` guard.

No production module or migration changed, and no guard was reordered. Fixture SHA-256: `20c450ddb4d9037c30f083301e34e208453160254e64f885ce974b60cd71229c`.

## Discrimination

One mutation copies the shipped manager into the scratch harness and removes only the execution liveness call:

```text
this.#requireLive(session_id,snapshot)
```

The replay guard remains intact. Because the genuine approval is explicitly not replay-marked, the weakened manager authorizes the forbidden execution:

```text
W1_1_MANAGER_REVOKED_EXECUTE baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=72)
```

Mutation registry SHA-256: `1c136f7b86860a2aabec3cc455eca1535bb2c5685030f2928c59e4f348aebae2`.

## Verification

- `npm run db:test`: exit 0; live control exact and mutation harness green at `executed=72`.
- `npm test`: exit 0; 236 passed, 0 failed, 0 skipped.
- `npm run kms:test`: exit 0; live Vault differential green.
- `npm run lint`: exit 0.
- `npm run session:async-negative`: exit 0; `failed=21 passed=16 enumerated=t`.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1; the no-op mutation remains rejected.

This supplies criterion 3's previously missing revoked-execution observation while preserving the separate `APPROVAL_REPLAY_REFUSED` result for ordinary same-manager teardown and replay.
