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
