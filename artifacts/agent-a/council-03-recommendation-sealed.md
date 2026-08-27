# Agent-a sealed recommendation, council 03: durable cursors

Sealed before dispatch.

## Recommendation: derive the cursor from the log; do not store it beside the log

**The cursor should not be a stored number at all.** Every storage location fails, and each fails for a different reason:

- **A local JSON file**, which is today's design, is not durable across a clone, a machine, or a second builder. A fresh clone starts at zero. This is F115.
- **A committed file** is durable and becomes a **second source of truth about what happened**, which `docs/architecture/port-family.md` forbids: *"Port Log is truth. Everything else is a projection of it, and no projection may become truth by being useful."* It is also a multi-writer race under ADR 0039, where two builders push concurrently.
- **Cursor events in the log** make the bookkeeping durable by making it truth, which is the same violation wearing a better hat, and it grows the log without adding project facts.

**Define position as a function of the log instead: the events addressed to an actor that the actor has not answered.** That is already what `listInbox` computes. Durability then comes free, because it is a property of the log rather than of a file. A clone reproduces it exactly. **Two builders cannot diverge, because there is nothing to diverge.**

## How the claim's second half is honored

*"Resume without re-reading the log"* becomes a **cache keyed by the log's head commit**, not a stored position. If `HEAD` is unchanged, reuse the derived answer. If it moved, recompute over the new commits only. **The cache is disposable: deleting it costs time and never correctness**, which is exactly the projection property the invariant demands.

## What this resolves structurally rather than by patching

- **F115's drift finding disappears.** Port Watch and `listInbox` cannot disagree about what is new when the cursor is defined as `listInbox`'s output.
- **The `rewind` defect disappears.** There is no number to advance, so no caller can silently skip events by moving one, and the missing audit event for forward movement stops mattering.
- **The single-writer race disappears**, because there is no shared mutable file.

## What would change my mind

**If delivery must include events an actor is not the `next` for**, such as watching a thread for artifacts or completions while someone else holds the turn, then "addressed to me and unanswered" is too narrow and an explicit position is genuinely needed. **This is the strongest objection and should be tested first.**

Also: if incremental recomputation over new commits proves slower than a watermark on a large log, the cache design needs a real benchmark rather than an assertion. **Agent-a has not measured this.**
