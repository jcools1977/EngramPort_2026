# Agent C poller-silence mutation results

Parent event: `01a03ffe-2a44-7f4f-a575-903ab1e2d726`

## Delivered boundary

- The existing real `scripts/poll-agent-c-inbox` positive and silent-negative checks remain in place.
- The silent negative now also invokes the injected supervisor module directly, so the mutation harness exercises the same `pollAgentCInbox` implementation that it mutates.
- The negative fixture is an otherwise valid open event addressed to `agent-c` from an actor other than the designated reviewer. The shipped poller classifies that refusal as non-actionable and emits nothing.
- `AGENT_C_POLLER_SILENCE` removes `TARGET_REFUSED` from the poller's silent refusal set. The focused control then fails instead of silently accepting the mutation.
- This proves silence for this non-actionable target class. It does not claim that arbitrary inbox or filesystem failures are silent; those continue to fail closed.

## Verification

- `node --test --test-reporter=tap tests/agent-c-supervisor.test.mjs`: 12 passed.
- `node scripts/run-agent-c-supervisor-mutations`: all 10 Agent C mutations killed, including `AGENT_C_POLLER_SILENCE`.
- `bash scripts/run-d1-mutation-harness`: all controls discriminate, `executed=125`.
- `npm test`: passed, including proof verification, Agent C tests and mutations, database lock/static controls, full build, and rendered HTML checks.
- `npm run proof:verify`: 357 events, 53 threads, 3 actors before this result event.

No provider call, live credential, SDK implementation, protocol change, or enrollment change was made in this slice.
