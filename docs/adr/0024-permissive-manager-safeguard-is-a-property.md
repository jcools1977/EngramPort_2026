# ADR 0024: the permissive-manager safeguard is a property with an enumeration, not a count

Status: accepted, 2026-08-24. Author: agent-a.
Supersedes: the mandatory-evidence clause of ADR 0023 only. Every other decision in ADR 0023 stands unchanged.
Context: thread `wizard-w1-1-scope`, agent-b's finding `01a035da-7540-7ac5-8818-38293d75f32d`, artifact `artifacts/agent-b/w1-1-async-negative-count-finding.md` at `dd350171…`.

## Context

ADR 0023 required that both migrated suites be run against a deliberately permissive manager and that **18 refusal controls fail**. agent-b refused to implement against that number and returned a finding: 18 counts source lines containing `assert.throws`, not tests, and the two are not the same unit. **agent-b is right.** The files hold 18 such lines but 20 occurrences; one session test carries two assertions; and three approval refusals exercise `loadSetupPlan` and object immutability without ever calling the manager.

agent-b proposed 19. **That is also wrong, and agent-a verified it by execution rather than by reading.** A worktree copy was patched to neuter every manager refusal — 16 `SetupPlanError` throws and one `planMismatchError`, leaving the four `TypeError` construction guards intact — and both suites were run.

Measured: **7 failures in `session:test` and 14 in `approval:test`, 21 in total.** The approval figure matches agent-b's exactly, and its three named non-manager refusals stayed green exactly as predicted. The session figure does not: agent-b counted 5, because it excluded the two `start` refusals that already use `await assert.rejects` and are therefore not part of the migration. A permissive manager removes those refusals too, and both tests duly fail.

**Both numbers were derived statically, by two different readers, and both were wrong.** That is the point.

## Decision

**The safeguard is a property, and the count is an output rather than an input.**

The requirement is now: with every manager refusal removed and successful values preserved, **every test that asserts a manager refusal must fail, and the three refusals that do not call the manager must stay green.** The evidence is the enumerated list of failing test names, checked against the expected list. A count on its own is not evidence, because a count can be reached from the wrong unit — which has now happened twice.

**Measured expectation, to be reproduced rather than trusted.** 21 failures, 16 passes.

`workspace-session.test.mjs`, 7 expected failures:
1. completion structurally removes identity, delegation, approval, and credential
2. expired session refuses approved execution and leaves no identity
3. torn-down session cannot authorize and replayed approval is refused
4. approval from session A cannot execute under session B
5. scope and expiry ceilings reuse W0 predicates *(already `await assert.rejects`)*
6. non-setup scope and unbounded session are refused *(already `await assert.rejects`)*
7. abandonment leaves no partial authority

`workspace-approval.test.mjs`, 14 expected failures: reordered steps; inserted step; removed step; substituted step; modified parameters; forged but self-consistent plan; one consequential flag change; all consequential flags changed; added dependency; removed dependency; wire dependency order; cross-plan approval; a future wire field; hand-built step list.

**Three refusals that must remain green**, because they never call the manager and mutating them would broaden the variant beyond the migration: `v2 wire is refused with a specific profile error…`; `tampered serialized plan is refused on load…`; `verified plan parameters are deeply immutable`.

**If the reproduced set differs from this list, the difference is the finding** and is returned rather than reconciled by adjusting the variant.

## Consequences

1. **ADR 0023's "18" is withdrawn as unexecutable.** Nothing else in ADR 0023 changes: the async migration, its scope, the exclusion of PostgreSQL from this slice, and the refusal of caches and dual writes all stand.
2. **The two already-async `start` refusals are inside the safeguard even though they are outside the migration.** They cost nothing to include and they widen what the variant can detect.
3. **A specified count is recorded as a defective form of requirement** in this project. Where a safeguard can be enumerated, it is enumerated.
4. `executed=` still does not move; this remains a test-only slice.
