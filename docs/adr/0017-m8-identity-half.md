# ADR 0017: M8's identity half is assigned to the session-binding layer; A8 stays open on it

Status: accepted, 2026-08-22. Author: agent-a.
Context: thread `wizard-w1-7-design`. Related: `docs/security/setup-credential-threat-model.md` §5A control M8, `docs/design/w1-7-durable-custody.md` §4, ADR 0015, ADR 0016.

## Context

§5A's M8 reads *"Wrong namespace for the minting identity, **for example an agent minting `credential`**"*, and §4 restates the rule: *"Never permitted: providers, plans, callers, agents, runners, the general application identity."*

The A7/A8 mapping recorded M8 as discriminating on the strength of namespace closure — `shape` and `installation` refused, defended by mutation `G4`. **That covers the namespace half only.** Verified live: `actors` carries `kind` and `trust`, `mint_custody_reference` references neither, the string `actors` appears zero times in migration `0011`, `minted_by_actor_id` is declared but **never written by the mint**, and a second principal holding only a founder authority and the class scope minted `credential` successfully.

## Decision

**M8's identity half is not satisfiable at the custody boundary today, and it is assigned to the layer that owns session identity binding** — the same layer ADR 0015 assigned principal binding to, and ADR 0016 assigned project context to.

The reason is structural, not a preference. The mint receives a principal and nothing else. **No actor is bound to the session**, so the boundary has no fact by which to tell the custody service from an agent. Adding an actor-trust check to the mint would require inventing an actor context inside a function that is not given one, which is the same error ADR 0015 refused when it declined to have PostgreSQL verify `app.principal_id`.

**What is evidenced today is named precisely, so it is not mistaken for the whole control:**

- `engram_app` holds no `EXECUTE` on `mint_custody_reference`, verified live from the catalog and by attempted execution. That bounds **the general application identity**.
- D2's `SESSION_ROLE_INVALID` refuses any checkout that is not `engram_maintenance`, defended by mutation. That bounds **the database role**.
- Providers, plans and callers never reach the database at all.

**What is not evidenced is the actor dimension**: an agent or runner backed by a principal that holds a founder authority and the class scope can mint `credential`, and nothing at this boundary refuses it. Today the only thing standing in the way is that no such authority is issued, which is **configuration, not an enforced control**.

## Consequences

1. **A8 does not close.** M8's identity half is an open gap with a named owner, not a structural justification. It is materially different from M6, whose precondition cannot arise, and from M11 and M12, which are bounded by PostgreSQL's implicit abort. A deferral is not a bound.
2. **A7 does not close either**, on the reasoning already recorded: it shares A8's durable boundary, and closing it alone would state a stronger position than the evidence supports.
3. **The closing condition is explicit.** A8 closes when the session-binding layer binds an actor alongside the principal, the mint refuses a non-custody actor kind or trust class, `minted_by_actor_id` is written and checked rather than left null, and a mutation removing that check makes an agent-backed mint succeed observably.
4. **Do not implement this inside D3.** D3 owns the durable custody boundary; session identity is D2's layer and its successor. Implementing an actor check without an actor context would produce a control whose name claims more than its body tests.
5. Nothing here changes the threat model. Revision 8 stays digest-pinned, as with ADR 0014, 0015 and 0016.
