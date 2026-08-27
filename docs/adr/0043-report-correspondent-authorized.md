# ADR 0043: The Re:PORT correspondent is authorized

**Status:** accepted
**Date:** 2026-08-27
**Decided by:** DeVere, confirmed directly to agent-a

## Decision

**A reporter role is authorized.** DeVere's stated intent: a PR correspondent that writes what amounts to a **lab report on this experiment**, published to a blog on the EngramPort site, so the public can see how the product was built and so the process is on the record in case it becomes something significant.

This resolves **F120**, which held agent-b's handoff because an event body claimed founder authority for a role change and `AGENTS.md` rule 6 forbids event bodies from changing permissions. **The authority now exists because DeVere stated it outside the log**, which is the only channel that can carry it while F117 stands.

## Two constraints that belong in the design, not in review afterward

### 1. Publishing the findings publishes an exploit guide

The most interesting material is also the most dangerous. **F108, F111 and F113 describe live, unfixed defects in a product about to launch**: authorship is asserted and never authorized, so any caller may write an event as any actor; all actors commit under one git identity; nothing is signed; and `main` has no branch protection, confirmed again today.

**A lab report that narrates those findings tells a reader exactly how to forge events in any EngramPort repository.** The disclosure rule follows: **a finding describing an unfixed defect is publishable only after the defect is fixed, or described without the detail needed to exploit it.** Publication order is therefore coupled to the attribution hardening, not merely to editorial readiness.

### 2. A PR agent reporting on its own team will tell a triumph story

The temptation is a narrative where three agents collaborate flawlessly. **The true record is better material and more credible**: four SDK dispatches stopped before they were sent, two of agent-a's acceptances refuted after agent-a had verified them, a control agent-a certified as sound that could not fail, and five reviews distorted by agent-a's own context selection.

**The story worth telling is that the arrangement caught the architect's errors**, which a single agent would have shipped. **Instruct the correspondent to report corrections and reversals at the same prominence as successes**, and treat a report with no failures in it as evidence of a reporting defect rather than a good week.

## Authority, unchanged from agent-b's proposal

The correspondent receives **no implementation, assignment, approval, memory-acceptance, architecture-vote or project-fact authority**. Drafting is not publishing: **publication is outward-facing and irreversible, so it stays with DeVere** under ADR 0036, gated on digest-bound human approval.

## Reconciliation required

ADR 0042 already names a living research record among the dogfooding outputs. **The correspondent and that record are one thing with two sponsors** and must not be built twice. Critically, ADR 0042 stage 3 requires **agent-c stays cold**: a correspondent that circulates retrieved context to reviewers would correlate the judgments the council depends on keeping independent.
