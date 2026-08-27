# Council 03 — agent-b independent durable-cursor recommendation

## Independence attestation

I did **not** open `artifacts/agent-a/council-03-recommendation-sealed.md`,
its historical contents, or any agent-a Council 03 recommendation body before
committing this recommendation. I inspected the addressed handoff, the Port
Watch implementation and tests, the Port Watch design, the Port-family
invariant, F115, and the relevant protocol-governance record.

Council 03 predates ADR 0041's digest-first protocol and agent-a's plaintext is
already present in Git history. This file therefore follows the handoff's
attestation protocol; it does not claim cryptographic blindness retroactively.

## Recommendation — persist delivery facts, derive the cursor

A cursor should not live as a mutable authoritative number anywhere. The
durable facts from which it is derived should live in Port Log as records of
Port Watch's own activity. A local or database projection may cache the answer,
but deleting that projection must leave enough accepted log evidence to rebuild
the same delivery state.

The authoritative model should contain:

1. a stable watch subscription id, actor, project, authorized selector, and
   delivery policy;
2. a stable delivery id for each `(subscription, source event, delivery class)`;
3. accepted lifecycle facts for offered, claimed, lease-expired, completed,
   failed, dead-lettered, replay-requested, and terminally dismissed delivery;
4. claim version and fencing data enforced by the canonical append/control
   boundary; and
5. an explicit, authorized baseline event only when an operator intentionally
   chooses not to replay earlier history.

These are not Port Watch asserting project facts. They are facts about what the
delivery component observed and did, which `docs/architecture/port-family.md`
already permits Port Watch to append. The derived state — scan watermark,
outstanding deliveries, active claims, and terminal dispositions — remains a
projection and may be deleted and rebuilt.

## The cursor is compound, not one number

Use two distinct concepts:

- **scan watermark:** the highest canonical log position whose events have been
  evaluated against the subscription; and
- **delivery ledger:** the set of eligible delivery ids and their durable
  dispositions.

Advancing the scan watermark does not settle work. It only says selection has
examined that prefix. An unanswered delivery at position 10 remains outstanding
even after the scan watermark reaches position 50. Completing the delivery at
position 50 settles only that delivery id and cannot erase position 10.

On restart or a fresh clone, Port Watch reads the subscription and lifecycle
events from Port Log, reconstructs the ledger, resumes expired or unsettled
deliveries at least once, and continues selection after the derived scan
watermark. A checkpoint table or file may accelerate this operation, but it is
accepted only after comparison to the log-derived digest and can always be
discarded.

This means the current `FileWatchStore` is not the durable store. Its JSON file
may remain a development cache, but it cannot decide whether an event was
delivered, settled, skipped, or claimable.

## Advancement and replay rules

Remove the public ability to assign an arbitrary cursor position. Neither
forward nor backward movement is a primitive.

- Forward progress occurs only because source events were classified and any
  eligible delivery received a durable disposition.
- Completion settles the claimed delivery id after a fencing check; it does not
  take `Math.max` over a global position.
- Failure leaves the delivery retryable or moves it through the declared retry
  and dead-letter policy; it does not silently settle as success.
- Operator replay appends a scoped `watch.replay.requested` fact naming delivery
  ids or a bounded log range. The existing lifecycle is not rewritten and no
  cursor moves backward.
- An intentional migration baseline is an authorized, audited event. It is not
  inferred from a local number and cannot be advanced silently by an ordinary
  caller.

Controls should mutate each gate independently: arbitrary forward assignment,
completion without fencing, completion that settles another delivery, scan
advance that drops an outstanding delivery, and replay without operator
authority.

## One eligibility core for inbox and watch

`listInbox` and Port Watch should share the same authorized work resolver for
addressed responsibility. An event is actionable work when the actor is the
current `next`, the causal turn remains unanswered, authorization permits it,
and no terminal lifecycle fact has settled the corresponding delivery. That
same result drives both inbox visibility and wake eligibility.

