# ADR 0019: A6's gate is W3 start, not W3 completion; B9 stays Tier B and does not close

Status: accepted, 2026-08-24. Author: agent-a.
Context: thread `wizard-w1-8`, the G1–G14 evidence and the G3/G12 accounting revision. Related: `docs/security/setup-credential-threat-model.md` §6 and the evidence registry, ADR 0012, F18, the W1-7 closure record.

## Context

A6's and B9's evidence is complete: the `create_invocation_grant` boundary supplies A6's grant-write half, and §6's fourteen comparisons — whose table is headed *"Controls for A6 and B9, each with a paired positive"* — supply the invocation half, each observed live with a paired positive and defended by thirteen discriminating mutations.

The evidence registry's rows read:

```
| Grant resolution at invocation | 6.1, 6.2 | W1-6 | B9      | W3 completion | [TEST-GATED] |
| Invocation comparisons, G1–G14 | 6       | W1-6 | A6, B9  | W3 completion | [TEST-GATED] |
```

Taken literally, A6 could not close until W3 completes. **That is circular and unusable**: `assertW3DispatchEligible` refuses to dispatch W3-1 unless the registry records **A6 passed**, so an A6 gated on W3 completion would keep the gate shut forever.

## Decision

**A6's gate is read as "W3 start", and A6 closes on the evidence now recorded.**

Three reasons, in order of weight:

1. **The literal reading is circular.** The mechanical gate requires A6 before W3-1 may be dispatched at all. A gate that can never open is not a gate.
2. **Every other Tier A row says "W3 start".** `| Minted references | 5 | W1-7 | A7 | W3 start |` and `| Custody mint contract, M1–M13 | 5A | W1-7 | A8 | W3 start |`. Tier A evidence exists **before** W3 begins; that is what Tier A is for.
3. **The row already carries a known-stale field.** Its owner column reads **W1-6**, though A6 was re-homed to W1-8 on 2026-08-17 — the staleness F18 carries. The row serves two controls of **different tiers with different timings**, and its single gate column reflects the Tier B one.

**B9 does not close.** It is Tier B, its gate is "W3 completion", and it sits in the same family as B1–B4, which W1-7 explicitly **built but did not close** because Tier B is asserted against real material in W3-1. W1-8 builds B9's evidence; W3-1 asserts it.

**Revision 8 is not edited.** It is digest-pinned and the dispatch gate binds every Tier A claim to that exact digest, so correcting the row's owner or gate column would invalidate accepted bindings for no behavioural gain. **The staleness is carried under F18**, exactly as W1-7 carried A6's stale owner.

## Consequences

1. **A6 closes. Tier A completes**: A1 through A9 all closed.
2. **`assertW3DispatchEligible` now reports eligible** with all nine recorded passed at revision 8 and digest `629ae3f2…`, verified mechanically rather than asserted.
3. **Eligibility is not authorisation.** W3-1 is the first work against a **real** credential and a real GitHub App, which crosses the standing synthetic-only constraint that has governed every task to date. **agent-a does not dispatch W3.** That decision belongs to DeVere, and this ADR records the gate opening, not a recommendation to walk through it.
4. **B9, B1, B2, B3 and B4 remain built-not-closed** with W3-1.
5. **A6's closure carries the same precondition as A7 and A8**: it describes what the boundary does **given a trusted session**, since `app.principal_id` is a GUC PostgreSQL cannot verify. ADR 0015 is unchanged.
6. If W3-1 later shows that the invocation comparisons behave differently against a real credential, that is a finding against this ADR and A6 reopens. Recording the reading is what makes that check possible.
