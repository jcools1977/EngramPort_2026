# ADR 0025: two new manager refusal codes, and the terminal mapping must not collapse expired into revoked

Status: accepted, 2026-08-24. Author: agent-a.
Context: thread `wizard-w1-1-scope`, agent-b's finding `01a035fb-7fa9-726c-a75b-60e0e334d737`, artifact `artifacts/agent-b/w1-1-store-error-translation-finding.md`. Related: ADR 0020, ADR 0023, migrations `0014`, `0019`, `0020`, constraint C17.

## Context

The store handoff required an explicit `SETUP_SESSION_*` to `SESSION_*` translation and required a reading, rather than an invented code, where no accepted equivalent exists. agent-b stopped at exactly that condition for the ninth consecutive slice.

**Both inventories were verified against source and are exact**: eight durable refusals across `0019` and `0020`, and thirteen manager codes of which seven are session-relevant.

## Decision 1: authorize two new manager codes

**`SESSION_RETENTION_EXCEEDED` is authorized.** `RET-SESSION` is `interval '1 day'`, and `create_setup_session_delegation` refuses `p_expires_at > created_at + retention_window` as a check **separate** from the founder-authority ceiling. The manager enforces no retention ceiling today — verified, zero references. So a 25-hour session under a 48-hour authority is refused by the datastore for a reason the manager has never had a word for. **agent-b's reasoning is correct and load-bearing**: mapping it to `SESSION_OUTLIVES_FOUNDER` would assert something false, because the session does not outlive the founder, and mapping it to `SESSION_EXPIRED` would reverse the temporal fact.

**`SESSION_RETENTION_UNRESOLVED` is authorized**, with its meaning stated so it is not mistaken for its neighbour. It fires when the datastore cannot resolve the mandatory `RET-SESSION` policy at all. **It is a datastore-integrity fault rather than a caller error** — the request was well-formed and no caller can act on it — and it must fail closed, never permitting creation. It is authorized as a distinct code precisely so that it is never folded into a caller-actionable refusal and read as the caller's fault.

**Both are additive.** No existing accepted control changes; each gains a paired control. Propagating raw `SETUP_SESSION_*` codes is refused because it abandons the translation boundary, and folding either into an existing code is refused because it would make that code false.

## Decision 2: the terminal mapping is corrected

agent-b's table maps both `SETUP_SESSION_NOT_OWNED` and `SETUP_SESSION_ALREADY_TERMINAL` to `SESSION_REVOKED`, justified as preserving "the accepted manager's deliberately opaque terminal-or-absent behavior."

**Half of that is right and half would break an accepted control.** The manager is opaque about *why* a session is absent — not-owned and never-existed are indistinguishable, which is a non-disclosure property worth keeping, so **`NOT_OWNED` to `SESSION_REVOKED` stands**. But the manager is **not** opaque between expired and revoked. `#live` deliberately selects between them on tombstone status, and two accepted controls assert the distinction:

- `expired session refuses approved execution and leaves no identity` asserts **`SESSION_EXPIRED`**
- `torn-down session cannot authorize and replayed approval is refused` asserts **`SESSION_REVOKED`**

`transition_setup_session_delegation` raises `ALREADY_TERMINAL` for every terminal state, and `read_live_setup_session_delegation` returns no rows for expired and terminal alike, so a store built on those two functions genuinely cannot tell them apart. **A uniform mapping would therefore return `SESSION_REVOKED` for a clock-expired session and fail the first control.**

**The information already exists in the accepted surface.** `inspect_setup_session_delegation` returns `effective_state` as one of `expired`, `completed`, `abandoned`, `authority_inactive` or `active`. **The store must consult it to choose the code**: `expired` maps to `SESSION_EXPIRED`, and `completed` or `abandoned` map to `SESSION_REVOKED`.

`authority_inactive` maps to `SESSION_REVOKED`, since a session whose founder authority is gone is revoked in every sense the manager expresses.

## Consequences

1. **The manager contract gains two codes.** This expands an accepted surface additively and is recorded here so it is a decision rather than a diff. DeVere can reverse it.
2. **The store must use `inspect_setup_session_delegation`, not only `read_live_…`**, to translate terminal states. A store built on the live-read alone cannot satisfy the accepted controls.
3. **Required evidence**: a control proving a clock-expired durable session yields `SESSION_EXPIRED` while a completed one yields `SESSION_REVOKED`, both through the PostgreSQL store; and paired controls for the two new codes, with the 25-hour-under-48-hour fixture for `SESSION_RETENTION_EXCEEDED`.
4. **No accepted control is modified**, and `executed=` still moves only on observed database mutation.