`implementation_authority` alone is not an inbox predicate. The current
`decideWatch` behavior — selecting only the first handoff carrying that flag —
should be replaced by an ordered, bounded delivery batch. Replies, artifacts,
and completions are selected according to an explicit subscription rather than
discarded merely because they are not implementation handoffs.

## Yes, delivery must sometimes include events for which the actor is not next

Yes. A participant may subscribe to a thread or causal chain in order to learn
that another actor completed work while that other actor held the turn. Defining
position purely as unanswered addressed work would make this impossible.

The model must keep two delivery classes separate:

1. **work delivery:** the actor is the authorized current target. It may appear
   in the inbox and may carry whatever implementation authority the handoff
   grants.
2. **observation delivery:** an authorized subscription matches an event even
   though another actor is `next`. It may wake a watcher to observe or report,
   but it grants no turn, claim, approval, or implementation authority and does
   not appear as addressed inbox work.

Both classes use stable delivery ids and at-least-once settlement. Their
selectors, outputs, and authority effects are different. A completion watcher
therefore receives the event without pretending responsibility was transferred.

## Concurrency and the authoritative boundary

Two processes must not coordinate through last-rename-wins JSON. The canonical
append/control boundary should enforce one active claim per delivery id with a
transactional uniqueness or compare-and-set rule, a bounded lease, and a
monotonic fencing value. One claimant wins; losers receive a typed conflict.
Completion from an expired fencing value is refused.

An append-only event file convention without an authoritative transactional
boundary cannot provide that cross-machine guarantee. The funded build must use
the canonical Port Log service/database semantics or an equivalently protected
append service. If the uniqueness table is deleted, it must be reconstructible
from accepted claim lifecycle events; otherwise the table has become a second
truth surface.

## Migration story

Existing local JSON cursor state is advisory input, not truth, and should not be
imported as an unexplained durable watermark.

1. Register each existing `(agent, project)` configuration as an authorized
   watch subscription with a stable id.
2. Rescan Port Log from the beginning for that subscription and derive already
   settled work only from durable causal replies, completions, and other accepted
   evidence. If settlement cannot be proven, re-deliver at least once.
3. Do not migrate a local `active_run` or lease. Revoke or expire it and require
   a fresh canonical claim with a new fencing value.
4. If an operator elects not to replay history, append an explicit baseline
   acceptance naming the subscription and position. The migration report must
   distinguish this deliberate skip from derived completion.
5. Retain the old file only as a rollback artifact, then stop reading it for
   delivery decisions. A fresh clone and a second builder must derive the same
   ledger from Port Log.

This migration favors duplicate delivery over silent loss, matching the stated
at-least-once contract.

## Protocol classification

This is a class-three change under ADR 0028. It changes delivery semantics,
introduces caller-visible claim and replay behavior, permits subscription-based
observation outside `next`, and adds durable lifecycle event meaning. DeVere's
ADR 0040 funds durable cursors in principle, but the exact event kinds,
authorization rules, retention, and activation evidence should be recorded in
the implementing ADR before the claim is restored.

## Evidence that would change my mind

I would accept a durable consumer-offset service instead of lifecycle events if
it were already part of the authoritative Port Log boundary and a proof showed
that deleting and rebuilding every projection reproduced identical outstanding,
settled, replayed, and claimed deliveries without consulting the lost offsets.

I would simplify position to unanswered addressed work if product requirements
explicitly prohibited observation subscriptions and completion watching. The
current handoff asks the opposite, and the Port-family design describes delivery
consumers that need thread outcomes beyond their own turn.

I would import a local cursor as authoritative only if it carried independently
verifiable, log-bound evidence for every skipped delivery. A bare integer and a
filesystem timestamp would not change the recommendation.

## Execution accounting

This is recommendation only. No source, schema, protocol, copy, test, mutation,
or runtime behavior changed, and `executed=` does not move.
