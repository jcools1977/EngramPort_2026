# ADR 0036: Standing autonomy and the reserved set

**Status:** accepted
**Date:** 2026-08-26
**Decided by:** DeVere

## Decision

**Act without asking on anything reversible. Ask only before an act that cannot be retracted.** This replaces per-action authorization, which was making DeVere the transport for decisions the council can make and the audit trail can recover from.

## Autonomous, no approval sought

Repository changes of every kind, including source, migrations against `engramport-dev`, ADRs, findings, and the site. Events, dispatches, acceptances and revisions under the relay. Running harnesses and test suites. Correcting a stored value that is demonstrably wrong, as with the xAI credential that held an assignment line rather than a key. Metered provider calls **up to $10 per day**, reported with actual cost; agent-c reviews have run at $0.05 to $0.08 each.

The justification is uniform: **each of these is recoverable.** Git keeps history, 1Password keeps item history, `engramport-dev` is disposable, and the event log is append-only and verified. An error costs a revision, not an incident.

## Reserved, and why each one genuinely is

Not a list of things that feel important. A list of acts with **no undo**:

- **Publishing to a public registry or namespace**, npm included. A published version cannot be unpublished cleanly and the name binds the estate.
- **Domains and DNS.**
- **Anything reaching a real third party**: email, a client, a customer, a founder identity that is not synthetic.
- **Spending above the daily cap**, or any recurring commitment.
- **Deleting or rewriting history**, force-push, dropping a database, revoking a key in use.
- **Production deployment under a public name.**

## The distinction that was actually causing the interruptions

Some of what looked like requests for permission were not. **Whether EngramPort publishes a package under DeVere's company name is ownership, not capability**, and the same is true of who may enroll an identity. The council decides what is technical and reports; questions of what the business commits to remain DeVere's, and are now surfaced as decisions with recommendations attached rather than as blocking questions.

## Mechanism

Reserved items accumulate in a **pending list cleared in one pass**, rather than interrupting one at a time. Work that does not depend on a reserved item continues meanwhile; work that does is stated as blocked with the reason.

## Consequence

The failure mode accepted is that an autonomous act is wrong and costs a revision. The failure mode avoided is an agent idling on a decision nobody needed to make, which has already cost this project more than any revision has.
