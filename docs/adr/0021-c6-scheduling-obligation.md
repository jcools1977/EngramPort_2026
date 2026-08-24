# ADR 0021: C6's scheduling requirement is a deployment obligation; the mechanism is proven here, the schedule is not

Status: accepted, 2026-08-24. Author: agent-a.
Context: thread `wizard-w1-1-scope`, the durable session lifecycle slice and its closing-gap assessment. Related: constraint C6, gate C17, threat model row 3.16, ADR 0020.

## Context

C6 requirement 2 reads: *"Deletion or tombstoning of expired rows MUST be a **server-side scheduled operation**, not a side effect of application traffic. A workspace nobody touches for a month must not retain live-looking authority for a month."*

Migration `0020` supplies `sweep_expired_setup_session_delegations()`. It is callable by `engram_maintenance` with no application call, its tombstone is proven live — `swept=1 expired_state=expired expired_stamped=true live_state=none` — and it is defended by its own mutation. agent-b declined to claim the requirement satisfied, correctly, and named `pg_cron` or a managed scheduler as deployment options while stating neither is installed. Verified: no `pg_cron`, no scheduler and no invocation appears anywhere in `migrations/`, `deploy/` or `scripts/`.

## Decision

**C6 requirement 2 splits into a mechanism and a schedule. The mechanism is satisfied here. The schedule is a deployment obligation and is deferred with a named trigger.**

**`pg_cron` is not installed into the local stack.** It requires `shared_preload_libraries` and therefore a replacement for the `pgvector/pgvector:pg16` image that **all 83 accepted database controls run against**. That blast radius is not justified by one requirement, and a locally scheduled cron would in any case prove only that a local container ran a job — not that the deployment target schedules it. **Proving the wrong thing loudly is worse than recording the gap.**

**What is provable here is required now: the routine must be repeat-safe.** A scheduler's entire contract is calling the same routine repeatedly, on an unknown cadence, possibly concurrently with application traffic. So the sweep must be shown **idempotent** — a second and third invocation over the same rows changes nothing further and reports no additional work — and safe to run while a live session exists, leaving unexpired rows untouched. That is the part a schedule depends on, it is synthetic-provable, and without it a schedule would be unsafe to add later.

**The trigger for closing the schedule half is explicit**: it closes when a deployment target is chosen and its scheduler invokes the routine, evidenced against that target. Until then **C6 requirement 2 is half-satisfied and C17 does not close**, since C17 requires the durable form to satisfy C6.

## Consequences

1. **C17 stays open**, and W1-1 cannot close it. Row 3.16's "Model C, in memory today" remains carried under F18 rather than corrected.
2. **The sweep's repeat-safety and live-row safety become required evidence** in the next slice, with a discriminating mutation.
3. **The scheduling obligation is recorded with an owner**: it belongs to whoever provisions the deployment database, which is outside this project's synthetic-only boundary and is DeVere's to choose. This ADR does not recommend a target.
4. **No accepted control changes.** The compose stack, its image and the 83 controls are untouched by this decision.
5. If a future slice installs a scheduler locally, this ADR is the record of why it was not done earlier, and that slice must state what the local schedule does and does not prove about production.
