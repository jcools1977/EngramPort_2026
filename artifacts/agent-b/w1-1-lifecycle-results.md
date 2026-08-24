# W1-1 durable setup-session lifecycle slice

Parent handoff: `01a03566-0a68-7514-ba18-962bbafc7959`

## Boundary landed

Migration `0020_w1_1_setup_session_lifecycle.sql` adds only the teardown and C6 expiry lifecycle for the dedicated `setup_session_delegations` relation created by migration 0019. Migrations 0001–0019, `actor_delegations`, and `agent_sessions` are unchanged.

- `complete_setup_session_delegation` and `abandon_setup_session_delegation` call one private transition function. The transition locks the founder-owned row, refuses `SETUP_SESSION_NOT_OWNED` and `SETUP_SESSION_ALREADY_TERMINAL` distinctly, and writes terminal state and the database-clock terminal timestamp atomically.
- Completion and abandonment are irreversible. A second transition refuses, the live read returns no authority immediately, and introspection reports the terminal state with `active=false`.
- `read_live_setup_session_delegation` continues to filter expiry in its query with `s.expires_at>clock_timestamp()`; no application sweep is required before authorization.
- `sweep_expired_setup_session_delegations` tombstones every due, nonterminal row as `expired` with a database-clock timestamp. It is executable by `engram_maintenance` without founder or application traffic; application roles retain neither function execution nor direct table privileges.
- `inspect_setup_session_delegation` uses one database-clock snapshot and never reports an expired, terminal, or inactive-authority row as active.

The sweep routine is the database-side scheduling hook. A production deployment can schedule the following as `engram_maintenance` through `pg_cron` or a managed database scheduler:

```sql
SELECT sweep_expired_setup_session_delegations();
```

No scheduler or `pg_cron` extension is installed or claimed by this slice.

## Live PostgreSQL evidence

The fixture uses the real `engram_maintenance` and PostgreSQL admin roles, forced RLS, stored rows, and stored functions. Its positive and negative observations were:

```text
W1_1_LIFECYCLE positive completed=accepted abandoned=accepted states=abandoned,completed stamped=true live_after=0 inspect_active=false boundary=true
W1_1_LIFECYCLE read_expiry live=1 expired=0
W1_1_LIFECYCLE sweep swept=1 expired_state=expired expired_stamped=true live_state=none
W1_1_LIFECYCLE introspection live_active=true live_state=active expired_active=false expired_state=expired
W1_1_LIFECYCLE clock_db=true
W1_1_LIFECYCLE read_terminal live=1 terminal=0
W1_1_LIFECYCLE already_terminal second=SETUP_SESSION_ALREADY_TERMINAL state=completed
W1_1_LIFECYCLE ownership result=SETUP_SESSION_NOT_OWNED state=none
W1_1_LIFECYCLE atomic=true result=accepted state=completed stamped=true
```

The planted expired row and paired live row traverse both durable read surfaces: the authorization read returns `1/0`, while introspection returns `active=true/false` and `active/expired`. The sweep test independently proves only the expired row transitions and the live row remains nonterminal.

## Discriminating mutations

Eight controls were added and the mutation count moved from 55 to 63 only after observed execution:

```text
W1_1_LIFECYCLE_READ_EXPIRY baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_LIFECYCLE_SWEEP baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_LIFECYCLE_INTROSPECTION baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_LIFECYCLE_CLOCK baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_LIFECYCLE_READ_TERMINAL baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_LIFECYCLE_ALREADY_TERMINAL baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_LIFECYCLE_OWNERSHIP baseline=0 predicate_only=0 rls_only=0 applied=t combined=1 forbidden=t restored=0
W1_1_LIFECYCLE_ATOMIC baseline=0 assignment_only=1 constraint_only=0 applied=t combined=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=63)
```

`*_only` names the layer removed. Ownership is a two-layer control: removing the explicit predicates or RLS alone still produces the exact not-owned refusal; removing both accepts and changes the foreign row. Atomicity is also layered: removing the timestamp assignment alone is caught by the table constraint, removing the constraint alone preserves the atomic transition, and removing both admits a terminal row without a timestamp. Each layered property counts once.

The separate negative harness behaved as required:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Findings handled during reproduction

The first sweep attempt updated zero rows because forced RLS requires a SELECT-visible old row for UPDATE. Adding an expired-only SELECT policy made the old row visible, then exposed the second requirement: the post-update tombstone must also satisfy SELECT visibility for the UPDATE `RETURNING` path. The final policy admits only due nonterminal rows and already-expired tombstones; the UPDATE policy independently permits only the one-way stamped `expired` transition. Direct table privileges remain revoked.

The first mutation replay also rejected a quoted clock replacement before application and showed that the ownership combined probe removed only the SELECT predicate, yielding a wrong-reason accepted/no-update outcome. The clock mutation now uses an unquoted epoch expression, and the ownership mutation removes both explicit ownership predicates plus RLS and requires the foreign row to become `completed`. Neither failed probe was counted.

## Verification

- `npm run db:test`: exit 0; 83 existing database controls green; D2 7/7, W1-7 13/13, D4 4/4, W1-8 live/creation/G1–G14, W1-1 creation/read and lifecycle all green; mutation harness 63/63.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1; false discrimination rejected.
- `npm test`: exit 0; 235 tests, 0 failures or skips.
- `npm run kms:test`: exit 0; live Vault differential 1/1 and nonexportability check passed.
- `npm run lint`: exit 0.
- `npm run proof:verify`: exit 0 at 227 events / 31 threads before this reply.
- `git diff --check`: exit 0.
- Cleanup: 0 compose containers, 0 compose volumes, and 0 `.d2-mutations.*` directories.

## Disposition held

This slice closes nothing: not C17, W1-1 criterion 4, or any prior trusted-session caveat. It proves the durable setup-session lifecycle given a trustworthy bound founder principal. External identity-provider proof, the OIDC adapter, W3, AEGIS integration, and all task/registry closure decisions remain untouched. Threat-model revision 8 is unchanged, and row 3.16 remains carried as stale under F18.

## Implementation digests

```text
4a56f8d801ea958967c402aaf1df2fb0770578be287acf819e41cdaf7ce2c3d8  migrations/0020_w1_1_setup_session_lifecycle.sql
2fd422e5a7adb0b6cd52320ef733bcd114c1ba98a6ca12cf463ee9b031e3ba23  tests/wizard-w1-1-session-lifecycle.test.mjs
162b7f94c2905e64908297f5ff5a97ee40ea9f8e024082130fbe9b0f22257a2b  tests/failure/w1-1-lifecycle-mutations.txt
fff1746215eb7f167b1f5e90c9d41e86dd19441d007a03fe1df56b940e1457a3  scripts/run-d1-mutation-harness
f8a2ae7ad0e4a5ee14f33d4d5c355063bcd16302a7481d7512ac14709890bb74  scripts/run-db-tests
```
