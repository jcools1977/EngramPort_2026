# Project constraints register

Status: current
Date: 2026-08-14
Purpose: record standing constraints that shape sequencing, so they are decided once rather than rediscovered each session.

## C1. No Docker or PostgreSQL host is available to either agent

**Recorded:** 2026-08-14, confirmed independently by both actors.

Neither agent environment has `docker`, Docker Compose, PostgreSQL, or `psql`. agent-b confirmed this on thread `priority`; agent-a confirmed the same absence on this machine while reviewing migration `0001_canonical_core`.

**Consequences, all currently in force:**

- Migration `0001_canonical_core` has never been executed. Its isolation and immutability suites are unrun. Per this project's standard, unexecuted code is not evidence of a working control, so the v0.1 gate in specification section 27 is **not met**.
- The three code-level review findings on thread `v0.1-event-service` are editable without a host, but cannot be proven without one. They stay queued.
- Wizard phase W2, onboarding T2, and Re:PORT R3 onward are all blocked on the same host.

**Unblocking this is the highest-leverage action available to the project.** One Docker-capable host closes the v0.1 gate and unblocks three separate workstreams at once. It requires operator-provided infrastructure or authority; neither agent can obtain it.

**Working rule while C1 holds:** prefer tasks provable on Node alone. Do not stack further unproven database work on unproven database work.

## C2. Work-in-progress limit of one

**Recorded:** 2026-08-14, proposed by agent-b on thread `priority` and adopted.

agent-b holds **one** active implementation item at a time. Further items may sit visible in the inbox as a queue, but are not claimed or started until the active item is returned and independently reviewed.

Current state: W0-1 is active and under revision. PW1 is queued and **not eligible**. The v0.1 code findings are queued behind PW1. Re:PORT R1 and onboarding T1.5 are specified and undispatched.

The coordinator's obligation under this rule is to keep the queue ordered and to say plainly which single item is eligible, rather than appending work and letting priority be inferred from arrival order.

## C3. Approval digests must bind the step list, not a summary

**Recorded:** 2026-08-14, raised by agent-b as a W0-1 design finding, promoted to a constraint on ADR 0012 decision 5.

ADR 0012 chose coarse approval grouping over per-step approval, arguing that thirty approvals train a founder to approve without reading. That argument holds **only** if the group approval binds the ordered `(step_id, action_digest)` list and surfaces per-step parameter diffs. A digest taken over a prose summary of a plan would conceal material change while appearing to satisfy specification section 6.3, which would convert a real control into a comfortable one.

This is now binding on wizard phase W1 and is not an open question.

## C4. Re:PORT is specified and undispatched

**Recorded:** 2026-08-14, operator instruction.

The Re:PORT design is complete and committed. No R-task may be handed to agent-b until the queue above clears and capacity is confirmed. R1 is fully specified so that dispatch requires no further design work.

**No Re:PORT feasibility or cost finding exists.** agent-b stated on thread `priority` that it has not inspected the Re:PORT design, because R1 is not dispatched and it will not work from repository design artifacts alone. That is correct behavior under C2 and should not be mistaken for a finding. Any future Re:PORT cost consideration must originate from agent-b reviewing bound inputs under an eligible handoff.
