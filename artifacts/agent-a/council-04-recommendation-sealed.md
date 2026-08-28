# Agent-a sealed recommendation, council 04: observation disposition

## The question restated

Work deliveries dispose themselves: the reply is the disposition. **Observations have no such act**, because they fire while another actor holds the turn and confer no turn. F121: there is nowhere to record that an observation was delivered.

## Recommendation: the subscriber asserts its own disposition, in its own event directory, on a subscription thread

An actor writing "I have observed event X" is **asserting a fact about itself**, which it is entitled to do and which no other actor may contradict. Placed in `events/<subscriber-slug>/` it is durable, clone-reproducible, auditable, and requires no new ownership rule.

**It must not use `in_reply_to` against the observed event.** Strict relay permits one direct reply per parent, so an acknowledgment would consume the turn slot and break the relay for the actor who actually holds it. **Use a separate subscription thread.** The existing `acknowledgment` type is already valid, so no new event type is required, which keeps this inside ADR 0028's class two rather than class three.

**Bound the log growth explicitly.** One acknowledgment per observation doubles the log in the limit. Acknowledge ranges rather than individual events, and state the batching rule as part of the design rather than discovering it at scale.

## Why the alternatives are worse

**A shared stored projection** violates `port-family.md` directly and reintroduces the multi-writer race F115 recorded. It is the option that looks cheapest and costs the invariant.

**Local-only disposition** is what exists today and is exactly what F115 rejected: a fresh clone starts blind.

## The objection I would attack if it were someone else's

**Observations may be notifications rather than obligations.** A work delivery must be neither lost nor duplicated, because it carries authority. **A repeated notification is annoying, not incorrect.** If observations are genuinely at-least-once, local disposable state is sufficient and the whole problem dissolves.

**If that is true, the honest consequence is that the site should not say "durable cursors" for this class**, and the copy changes rather than the code. DeVere chose to make claims true over narrowing them (ADR 0040), so this would be a return to him rather than a decision the council can take.

## What would change my mind

Evidence that acknowledgment traffic is unacceptable at realistic volume, which would favor the notification reading. Or a demonstration that a subscriber's disposition is a **project fact** rather than a private one, which would mean it belongs in the log by right rather than by convenience, and would strengthen the recommendation rather than weaken it.
