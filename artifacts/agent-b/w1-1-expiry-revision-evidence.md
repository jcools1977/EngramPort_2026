# W1-1 bounded revision: expiry sweep evidence

Scope is limited to the three requested W1-1 expiry corrections: entry-point expiry sweeping, reordered pre-execution observations, and an untouched-expired negative control paired with an untouched-live positive control. No W1-2 or queued work is included.

## Environment and reproduction

- Node: `v26.5.0`
- Focused: `npm run session:test`
- Regression: `npm run setup:test && npm run dry-run:test && npm run watch:test && npm run welcome:test && npm run db:static-test && npm run proof`
- Static: `npx eslint packages/git-adapter/src/workspace-session.mjs tests/workspace-session.test.mjs && git diff --check`

## Corrected control

The expiry test advances the injected clock, then inspects `identityInventory()` and `state()` before attempting execution. Its observations are:

```text
identityInventory() -> {
  wizard_principals: 0,
  wizard_actors: 0,
  session_principal_bindings: 0,
  delegations: 0,
  credentials: 0
}
state(expired_session) -> {
  session_id: "session-1",
  status: "expired",
  authority: false
}
executeApprovedStep(expired_session, approval) -> SESSION_EXPIRED
```

The distinct untouched-session test starts two sessions and does not access either session after advancing the clock. Its first observation is the global inventory. The expired session is absent from authority counts while the live positive control remains:

```text
identityInventory() -> {
  wizard_principals: 0,
  wizard_actors: 0,
  session_principal_bindings: 1,
  delegations: 1,
  credentials: 0
}
state(expired_session) -> { status: "expired", authority: false }
state(live_session)    -> { status: "active", scopes: ["setup:plan:execute"], ... }
```

This control would fail against the prior lazy implementation because the first inventory would report two bindings and two delegations, and the expired state would still report active.

## Test output

```text
session:test      tests 12; pass 12; fail 0
setup:test        tests 21; pass 21; fail 0
dry-run:test      tests 6;  pass 6;  fail 0
watch:test        tests 16; pass 16; fail 0
welcome:test      tests 19; pass 19; fail 0
db:static-test    tests 6;  pass 6;  fail 0
proof:verify      verified 30 events across 10 threads and 2 actors
proof:test        tests 11; pass 11; fail 0
targeted ESLint   pass
git diff --check  pass
```

The focused suite includes all prior 11 controls plus the new untouched-expiry/live-session paired control.

## Manual inspection and design finding

Every public manager entry reaches `#sweepExpired()` either directly or through `#live()`. The sweep uses the injected clock and calls the existing structural teardown, deleting the live record containing the founder binding, delegation, and approvals before state is reported or authority is used.

This in-memory sweep is sufficient only for W1-1. It guarantees the model's public observations and authorization paths cannot treat an expired record as live, but it does not create a durable or multi-process expiry guarantee. A durable implementation requires server-enforced expiry at the authority-bearing datastore or authorization service; correctness must not depend on one application process running a sweep.
