# Council 03 — post-seal comparison and returned recommendation

Agent-b committed its independent recommendation as `2ac64bd` before opening
agent-a's recommendation. Before that commit, I had not opened
`artifacts/agent-a/council-03-recommendation-sealed.md` or its Git history. I
opened it only afterward and verified its published sha256 as
`f9a86056c2510eeeb3eee27ee9cf5c9c781f4c347d173603ad504fc0baadfa66`.

## Core convergence

Both recommendations reject a mutable cursor number as authoritative state.
Both derive delivery position from durable log evidence, permit a disposable
cache, eliminate arbitrary forward/backward assignment, and require the inbox
and watcher to share eligibility logic for addressed work.

That convergence is substantial: the current `FileWatchStore` is not the
durable product store, a committed cursor file would be a racing second truth,
and a fresh clone must reproduce the same answer without trusting local state.

## The decisive split — inbox position is too narrow

Agent-a proposes defining position entirely as events addressed to the actor
that the actor has not answered. It identifies the strongest objection itself:
delivery may need to include events for which the actor is not `next`.

Agent-b answers **yes**. A watcher may subscribe to a thread or causal chain in
order to receive an artifact, reply, or completion while another actor still
holds the turn. The Port-family design also describes delivery consumers whose
output is not identical to an addressed inbox. Therefore unanswered addressed
work cannot be the complete delivery position.

The returned design preserves agent-a's useful core for one class:

- addressed, unanswered, authorized events are **work deliveries** and share an
  eligibility resolver with `listInbox`;
- authorized thread/causal subscriptions produce **observation deliveries**
  even when another actor is `next`, but grant no turn, claim, approval, or
  implementation authority.

Both classes have stable delivery ids and durable dispositions. Only the first
appears as addressed inbox work.

## Correction — Port Watch activity events do not violate the invariant

Agent-a says cursor events in Port Log make bookkeeping truth and therefore
violate the projection invariant. A naked event asserting a mutable number
would be a poor design, but the invariant's own next paragraph explicitly
allows Port Watch to append records of its **own activity**. Accepted facts such
as subscription creation, delivery claim, lease expiry, completion, replay, and
dead-letter disposition are facts about what the delivery component did, not
invented project facts.

The mutable answer remains a projection. Scan watermark, outstanding set,
active claims, and terminal dispositions are derived from source events plus
those accepted lifecycle facts. Their cache can be deleted and rebuilt. This is
not the same as persisting an unexplained `cursor = 50` record whose value alone
decides that earlier work vanished.

Lifecycle facts are also necessary for properties agent-a's inbox-only function
does not resolve: two-machine claim exclusion, bounded leases, fencing stale
completion, failure/retry/dead-letter state, intentional replay, and settlement
of one event without skipping an intervening obligation.

## Cache limits

Agent-a's cache keyed by Git `HEAD` is safe as a cache but does not by itself
meet the cross-clone resume claim: a fresh clone has no prior cache and must
re-read the history. It also invalidates on commits unrelated to event delivery.
Agent-b's recommendation permits an equivalent cache, but correctness and
cross-machine convergence come from the log-derived delivery ledger. A benchmark
may determine checkpoint frequency and incremental indexing; it cannot decide
which facts are authoritative.

## Returned recommendation

Adopt a log-derived compound cursor:

1. a scan watermark records how far selection has evaluated;
2. a delivery ledger tracks stable work and observation delivery ids plus their
   accepted lifecycle dispositions;
3. completion settles only its fenced delivery id and never advances past other
   outstanding work;
4. `listInbox` and Port Watch share the addressed-work resolver, while explicit
   authorized subscriptions add non-authoritative observation delivery;
5. cross-machine claims use the canonical transactional Port Log boundary, not
   last-rename-wins JSON; and
6. local state migrates by full rescan and evidence-based settlement, favoring
   at-least-once re-delivery over silent loss.

This is a class-three protocol change under ADR 0028. This council recommends
the contract; it does not enact it. No source, schema, protocol, copy, test,
mutation, or runtime behavior changed, and `executed=` does not move.
