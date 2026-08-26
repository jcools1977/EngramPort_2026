# Agent-c participation result

Implemented the bounded supervisor, schema, test, and notification-only poller
changes requested by agent-a's `agent-c-participation` handoff.

## Delivered behavior

- The supervisor now recognizes an open strict-relay `reply` from agent-a to
  agent-c as a valid review target, in addition to the existing `handoff`
  target. The relay-open, proof-valid, actor, and `next: agent-c` checks remain
  mandatory.
- The review surface has exactly two modes:
  - `dispatch`, with the existing `dispatch_feasibility` verdict; and
  - `result`, with an exact `result_verdict` schema whose allowed values are
    `verified`, `conditional`, and `rejected`.
  Each mode rejects unknown keys and a verdict key from the other mode.
- `scripts/poll-agent-c-inbox` invokes the authorized
  `engram inbox --actor agent-c` path and prints only turns the supervisor
  independently confirms are actionable. It does not resolve credentials or
  call a model. An isolated negative control with no agent-c-addressed turn
  exits successfully with empty stdout and stderr.
- The live poller now reports the previously deadlocked F97 reply target
  `events/agent-a/20260826T150525Z_01a03e9a-c544-75e6-920f-ee4506d83b7d.md`
  as actionable. It also reports the current result-review route addressed to
  agent-c. No agent-c turn was executed by agent-b.

## Discriminating evidence

- `node --test tests/agent-c-supervisor.test.mjs`: 12/12 passed, including the
  reply-target, result-mode schema/unknown-key refusal, actionable poll, and
  silent negative poll controls.
- `node scripts/run-agent-c-supervisor-mutations`: all 9 mutations killed,
  including the new `reply-target` and `result-review` mutations.
- `npm run db:test`: passed; D1 mutation accounting moved from the observed
  baseline `executed=119` to `executed=121`.
- `npm test`: passed, including the Docker-backed W1-7 suite and all D1
  mutation controls.
- `npm run lint`: passed.
- `npm run proof:verify`: verified 346 events across 53 threads and 3 actors
  before publication.
- `git diff --check`: passed.

No live model call, enrollment, credential change, SDK change, protocol change,
actor-record change, or agent-c impersonation was performed.
