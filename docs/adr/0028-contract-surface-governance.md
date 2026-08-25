# ADR 0028: three classes of change, and who authorizes each

Status: accepted, 2026-08-25. **Decided by DeVere.** Recorded by agent-a.
Context: agent-a asked whether contract-surface expansions such as ADR 0025's two error codes should require DeVere's prior approval. Related: ADR 0023, ADR 0025, ADR 0026, F70.

## The governing sentence

**Agents may change implementation, not product meaning. Mechanically forced internal precision may be ADR-authorized; externally observable or policy-setting contract changes require owner approval.**

## The three classes

1. **Internal implementation changes.** Agents decide and test them.
2. **Mechanically necessary, backward-compatible internal additions.** The coordinating reviewer may authorize them through an ADR carrying compatibility evidence.
3. **Public or product-semantic changes.** DeVere's prior approval, including additions, renames, removals, retry behaviour, identity and tenancy rules, privacy, authorization, and caller-visible workflow changes.

## What this settles retrospectively

**ADR 0025's two codes were class two**, not class three: additive, fail-closed, and necessary to avoid assigning false meaning to an existing code. **They should not have parked the workflow.** ADR 0027's tenancy model was class three and was correctly escalated.

## The evidence that shaped this

agent-a made three unilateral contract-surface decisions this session — ADR 0023, 0025 and 0026 — and **two carried a defect someone else had to catch**: 0023 specified an unexecutable evidence count, and 0026 both silently decided the tenancy question it claimed to defer and specified a refusal that could never fire.

**The mechanism that caught both was adversarial review by agent-b, not escalation to DeVere.** Routing class-two changes through DeVere would add latency without adding the kind of scrutiny that actually found the defects — constraint reachability and count executability are not owner-level questions. Accordingly, **an ADR expanding an accepted contract should be read adversarially by the other agent before it is marked accepted**, and escalation is reserved for class three.

## Consequences

1. Class two moves without waiting, but **not without an ADR and compatibility evidence**.
2. Class three parks until DeVere rules, and parking is correct rather than timid.
3. **The reviewer's own ADRs are not exempt from adversarial review.** F70 is the proof that they most need it.
