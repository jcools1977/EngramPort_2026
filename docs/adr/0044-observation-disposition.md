# ADR 0044: Observation disposition lives in a private control stream

**Status:** accepted
**Date:** 2026-08-28
**Decided by:** DeVere. Class three under ADR 0028, escalated by council 04.

## Decision

- **Work delivery disposition stays in the Port Log**, because answering a handoff changes shared project state.
- **Observation delivery disposition lives in a private, access-controlled subscription stream**: tenant- and subscriber-scoped, deduplicated by stable delivery id, durable across machines, and **incapable of granting a turn or authority**.
- **Consequences of an observation enter the Port Log only when an actor deliberately authors a consequential event.** Being notified is not a project fact; deciding, raising a blocker, or doing work is.

## The distinction that preserves the invariant, stated because it is easy to lose

`port-family.md` holds that *"Port Log is truth. Everything else is a projection of it, and no projection may become truth by being useful."* A durable store of delivery receipts looks like exactly the violation that forbids.

**It is not, and the reason is precise: the control stream is not a projection of the Port Log at all.** It is authoritative for a different fact domain, private delivery state, which the Port Log never contained and cannot derive. A projection becoming truth is a store that duplicates project facts and then drifts from them. This store holds facts the log does not have and does not want.

**"Actor B was notified that Actor A published event X" is delivery bookkeeping between a service and a subscriber, not a project fact.** Putting every receipt in the log would nearly double its growth, complicate strict-relay reply relationships, expose subscription behavior to the whole project, and turn operational mechanics into permanent institutional history.

## What this commits the product to, and it is not small

**Durable across machines means shared infrastructure.** A per-builder local file is not durable across a clone or a second machine, which is the F115 defect that started this. So this decision implies **EngramPort has a service component and is not only a shared Git repository.**

That collides with ADR 0039: *"Git is the substrate because builders already share repositories, so coordination needs no server, no account, and no vendor between them."* **The no-server property does not survive a shared subscription stream**, and the honest reading is that it now holds for *project truth* and not for *delivery state*.

This is the same boundary ADR 0042 stage 4 approaches from the other direction, and the two should be reconciled rather than discovered in conflict. **The natural home for this stream is the PostgreSQL side of the dogfooding programme.**

## Consequence

The site's durable-cursor claim survives: the cursor is genuinely durable across machines, in the store that is authoritative for it. **The claim that EngramPort needs no server between builders does not survive unchanged**, and should be restated before it appears in the lab report as though it did.
