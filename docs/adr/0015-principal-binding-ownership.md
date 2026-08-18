# ADR 0015: D1 begins at a trusted authenticated session principal; D2 owns binding it

Status: accepted, 2026-08-18. Author: agent-a.
Context: thread `wizard-w1-7-design`, D1E tenant derivation review. Related: `docs/design/w1-7-durable-custody.md`, `docs/security/setup-credential-threat-model.md` revision 8 rows 3.16 and C17, constraint C6.

## Context

D1E's tenant mechanism landed and works: tenant and project are derived from `app.principal_id` alone, a caller-supplied tenant is not obeyed, and the derived value is written into transaction-local state so the write policies are satisfied by a database-derived tenant.

That surfaced the question this ADR settles. **PostgreSQL cannot verify `app.principal_id`.** It is a custom session GUC, and the database has no way to know which human or agent authenticated to the application. Probed live:

- `engram_app` can set `app.principal_id` to any principal and see that principal's membership row, but **cannot execute the mint function**, which is `permission denied for function`.
- **`engram_maintenance`, the role that may execute the mint, can set `app.principal_id` to any principal and mint as them.** Verified: it minted for a second principal, storing that principal's tenant and `minted_by_principal_id`.
- The function takes no caller principal parameter, and the grant is looked up **by** the session principal, so neither can disagree with it. There is no second value to cross-check.

So the entire authority chain rests on the truthfulness of `app.principal_id` as set by whoever holds the executing role.

## Options considered

**A.** D1's contract begins with a trusted, already-authenticated session principal. D2 owns binding the external authenticated identity to `app.principal_id` and to the privileged database session.

**B.** D1 requires an additional datastore-verifiable session or delegation record before trusting `app.principal_id`.

## Decision: A

**B does not close the gap it appears to close.** A session or delegation row would have to be written by some role, and `engram_maintenance` already holds `SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` from migration `0001`. The role that can execute the mint can therefore also forge whatever session row the mint would check. B raises the cost of a mistake but does not bind the trusted role, so it moves the same unverifiable assumption one table deeper while presenting as a control. That is the defect pattern this project has repeatedly refused: a check whose name claims more than its assertion proves.

**A matches the canonical position already recorded.** Threat model row 3.16 states the setup-session delegation authority is **Model C, in-memory today**, and gate C17 requires the **durable** form to satisfy constraint C6 before the first durable delegation. The specification already treats session authority as application-held and its durable form as future, gated work. Deciding A is consistent with that rather than a new position.

**A also matches the W1-7 boundary.** W1-7 owns what happens **given** an authenticated principal: tenant and project derived rather than asserted, custody model derived from the canonical inventory, scope contained against held authority, namespaces closed, references minted atomically. Every one of those is now enforced inside PostgreSQL and independently verified. Identity establishment is a different layer, and it is the Node adapter's layer, which is D2.

## Consequences

1. **D1's M2 and M3 are accepted only under an explicitly recorded precondition:** the session principal is trusted and already authenticated. Any evidence citing M2 or M3 must state that precondition; without it the claim overstates what the database proves.
2. **Principal-session binding, and its discrimination, is assigned to D2.** D2 must bind the external authenticated identity to `app.principal_id` and to the privileged database session, and must demonstrate that a caller cannot present a principal it did not authenticate as. Assigning it here means it is owned, not shared ambiguously across two tasks.
3. **A7 and A8 are not closed until D2 proves the binding.** The custody boundary is sound given a truthful principal, and "given a truthful principal" is not yet proven. A7 and A8 stay open through D2, and this is the specific reason.
4. **Two narrow database follow-ups remain in D1**, because they are cheap and reduce blast radius even under A: revoke the default `PUBLIC EXECUTE` on `derive_mint_membership`, and restrict its execution to the roles that need it. It is `SECURITY DEFINER` and currently executable by `engram_app`.
5. Nothing here changes the threat model. Revision 8 stays digest-pinned; this ADR records an ownership decision the specification left implicit, in the same way ADR 0014 recorded the custody representation.
