# ADR 0014: The durable custody contract is stated as a design delta, not as a threat-model revision

Status: accepted, 2026-08-18. Author: agent-a.
Context: thread `wizard-w1-7`. Related: `docs/design/w1-7-durable-custody.md`, `docs/security/setup-credential-threat-model.md` revision 8.

## Context

agent-b claimed the substantive W1-7 handoff and reported that it could not be implemented as written: custody is `Map`-backed, authorization is an injected literal, no durable PostgreSQL custody schema exists, no canonical transaction or service boundary exists, and the canary is self-observing.

Reconciliation confirmed the finding. Threat model §5 and §5A define the mint contract **behaviourally**, and `migrations/0001_canonical_core.sql` establishes the role, forced-RLS and `SECURITY DEFINER` **patterns**. Neither defines a custody table, a reference table, column types, unique constraints, role privileges, an RLS policy, a transaction boundary, or a service interface. A `grep` for custody DDL across `migrations/`, `docs/` and the engineering specification returns nothing. Separately, the inventory assigns **Model A**, **Model B** and **Model C** to sixteen credential classes and no document says what those models mean, though A7 requires the custody model to be declared per row.

So the contract is genuinely missing, and W1-7 was dispatched against a specification an implementer could not follow without inventing the representation.

## Decision

**State the durable custody contract in a design document bound to revision 8, and do not revise revision 8 to carry it.**

The design specifies representation, ownership derivation, closed namespaces, allowed metadata, the trusted authorization source, database-clock expiry and revocation, the atomic transaction, rollback and loser-residue requirements, uniqueness and concurrency, role privileges, forced RLS and `SECURITY DEFINER` boundaries, `PUBLIC EXECUTE` revocation, the Vault key-locator relationship, retention timestamps for all six policies, audit fields that survive teardown, the Node interface, and the exact W1-7/W1-8 boundary.

## Why not revise the threat model

Revision 8 is **digest-pinned** at `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089`, and `assertW3DispatchEligible` binds every Tier A evidence entry to that exact revision and digest. A revision that adds or restates a control invalidates a prior all-clear, which is the gate working as designed.

W1-5, W1-6 and W1-6a were accepted with evidence bound to `629ae3f2…`. Revising the document to fold in a representation that changes **no control's meaning** would invalidate three accepted bindings and re-open settled evidence, in exchange for nothing behavioural. **Correcting a pinned document is more expensive than annotating it.** The same reasoning already governs F18's stale ownership rows, which stay open on these terms rather than being quietly edited in.

## Consequences

- The design is binding on W1-7 implementation and is cited by the handoff, so "implement the design" is unambiguous.
- Revision 8 keeps its digest; accepted Tier A evidence stays valid; the dispatch gate still fails closed on A6, A7 and A8.
- The delta, this ADR, the design, and F18's two stale rows fold into the next threat-model revision that changes a contract for another reason. Until then the design is authoritative on representation and revision 8 is authoritative on behaviour, and they do not conflict, because the design adds no control.
- **No control is closed by this ADR.** A7, A8 and B5 stay open, B1–B4 stay with W3, A6 and B9 stay with W1-8.
