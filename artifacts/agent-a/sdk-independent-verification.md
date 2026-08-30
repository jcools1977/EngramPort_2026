# Independent verification: `@engramport/sdk`

Agent-b closed `sdk-build` terminal, so this verification is recorded here rather than as a reply. **Verified by execution and mutation, not by reading the report.**

## The criterion that decided it

**A mutation to `event-core` must break both the CLI and the SDK, or the SDK is a reimplementation.** Confirmed: altering `hashBody(input.body)` to `hashBody(input.body + "x")` produced **exit 1 on both suites**, with three SDK tests failing. `packages/sdk/src/index.mjs:3` imports directly from `../../git-adapter/src/event-core.mjs`. **The SDK is a wrapper.**

**Agent-a's first mutation attempt was invalid and nearly produced a false conclusion.** Removing `mkdir(path.dirname(file), { recursive: true })` left both suites passing, because a recursive `mkdir` is a no-op when the directory already exists in a fixture. **Second time in two days agent-a selected a non-load-bearing mutation**, after the port-watch two-guard case. The lesson is the same: a mutation proves nothing until it is shown to change behavior.

## Honesty of the claim surface

**Claim 2 is declared `coverage: "partial"`**, with the qualifier that Port Watch position is log-derived and its control and claim stores are file-backed. The other three are `full`. **Declaring one of four partial, unprompted, is the outcome the dispatch asked for and the opposite of reporting four successes.** It also matches F125 rather than papering over it.

**The unregistered-actor case is stated without being called authorization**: `README.md:30` records that event-core refuses the candidate because its event path is not registered, and the SDK returns that refusal unchanged.

## Envelope machinery, first full exercise

This was the first handoff whose completion answered criteria point by point. **All seven criteria returned `satisfied` with digest-bound evidence**, two carrying both event and artifact references. The bounded context on the dispatch was five resolvable event references rather than prose, because the envelope refused prose.

## What is not claimed

`package.json` declares `@engramport/sdk` at `0.1.0` with `"private": true`, so **nothing can publish by accident**. Publication remains DeVere's under ADR 0036, and F125's copy question is unresolved: the site still names a mechanism that no longer exists.

---

# Addendum: the portable claim store

**Verified independently.** Migration `0025_port_watch_claims.sql` enforces exclusivity with `PRIMARY KEY (agent, project)` and `ON CONFLICT ... DO UPDATE`, which is a genuine database primitive rather than an application check: concurrent inserts serialize on the key and the conditional update decides the winner. `PORT_WATCH_POSTGRES_EXCLUSIVITY` is registered as its mutation.

**Agent-a's filesystem mutation no longer defeats the duplicate guard, and that is the point of the slice.** Making `mkdir(directory)` recursive now breaks only `lease expiry permits explicit at-least-once redelivery`; the concurrency control survives, because exclusivity moved to the database. **Agent-a again mutated the wrong layer**, third time, and this time the failure to reproduce was the evidence rather than a false alarm.

**The portability claim is stated honestly and agent-a did not have to correct it.** Agent-b wrote: *"The demonstrated portability is narrower than cross-machine operation. Two independent database connections with no shared filesystem coordinated through one PostgreSQL control stream."* That is what was proven, stated as what was proven.

**ADR 0045 records the consequence rather than burying it**: Port Watch work delivery now requires the control stream to be reachable, which changes what a builder needs in order to use EngramPort and sharpens the unresolved tension with ADR 0039's "coordination needs no server". Left open deliberately, as instructed.

All seven completion criteria returned `satisfied`. Migrations `0001` through `0024` untouched. 412 events verify.
