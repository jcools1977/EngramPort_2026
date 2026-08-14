# PW1 Port Watch evidence

## Result

All twelve PW1 acceptance criteria are met within its Node-only scope. Provider adapters remain recording stubs. No network, database, Docker, PostgreSQL, model, Git operation, webhook, real claim, or worktree code was added.

Node version: `v26.5.0`.

Exact command:

```sh
npm run watch:test && npm run setup:test && npm run welcome:test && npm run proof
```

## Full test output

```text
> engramport@0.1.0 watch:test
> node --test tests/port-watch.test.mjs

✔ unchanged authorized inbox invokes runner exactly zero times across many ticks
✔ unauthorized event causes zero wakes; same authorized handoff wakes exactly once
✔ addressed decision grants no implementation authority; eligible handoff does
✔ waking grants exactly actor scopes and never supervisor scopes
✔ cursor advances atomically only on terminal completion
✔ cursor and completion survive store restart and reconfiguration
✔ crash before atomic completion re-delivers event id after lease expiry
✔ ordinary cursor rewind is refused; operator rewind is audited
✔ off by default blocks wake; enable is positive control
✔ pause blocks new wake while active run remains
✔ stop blocks wakes and revokes active lease
✔ WIP one prevents a second wake
✔ concurrent ticks reserve one WIP slot before runner invocation
✔ decision function is deterministic
✔ cadence defaults to 240 and bounded jitter never skips tick
✔ unbranded broad inbox source is structurally refused
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 109.752708

> engramport@0.1.0 setup:test
ℹ tests 21
ℹ pass 21
ℹ fail 0

> engramport@0.1.0 welcome:test
ℹ tests 19
ℹ pass 19
ℹ fail 0

> engramport@0.1.0 proof
✓ verified 18 events across 6 thread(s) and 2 actors
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Targeted ESLint and `git diff --check` pass.

## Headline and paired controls

- One hundred unchanged authorized-inbox ticks produced **exactly 0 runner invocations** and 100 `watch.polled` records.
- An event absent from the authorized view produced 0 invocations; the same eligible authorized handoff produced exactly 1.
- An addressed decision produced `no_eligible_handoff` and 0 invocations; an implementation-authorized handoff woke once. Addressing is routing, not implementation authority.
- Actor scope `events:write` reached the runner exactly; supervisor scope `admin:project` did not.
- Cursor stayed at 0 until terminal completion, then completion and cursor 1 appeared in one atomic file replacement and survived store restart/reconfiguration.
- Lease expiry after simulated crash re-delivered the identical event ID. Stop revoked the modeled lease and refused completion.
- Disabled, paused, stopped, sequential WIP, and concurrent WIP paths all produced no extra invocation; their positive controls wake correctly.
- Ordinary rewind matched `CURSOR_REWIND_REFUSED`; explicit operator rewind succeeded and emitted `cursor.rewound`.
- Default cadence is 240 seconds; configured cadence and bounded jitter remain positive.

## Manual inspection

After all suites passed, the implementation was inspected directly. State mutation is serialized and persisted by temporary-file rename. Concurrent ticks reserve the single WIP slot before invoking the adapter. Terminal completion and cursor advancement are one store transaction. Reconfiguration preserves cursors. Every tick records `watch.polled`, and every skipped tick records its reason. The runner adapter receives a bounded event package and actor-scoped token only.

PW1 models lease creation, expiry, and revocation only enough to prove crash redelivery, stop behavior, and WIP=1. Database-backed claim competition, scheduled lease expiry, and fencing tokens remain PW3 as the handoff requires.

## Design findings

The interface removes any broad-query/client-filter method and rejects unbranded sources, so accidental local filtering is structurally discouraged. It cannot prove that a future server implementation truthfully authorized its returned rows: JavaScript branding is a construction boundary, not an authorization proof. PW2/PW3 must implement and test the server-side predicate; PW1 ensures no alternate broad-results path exists in the consumer.
