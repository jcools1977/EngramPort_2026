# ADR 0023: The setup session manager's API becomes asynchronous, and the migration is its own slice

Status: accepted, 2026-08-24. Author: agent-a.
Context: thread `wizard-w1-1-scope`, agent-b's finding `01a0359e-7f68-79c0-92bb-706755989c4c`, artifact `artifacts/agent-b/w1-1-store-api-convergence-finding.md` at `e4a43975…`. Related: ADR 0020, ADR 0021, constraint C17, F56, F58.

## Context

agent-b stopped before implementation at exactly the condition F56's handoff named, and returned a reading instead. **The reading is correct and was independently verified.**

`SetupSessionManager.start` is the only asynchronous method (`workspace-session.mjs:15`). Every method that would have to consult or mutate a single PostgreSQL authority — `approvePlan`, `executeApprovedStep`, `authorize`, `complete`, `abandon`, `state`, `identityInventory` — is synchronous, over synchronous map lookup, sweep and teardown. That synchronicity is load-bearing in **37 accepted controls**: 12 in `workspace-session.test.mjs` and 25 in `workspace-approval.test.mjs`, both suites confirmed by execution, of which **18 are `assert.throws` refusal controls**. The required PostgreSQL pattern is unavoidably asynchronous: `PrincipalSessionBinding` awaits pool acquisition, role verification, `BEGIN`, transaction-local `set_config`, the stored call, commit or rollback, `DISCARD ALL` and release.

Three things cannot hold at once: PostgreSQL as the single authority re-read before every approved step; no cache, dual write or second engine; and the accepted synchronous return-and-throw API.

## Decision

**The API migrates to asynchronous, and the migration is authorized explicitly as a change to accepted controls rather than allowed to arrive inside another slice.**

A cache is refused for the reason ADR 0020 refused reusing `agent_sessions` and F56 refused dual writes: **a cache is a second authority source**, and the entire point of convergence is that there be one. A synchronous-asynchronous union is refused because it makes observable semantics depend on which store is configured, which is worse than either. Deferring convergence is refused because F56 measured the live risk: two session engines, neither in a production path, with green tests against an engine deployment does not use.

**The blast radius is tests only, and this is the cheapest this migration will ever be.** `SetupSessionManager` appears in its own definition and two test files, nowhere else; all six durable functions appear zero times in `packages/`. There are no production callers to migrate today, and every future slice adds some.

**The migration is its own slice, and it does not introduce PostgreSQL.** The manager keeps its in-memory maps and changes only its calling convention. The `SetupSessionStore` seam and its PostgreSQL implementation land in the slice after, behind the now-asynchronous contract. **One change is not asked to prove two things** — the same reason criterion 5's four negatives were sequenced separately in F56.

**The safeguard is mandatory, and it is not the one agent-b named.** An asynchronous test migration can silently disarm assertions, and 37 controls that can no longer fail would look exactly like 37 controls that pass. The specific hazard is one-directional. Converting a positive assertion and forgetting `await` fails loudly, because a `Promise` is not the expected value. Converting `assert.throws(() => m.foo())` to a call that now returns a rejected promise also fails loudly, because nothing throws synchronously. **But an unawaited `assert.rejects(...)` passes unconditionally**, and that is the form all 18 refusal controls must take.

So the migration must be accompanied by a negative control over the suites themselves: **run both migrated suites against a deliberately permissive manager with every refusal removed, and show that all 18 refusal controls fail.** A refusal control that still passes against a manager that refuses nothing is disarmed, and the run names it. This is the F17 standard applied to the test migration rather than to a database guard.

## Consequences

1. **37 accepted controls change**, declared here in advance rather than discovered in a diff. Error codes, returned values and ordering are preserved; only the calling convention changes.
2. **The permissive-manager run is required evidence**, not optional hygiene, and its expected result is 18 failures. A run producing fewer names the disarmed controls.
3. **No production behaviour changes**, because there is no production caller.
4. **`executed=` does not move.** This slice adds no database mutation; the local repeat-safety mutation ADR 0021 required belongs with the store slice.
5. **C17 remains open**, and remains blocked on convergence rather than on scheduling, which F58 closed.
6. If the migration cannot preserve an error code or a returned value, that is a reading to return, not a judgment call to make inside the implementation.
