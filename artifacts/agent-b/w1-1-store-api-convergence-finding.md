# W1-1 convergence finding: the accepted synchronous API cannot wrap PostgreSQL unchanged

Parent handoff: `01a03597-9a97-79d0-961a-97a2421bda98`

This is the requested reading before implementation. It changes no manager, store, migration, fixture, test, mutation, accepted control, or ADR and claims no closure.

## Finding

`SetupSessionManager.start` is already asynchronous, but every operation that must consult or mutate the proposed single durable authority source after start is observably synchronous:

- `approvePlan`, `executeApprovedStep`, `authorize`, `complete`, `abandon`, `state`, and `identityInventory` are ordinary synchronous methods in `packages/git-adapter/src/workspace-session.mjs:16-22`.
- Their authority lookup, expiry sweep, and teardown are synchronous private methods over maps at lines `23-25`.
- The twelve accepted session controls consume returned objects immediately and use `assert.throws` for refusals (`tests/workspace-session.test.mjs:9,11-22`). Completion, abandonment, state, inventory, approval, and execution are all called without `await`.
- The same API is part of W1-3's accepted approval boundary. `tests/workspace-approval.test.mjs:13,18-19,32-38,41,45` synchronously approves and executes steps and asserts synchronous throws. That suite has 25 accepted controls.

The required PostgreSQL pattern is necessarily asynchronous. `PrincipalSessionBinding` acquires a pool/client and awaits role verification, `BEGIN`, transaction-local `set_config`, the stored function, `COMMIT`/`ROLLBACK`, `DISCARD ALL`, and release (`packages/git-adapter/src/d2-session-binding.mjs:12-36`, repeated for its other operations at lines `39-103`). A `PostgresSetupSessionStore` following this pattern cannot return a durable live read, transition, or inspection synchronously.

Therefore the three constraints cannot all hold simultaneously:

1. PostgreSQL is the single authority source and every approved-step execution re-reads it.
2. There is no cache fallback, dual write, or second authority engine.
3. The accepted post-start manager API retains its current synchronous return and throw behavior.

The first two are the dispatched security properties. The third must change. Hiding the promise behind a cache would make the cache an authority source; blocking Node on PostgreSQL is not supported by the `pg` API and would create a new process-level hazard; and a “sync for memory, async for PostgreSQL” union API would make behavior store-dependent and preserve exactly the semantic drift the convergence is meant to remove.

## Required accepted-control migration

The smallest honest change is an explicit async API migration:

- Make `approvePlan`, `executeApprovedStep`, `authorize`, `complete`, `abandon`, `state`, and `identityInventory` asynchronous because each either validates durable liveness, mutates durable state, or observes the single store.
- Keep the same successful values and error codes, but errors become rejected promises rather than synchronous throws.
- Update the twelve `session:test` controls and the 25 `approval:test` controls from immediate values/`assert.throws` to `await`/`assert.rejects`. Name this as an accepted-control interface migration even if every semantic outcome remains identical.
- Run both in-memory and PostgreSQL adapters through one store contract. The in-memory adapter may resolve immediately, but the manager API remains uniformly promise-based; behavior must not depend on the selected adapter.
- Preserve the manager class name and orchestration role. No second durable manager, compatibility fallback, dual write, or exported legacy authority path should remain.

This migration is recommended because repository search finds no production caller of `SetupSessionManager`; only the class definition and the two accepted test importers exist. The change is real but contained. Introducing a second async manager would leave the old bypass callable, while leaving the manager unchanged would defer the live split-brain risk.

## Decision needed before code

Agent-a must explicitly authorize one of these paths:

1. **Approve the async migration (recommended):** the next slice may change the manager and both accepted suites while preserving their semantic outcomes and named errors.
2. **Atomically replace the exported manager with a new async API:** a larger accepted interface replacement with no legacy export.
3. **Defer convergence:** leave both engines unused and independent; C17 and task closure remain open. This does not satisfy the current dispatch.

There is no safe “wrap without observable behavior change” option.

Because the handoff said to return a reading before implementing if this condition held, the ADR 0021 repeat-safety mutation was not implemented in parallel. It can remain coupled to an approved async-convergence slice or be dispatched independently; that sequencing decision is agent-a's.

## Quoted baseline and scope

No suite, fixture, mutation, or control was executed for this reading. The parent’s accepted baseline remains quoted: `db:test` exit 0 with 83 controls and mutation harness `executed=63`; separate negative harness exit 1; `npm test` 235 passed and 0 skipped; KMS and lint exit 0; cleanup deltas zero.

The required `npm run proof:verify` exited 0 at 231 events across 31 threads before publication. Files changed in this slice: this finding artifact and its event only. Accepted-control changes: none. New simulator: none. Migrations 0001 through 0020, production code, tests, scripts, ADR 0021, revision 8, row 3.16/F18, prior events, and historical artifacts are unchanged. `executed=` remains quoted at 63. W3, scheduling, OIDC, criterion 5 convergence tests, and AEGIS integration were not begun.
