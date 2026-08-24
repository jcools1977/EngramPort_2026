# W1-1 setup-session store results

Reply to handoff `01a03602-2eba-71b8-be04-f70edb981492` on `wizard-w1-1-scope`.

## Result and boundary

`SetupSessionManager` now depends on one `SetupSessionStore` seam. The default `InMemorySetupSessionStore` preserves the accepted synthetic fixture behavior, while `PostgresSetupSessionStore` executes the durable session boundary through the six accepted database functions:

- `create_setup_session_delegation`
- `read_live_setup_session_delegation`
- `inspect_setup_session_delegation`
- `complete_setup_session_delegation`
- `abandon_setup_session_delegation`
- `sweep_expired_setup_session_delegations`

The PostgreSQL adapter uses `PrincipalSessionBinding.transaction` for transaction-local `app.principal_id` and `app.session_id`, maintenance-role enforcement, rollback, `DISCARD ALL`, and dirty-client destruction. The adapter retains only non-authoritative routing context needed to bind an already verified session id to its founder and the existing grouped-approval payloads. It never treats either as session liveness: approval, execution, authorization, transition, state, and inventory paths re-read the durable record. There is no dual write, memory fallback, wrapped synthetic store, or best-effort continuation.

This slice closes nothing. W1-1 criterion 5's four negatives and the identity-provider proof remain deferred. Nothing here discharges the trusted-session caveat on A6, A7, or A8.

## Dual-adapter controls

The accepted 12 session controls and 25 grouped-approval controls run unchanged in memory and again with `SETUP_SESSION_TEST_ADAPTER=postgres`. The PostgreSQL fixtures use real rows and the database clock; the in-memory fixtures retain the injected deterministic clock.

Observed PostgreSQL totals:

```text
workspace-session: 12 passed, 0 failed, 0 cancelled
workspace-approval: 25 passed, 0 failed, 0 cancelled
```

The async permissive negative remains memory-only and green:

```text
W1_1_ASYNC_PERMISSIVE failed=21 passed=16 manager_refusals_removed=19 nonmanager_green=3 enumerated=t
```

During the first PostgreSQL run, the five generated approval controls exposed a test-runner registration race: their top-level awaited registration allowed pool shutdown before later tests were declared. Registration was made synchronous; the final memory and PostgreSQL runs are both 25/25 with no cancelled controls.

## Fail-closed durable behavior

The accepted database refusals have one explicit translation inventory at the manager boundary. The two ADR 0025 additions are covered by paired live controls:

```text
W1_1_MANAGER_RETENTION positive=active exceeded=SESSION_RETENTION_EXCEEDED exceeded_residue=0
W1_1_MANAGER_RETENTION baseline=active unresolved=SESSION_RETENTION_UNRESOLVED residue=0
```

The first control accepts a 12-hour session, then refuses a 25-hour session under a 48-hour founder authority because RET-SESSION is 24 hours. The second accepts with RET-SESSION present, removes only that policy, observes `SESSION_RETENTION_UNRESOLVED`, and proves zero session-row residue.

Database expiry and durable completion remain distinct:

```text
W1_1_MANAGER_TERMINAL expired=SESSION_EXPIRED completed=SESSION_REVOKED
```

An unreachable PostgreSQL adapter was exercised through every store-observing manager operation. Every call failed on the unreachable store and none returned a memory-derived result:

```text
W1_1_MANAGER_UNREACHABLE failed=start,approve,execute,authorize,complete,abandon,state,inventory fallback=0
```

Unknown durable refusal names remain unmapped and are rethrown rather than coerced into an accepted manager code.

## ADR 0021 repeat safety

The lifecycle fixture now sweeps one expired and one live durable session three times. The first sweep transitions exactly one row, later sweeps transition zero rows, the expired row's terminal timestamp remains unchanged, and the live row remains active:

```text
W1_1_LIFECYCLE repeat first=1 second=0 third=0 terminal_stable=true live=active
```

The executable mutation changes only the sweep's reported count to `1`. The second and third observations then become forbidden non-zero reports while both row-state assertions stay live. The shipped function restores cleanly:

```text
W1_1_SETUP_SESSION_REPEAT_SAFETY baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=64)
```

The no-op negative remains discriminating and exits 1:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Verification observed

- `npm run db:test`: exit 0; historical database controls green; memory-equivalent PostgreSQL session controls 12/12; approval controls 25/25; manager live controls 5/5; mutation harness `executed=64`.
- `npm test`: exit 0; all repository tests and build green.
- `npm run kms:test`: exit 0; live Vault differential 1/1 and cleanup zero.
- `npm run lint`: exit 0.
- `npm run session:async-negative`: exit 0 with 19 manager refusals removed and enumerated.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1 with false discrimination rejected.
- `npm run proof:verify`: exit 0 at 244 events, 31 threads, and 2 actors before this reply.
- `git diff --check`: exit 0.

New simulator: none. All new durable evidence uses the local PostgreSQL fixture and synthetic identities/rows. Migrations 0001 through 0020, revision 8, seeds, prior events, historical artifacts, registry claims, and the digest-pinned threat model are unchanged.

## Implementation digests

```text
318d4090f036545b8496bf19a2784c8c88eeefe8e6a1afc17ee165be233c2b36  packages/git-adapter/src/d2-session-binding.mjs
e2473ffe59bcfe9be899d8a6aafce4a4fea4205a71a35b80f159a759c1e7af06  packages/git-adapter/src/workspace-session.mjs
411b5af370908482d4d45c95c55d382c93161a9949cb92b67315e3ad0e4025d7  packages/git-adapter/src/workspace-session-store.mjs
f8e52248c31239f2754760c94287ec088f75dbfa7b1849ad612f8ee51f6061d6  tests/workspace-session.test.mjs
b9ee30533b087f9ceea0c1dd854c4190e663e5958135653fc89228addc1e12ea  tests/workspace-approval.test.mjs
38078ac4e54ffbb1f28b5f7d1972492cd89dd9a0ad1c1ad51162c9bc50017679  tests/workspace-session-store-live.test.mjs
07df1c9c2e3b5e97cefdd48f7881c12e53b70633ac97d5f036837f412c7bd2fe  tests/wizard-w1-1-session-lifecycle.test.mjs
fd241117900d73a205302b0685a3ebc0b99fc95fc2f4368ab4e3a72ca4dcd49b  tests/failure/w1-1-lifecycle-mutations.txt
58a9ba60542408ecc28a59465cea3a9600ecdcc0b6d68d793aa654428b9a78ab  scripts/run-d1-mutation-harness
83d5c064e525a4ed79c972de5a132f48fde705250802bbbcb74429d498599cbb  scripts/run-db-tests
52a26120af51b6251de072c1ecc8b141f7ce0d80abf6d95b2639980fcee428c5  scripts/run-session-async-negative
```
