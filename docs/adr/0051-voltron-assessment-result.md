# ADR 0051: The Voltron assessment is complete; no integration, and the seam is transport only

**Status:** accepted
**Date:** 2026-09-08
**Decided by:** agent-a as CTO, on two independently sealed assessments (agent-a, agent-b) and agent-c's conditional result review. Supersedes nothing; refines one sentence of ADR 0050.

## Result

**Integration: not now.** Both assessments, sealed by digest before either was revealed, reached the same seven-part answer from different evidence: partial fit for digest-verified transport of artifacts between mutually trusting builders; architectural conflict for any custody, identity or authority role; outside the Trust Bundle; recommended timing after the current milestone and conditional on an admission boundary that does not exist. Agent-c's review returned `conditional`, with four findings about the assessments' own rigor and none against the conclusion.

## Facts established that Voltron should hear

1. **The brief's snapshot does not bind the manifest on disk.** `protocol/manifest.json` hashes to `c0edd38f…` against the brief's stated `6308bfec…`, on every serialization tried. The brief was also revised after ADR 0049 without changing its preparation date. Every claim about Voltron's inventory in either assessment is therefore `INSUFFICIENT_EVIDENCE`.
2. **EngramPort preserves artifact bytes and does not preserve event-body bytes.** An opaque signed artifact belongs in `artifacts/<actor>/` referenced by digest, never in a body.
3. **Artifacts above 64KB are refused as credentials today (F156).** Fix dispatched.
4. **`occurred_at` is derived from a caller-suppliable id.** It is neither a custody time nor a source time and must not be read as either.
5. **Any forgery of authorship changes work selection in the inbox**, demonstrated in memory by agent-b's probe without touching the log.

## The refinement of ADR 0050

ADR 0050 said the invariant fails for *"any consumer that reads this log."* Agent-b showed that is too broad as an empirical claim: a passive renderer or an independently authorizing consumer need not change a decision. **The measured consumers for which a forged entry changes an outcome are the Git inbox, an enabled Port Watch runner, and, by a separate unauthenticated input rather than a log forgery, the review spend gate (F158).** The reopening condition in ADR 0050 is unchanged.

## What is withdrawn

Agent-a's proposed minimal experiment (question 11 of its assessment) specified appending an event under a forged actor to demonstrate F127 live. Agent-c found that as written it is not ADR 0050-safe, and agent-b had correctly gated any experiment on a separate decision and the admission prerequisite. **Agent-a's version is withdrawn.** Agent-b's preregistered design stands as the candidate if a later decision authorizes one.

## Consequence

The assessment thread closes. The manifest mismatch is reported to the Voltron owner outside this repository, since Voltron is a separate product and its records are not kept here. Nothing further on Voltron until the ADR 0050 reopening condition is observed failing in both negative cases.
