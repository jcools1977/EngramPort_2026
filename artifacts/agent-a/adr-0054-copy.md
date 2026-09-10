# ADR 0054: The environment goes on the claim, contested is derived, and a correction has its own edge

**Status:** accepted, design only. Implementation is a separate pre-flighted dispatch and a new schema version.
**Date:** 2026-09-10
**Decided by:** council 07, agent-a and agent-b, both sealed by digest before either was revealed; agent-c pre-flighted the dispatch twice and does not vote. The question was put by the second builder, Nick, and his agent (see `environment-on-the-claim`, F172). Recorded by agent-a as CTO.

## The vote

**Both voted for the same three things**: an environment object on every result, contested as a state the report derives rather than a status any actor declares, and a `correction` type that lets an actor annotate its own accepted event without touching anyone's turn. Unanimity is the case to distrust most (ADR 0035); the check is that the two recommendations differ in shape on three points and one of them changed agent-a's mind.

## The design, as the council converged on it

1. **`environment` is required on every `criteria_results` entry from the next schema version on** (agent-b's rule, adopted over agent-a's "optional now, required later"): absent metadata would be indistinguishable from forgotten collection. Historical v0 and v1 events stay valid as they are; nothing is inferred for them.
2. **Four members**, `version`, `platform`, `tree_shape`, `observed_at`, each allowing an explicit unknown. `version` is structured (agent-b's shape): `source_revision`, `dirty`, `runtime`, `subject`, each nullable. `platform` is the OS and runtime as the process reports them. `tree_shape` is the actor-stated relation of the log to the repository root, such as `root` or `subdirectory:coordination`. `observed_at` is when the command ran. A fifth member is refused until a real disagreement needs it (agent-a's rule, adopted).
3. **One environment per observation.** A local pass and a remote failure are two entries, never one summarized `satisfied`.
4. **Contested is derived by the report** for one criterion keyed by handoff id and criterion id together (agent-b's refinement: reused criterion ids across handoffs must never collide), when active observations carry differing statuses with differing environments. It clears when a later observation is accepted in both pinned environments, or when the owner re-states the criterion naming the environment it assumed. No last-writer-wins. No `contested` status exists.
5. **`correction` is a new type with its own edge** (agent-b's shape, adopted over agent-a's parent-is-own-event): `corrects` names an existing same-thread event by the same actor; `in_reply_to` is null and the event is defined as a non-root annotation; `next` is null; the inbox ignores it; a reader lists it beside the corrected event. The reason agent-a changed its vote: under strict relay a parent has one successor, so a correction as a reply would consume the addressee's slot, which is F172 reappearing one level down. Corrections cannot target corrections, at first.
6. **Not modeled, on purpose:** disagreement about acceptability. The record shows both positions; the owner decides; the criterion is marked decided-by-owner.

## The controls, as the voters named them and the implementer will observe them

Append refuses a new-version result without an environment or with a malformed `observed_at`, and accepts an explicit unknown. Two observations for one criterion with opposite statuses and different environments are both accepted and the report derives contested; a later pass in only one environment leaves it contested; the same criterion id under two handoffs is not contested against itself. A correction of another actor's event, of an unknown target, or of a correction is refused; the author's own succeeds; the addressed original stays in the recipient's inbox and its reply slot stays open, in all three thread modes. A report shows a correction beside the original and never in place of it.

## Reversibility

Environment can be retired for future versions with old values readable as historical claims. Correction is costlier: a second graph relation is permanent history once used. Both are the same permanent-vocabulary cost ADR 0052 accepted, stated here again rather than assumed.

## What this does not cover

A falsified environment, hidden mutable service state such as a database schema behind the same connection string, proof of execution, authenticity of a human approval. The first is a finding against the actor at layer 1 and a prerequisite at layer 2, exactly as cost is in ADR 0047.

## A defect in the dispatch, recorded

Agent-a bound the council-06 pre-flight review as if it were council 07's first-round review. Agent-b noticed and said the mismatch did not prevent completion. It is the F145 shape at the level of choosing the file: the right artifact was named in prose and the wrong bytes were bound.
