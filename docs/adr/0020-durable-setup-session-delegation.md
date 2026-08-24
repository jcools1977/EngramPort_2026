# ADR 0020: C17's durable form is a new setup-session relation, not a change to `actor_delegations` or `agent_sessions`

Status: accepted, 2026-08-24. Author: agent-a.
Context: thread `wizard-w1-1-scope`, agent-b's W1-1 assessment `01a03535-c8d8-73d9-ab42-5a3476c73fb4`. Related: threat model row 3.16 and gate C17, constraint C6, §3.0's `RET-SESSION`, ADR 0015, ADR 0017, ADR 0019.

## Context

W1-1's assessment found criteria 2, 3 and 5 satisfied for the accepted in-memory boundary, and criteria 1 and 4 partial: the missing halves are the **external authentication fact** and the **durable delegation**. C17 requires the durable form before the first durable delegation, and threat-model row 3.16 records the setup-session delegation authority as **Model C, in memory today** — which the assessment confirms is still accurate.

The assessment asked agent-a to settle a schema fork. Both of its candidate reuses were checked against the live schema:

- **`actor_delegations`** is `PRIMARY KEY (actor_id, principal_id)`. **That key is load-bearing**: D4's accepted mint boundary refuses unless a live delegation binds the resolved actor to the bound principal with the exact scope. Adding a session key would change the uniqueness that check relies on, which is a change to an accepted control.
- **`agent_sessions.actor_id` is `NOT NULL REFERENCES actors(id)`.** Reusing it forces **an actor per setup session**, which collides directly with criterion 2 — "no standing wizard principal or actor exists in any code path" — and makes teardown harder to prove, which is the very property W1-1 must establish.

## Decision

**Add one forward-only relation for the durable setup session and its delegation. Do not modify `actor_delegations`. Do not reuse `agent_sessions`.**

The relation carries what C17 needs and nothing more: a session identifier as its key, the **founder principal**, the granted **`setup:`-prefixed scopes**, an **absolute expiry**, a **terminal state** with its timestamp, and creation time. It requires no actor row, so criterion 2 survives by construction rather than by cleanup discipline.

**The creation boundary follows the shape this project has now established four times** — `mint_custody_reference`, `create_invocation_grant`, and the D2/D4 session binding:

1. The founder principal is **derived from the bound session principal**, never accepted as a parameter. A caller-asserted founder id is ignored.
2. **W1-5's `resolve_founder_authority` is read inside the creating transaction**, and authority is derived from it rather than supplied.
3. **Three ceilings are enforced before insert, each with its own named refusal**: requested scopes contained by the resolved authority; requested expiry not outliving that authority; and requested expiry within **`RET-SESSION`'s 24-hour ceiling**, evaluated against `clock_timestamp()`. Do not fold them into one code.
4. **Scopes are `setup:`-prefixed only.** A non-setup scope is refused, not narrowed.
5. Every authorization and introspection read requires a **live** session and **unexpired** authority evaluated against the **database clock**, per constraint C6.
6. `SECURITY DEFINER`, pinned `search_path`, forced RLS, PUBLIC and `engram_app` denial, least privilege — on the `0016` and `0018` pattern.

## Consequences

1. **This closes C17's durable half and the durable halves of criteria 1 and 4.** It does not close criterion 1 outright, because the external authentication fact remains an interface precondition.
2. **It does not remove the trusted-session caveat from A6, A7 or A8.** Those closures describe what each boundary does **given a trusted session**. Establishing that the session is trustworthy requires the real identity-provider proof, which needs **DeVere's authorisation** and is out of scope here. Nothing in this ADR may be cited as having discharged that caveat.
3. **The OIDC adapter is not dispatched.** Its verification logic is synthetically testable, but the configured issuer, client, redirect, account mapping and exchange are not, and the assessment is right that this is a boundary finding rather than an implementation failure.
4. **`actor_delegations` and `agent_sessions` are untouched**, so D4's accepted mint check and every accepted W1-7 and W1-8 control keep their meaning.
5. **W1-6's registry marker stays as written.** agent-b's reasoning is accepted: "NARROWED AND CLOSED for its Node boundary" is terminal for what W1-6 closed, and `COMPLETE AND ACCEPTED` would erase the split that re-homed A6 and B9 to W1-8.
6. Revision 8 is not edited. It stays digest-pinned, as with ADR 0014 through 0019, and row 3.16's "Model C, in memory today" becomes stale once this lands — **carried under F18, not corrected**.
