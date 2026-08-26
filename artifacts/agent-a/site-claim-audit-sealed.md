# agent-a's independent audit of the live site as a specification

Author: agent-a. Date: 2026-08-26.
**Committed before agent-b was asked, deliberately not shared in the handoff.** Independence by commit order, per F91 and F92. Source read: `app/page.tsx` (158 lines), full user-visible string extraction rather than sampling.

## Verdict summary

| Claim | Verdict |
|---|---|
| Append a typed event; never overwrite another participant's history | **TRUE, demonstrated** |
| Reply with explicit causal links, provenance, and safe retries | **PARTLY TRUE** — links and provenance yes; "safe retries" unevidenced |
| Transfer responsibility with bounded context and completion criteria | **TRUE, demonstrated** |
| Find addressed work and relevant context through durable cursors | **PARTLY TRUE** — `inbox` uses **no cursor at all** |
| `npm install @engramport/sdk` | **FALSE — no such package exists in this repository** |
| Event vocabulary in the demo console | **FALSE — advertises four types the protocol does not accept** |

## The two hard failures

**1. The SDK does not exist.** `packages/` holds `git-adapter` and `port-watch`; **neither declares `@engramport/sdk` and neither has a `package.json` at all.** The front page shows a copy-pasteable install command with nothing behind it in this repository. Whether something is published to npm from elsewhere cannot be determined from here and **must not be assumed** — the claim is checkable and currently unmet.

**2. The advertised event vocabulary is not the implemented one.** The demo console shows `handoff.created`, `handoff.claimed`, `artifact.registered`, `handoff.completed`. The verifier accepts exactly `message, handoff, reply, completion, artifact, decision, task, acknowledgment` (`verify-log.mjs:8`). **None of the four advertised dotted names would validate.**

Worse than a naming mismatch: **`handoff.claimed` advertises a claim step that does not exist.** `grep` finds no `claim` operation in the CLI or PROTOCOL.md, and the protocol is strict-relay assignment by `next` — **there is nothing to claim.** PROTOCOL.md's own opening sentence promises agents can "discover, **claim**, answer, and complete" durable work, so **the gap is between the protocol's stated ambition and its implementation, not merely between the site and the code.**

## The two soft failures

**3. "Durable cursors" is the wrong description of `inbox`.** `cli.mjs` contains **zero** occurrences of `cursor`; `inbox` recomputes the answered set from the entire log on every invocation. **`port-watch` genuinely has cursors** — nine references — so the capability exists in the product, but **not in the surface the site is describing.** This is closer to a mislabel than a fabrication, and it will become false in a stronger sense as the log grows.

**4. "Safe retries" has no located implementation.** Causal links (`in_reply_to`) and provenance (`content_sha256`, digest-pinned artifacts) are real and enforced. **Retry semantics — idempotency keys, replay tolerance, at-least-once delivery — were not found.** Recorded as unevidenced rather than false, because absence of a grep hit is weaker than the two hard failures above.

## What is genuinely true, and it is the important half

The core proposition **works and this session is its evidence**: 298 events across 41 threads, append-only, with a verifier that **rejected agent-a's own attempt to reply to itself**. Bounded handoffs carrying objective and completion criteria are what every slice today has used. **The product's central claim is not marketing.**

## Recommendation

**Fix the two hard failures before anything else ships**, because both are checkable by any visitor in under a minute. **Either build the SDK or remove the install line** — an install command that fails is worse than no install command. **Either implement the dotted vocabulary and a claim step, or change the console to show the events the system actually emits.**

**Rank: the vocabulary gap is the more serious of the two**, because it advertises a coordination model — claiming — that the protocol does not implement, and a buyer evaluating EngramPort would reasonably design against it.

## Confidence

**Highest on the two hard failures**, both mechanically verified. **High on the cursor mislabel**, a zero-occurrence grep against an explicit noun. **Lowest on "safe retries"**, where agent-a searched for an implementation and did not find one, which is weaker evidence than finding a contradiction.
