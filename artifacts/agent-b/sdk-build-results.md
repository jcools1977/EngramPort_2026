# Agent B SDK build result

Parent handoff: `01a04d9a-f199-7161-b9ed-e98678370ac5`

## Delivered surface

- Added the private workspace package `@engramport/sdk` at `packages/sdk` without publishing it.
- The SDK statically imports and re-exports the same `appendEvent`, `listInbox`, `listInboxEntries`, and `validateAppendInputs` bindings consumed by the CLI. It composes the existing Port Watch package instead of implementing another verifier, writer, inbox resolver, or delivery engine.
- Added `EngramPortClient` / `createClient` wrappers for append, inbox, causal reply, bounded handoff, completion, and Port Watch construction.
- Added workspace resolution and a root `sdk:test` gate.

## Claim coverage

| Claim | Coverage | Qualification |
| --- | --- | --- |
| Append a typed event; never overwrite another participant's history | Full | Never-overwrite is structural: actor-owned path derivation, exclusive `wx` creation, and whole-log actor-directory verification. No unreachable public-operation refusal was staged. |
| Find addressed work; Port Watch delivers new work | Partial | Shared inbox discovery and the existing Port Watch runner are exposed. Position is log-derived and local control/claim stores are file-backed, so no portable cross-host durable cursor is claimed. |
| Reply with causal links, provenance, and safe retries | Full at intent level | Replies require an explicit parent and event-core binds the canonical append intent. Matching retry means equal intent only; it neither authenticates the caller nor proves possession. |
| Transfer responsibility with bounded context and completion criteria | Full | Version-1 handoffs carry bounded references and stable criteria; completions retain event-core's exact evidence-coverage enforcement. |

When an actor is absent from `actors/*.yaml`, event-core refuses the candidate because its event path is not registered and creates no actor directory. That is registry-structure validation, not enrollment or authorization.

## Discriminating evidence

- `SDK_CORE_WRAPPER` mutates the shared event-core writer. Both the CLI delegation test and SDK delegation test fail against that one mutation, then both return to green after restoration: `baseline=0 applied=t after=1 cli_and_sdk_forbidden=t restored=0`.
- The SDK test presents an `agent-b` event with an `artifacts/agent-a/...` reference. It receives `artifact-prefix ownership violation` and asserts that `events/agent-b` remains empty.
- The focused SDK suite passes 6/6 tests.
- The repository verified at the observed pre-completion baseline of 409 events across 69 threads and 3 actors. The dispatch's quoted 408-event count was stale by one event; no existing event was changed.
- The full gate `npm run verify:all` passed: application tests, production build, database controls, mutation harness, live Vault differential, and lint.
- The mutation harness moved from the observed `executed=144` baseline to `executed=145`, with all 145 controls discriminating.

## Explicit non-deliveries

- No npm publication occurred.
- No site copy changed. F125's obsolete “durable cursors” wording remains a separate product-language decision.
- No protocol, envelope, enrollment, or attribution-hardening behavior changed.
