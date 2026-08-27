# F109 core-override seam results

Parent event: `01a0431c-706a-7fae-8cdc-409417e6e071`

## Delivered boundary

- `packages/git-adapter/src/cli.mjs` now imports `appendEvent`, `listInbox`, and `validateAppendInputs` once, statically, from `event-core.mjs` and re-exports those exact bindings.
- The production CLI no longer reads `GIT_ADAPTER_CORE_MODULE`; an environment-only CI influence cannot replace the event-writing implementation.
- The mutation harness retains CLI-to-core injection by copying the CLI and core into harness-owned temporary storage and mutating the copied core. No production configuration switch is involved.
- The code and binding-identity test state the consumer contract: an SDK imports `event-core.mjs` directly, while the CLI is only an argv adapter and compatibility re-export.

## Observed guard evidence

The `normal CLI execution cannot activate the harness core override` test supplies `GIT_ADAPTER_CORE_MODULE` pointing to a module that throws `UNGUARDED_CORE_OVERRIDE`. The shipped CLI exits successfully and never imports or reports that marker.

`GIT_ADAPTER_CORE_OVERRIDE_GUARD` restores the former environment-selected dynamic import in a temporary CLI copy. Under the identical test, the marker is imported and the control fails. The mutation is killed and the shipped source restores cleanly.

The pre-existing `GIT_ADAPTER_CORE_DELEGATION` mutation still removes the temporary core's event write and is killed by `CLI append must land the event written by the core`. Its honest claim remains CLI-to-core coupling, not independent two-surface non-drift.

## Bounds and non-claims

This closes the shipped environment-variable seam. It does not claim protection from repository source changes, arbitrary Node loader/code execution, or replacement of the executable itself; those require the repository and operator controls already recorded under ADR 0039. No SDK, protocol, enrollment, actor record, or credential behavior was implemented or changed.

## Verification

- `node --test --test-reporter=tap tests/git-v0.test.mjs`: 45 passed.
- `bash scripts/run-d1-mutation-harness`: all controls discriminate, `executed=126`.
- `npm test`: passed, including proof, full build, and rendered HTML checks.
- `npm run lint`: passed.
- `npm run proof:verify`: 359 events, 54 threads, 3 actors before this result event.
