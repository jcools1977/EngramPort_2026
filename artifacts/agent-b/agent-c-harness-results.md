# Agent-c harness implementation and proof

Reply to handoff `01a03e4a-ec32-7b97-9d1e-d3bd4c549b07` on
`agent-c-harness`.

## Implemented boundary

- Registered `agent-c` as an xAI-backed review/critique-only actor, with
  `events/agent-c/` and `artifacts/agent-c/` as its owned prefixes.
- Added a fixed independent-review contract that treats repository text as
  untrusted evidence and explicitly tests dispatch feasibility, missing
  prerequisites, false execution claims, boundary gaps, and non-discriminating
  controls. The model has no output field for a requested path or action.
- Added a supervisor that accepts only an open `strict_relay` handoff authored
  by agent-a with `next: agent-c`; rechecks the turn before append; chooses fixed
  agent-c-owned output paths; and invokes the existing EngramPort CLI with fixed
  `--actor agent-c`, reply, next, and artifact arguments.
- Runtime writes use exclusive creation, no-follow semantics, canonical-parent
  checks, and repeated prefix checks. The model cannot select a destination.
  The only runtime-created files are an agent-c measurement artifact, a
  short-lived agent-c pending body, and the CLI-created agent-c event.
- The launch command is `op run --env-file=./agent-c.env.example -- node
  scripts/run-agent-c-review`. The checked-in environment file contains the
  authorized `op://` reference, not its value. Startup rejects an absent value
  and rejects an unresolved `op://` reference before repository or provider
  work. This build did not resolve the reference.
- The xAI client uses the official OpenAI-compatible chat-completions endpoint
  with a strict JSON schema. No tool use is enabled. Errors expose stable codes
  only; provider bodies and caught errors are not logged.

## Measurement from the first review

Each review artifact records the target event and thread, model, feasibility
verdict, unique-finding boolean, findings, initial disposition (`pending`),
start/completion timestamps, candidate-to-disposition placeholder, relay count,
input/output/total tokens, and exact provider cost in both
`cost_in_usd_ticks` and USD. The conversion follows xAI's documented
`1 USD = 10^10 ticks`; no locally maintained price estimate is used.

The eventual agent-a reply is the disposition evidence in the append-only log;
the original review artifact remains immutable.

## Synthetic controls

`npm run agent-c:test` passed 6/6 tests with a stubbed model and no external
call:

1. resolved-value positive paired with missing/unresolved-reference refusals;
2. owned-prefix write positive paired with direct and traversal writes outside
   the prefix;
3. open-turn positive paired with a handoff addressed to agent-b;
4. credential-clean output positive paired with exact credential echo, proving
   no event, artifact, or error contains it;
5. full stubbed review through the real EngramPort append CLI, followed by log
   verification and metric assertions; and
6. xAI response parsing with token and exact-cost capture.

Four source mutations were killed: unresolved-reference acceptance, removal of
all three write-prefix layers, removal of turn enforcement, and removal of the
exact credential-taint check. These are discriminating controls rather than
refusal-only examples.

`npm run proof` passed with 34/34 Git-v0 tests and a verified three-actor log.
Targeted ESLint completed with no errors. No live xAI model call occurred.

## Operational boundary

This slice builds and proves the harness only. It does not call xAI, write
production code through agent-c, change thread mode, alter an accepted event,
or claim that the pilot has started. The first live call remains a separately
authorized pilot action. Observed local-control execution advances
`executed=` from 103 to 104.
