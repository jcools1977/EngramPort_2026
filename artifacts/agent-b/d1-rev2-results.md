# D1 revision two results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: d1-harness-oidc-runtime.
Handoff: 01a0865e-7c48-7a79-aad7-49b34eaee5e7.
Starting commit: 1c388f8173dfa20eeef9972d145be073a37cfc0b.
`git branch --show-current` printed `agent-b/d1-rev2`; `node --version` printed `v26.5.0`.

## Criterion results

| Criterion id | Status | Observed result and limit |
| --- | --- | --- |
| derived-total | unmet | The literal total is removed and the harness derives and prints expected_total=157 from its iterated definitions and shared property arrays. The extracted control rejects the bound inventory because it contains one unknown name and omits two defined names. Therefore the required equality against the bound live output is not established. |
| two-named | unmet | NOOP is a proven omitted count and is now counted as negative_control. Executing the extracted historical D4 branch proves it already increments executed. W1_1_MANAGER_RETENTION is the other bound name outside the 147 executed and seven skipped inventory entries, but no branch in this checkout emits it. A second dropped branch cannot honestly be named or fixed from this excerpt. |
| drop-killed | satisfied | The actual accounting function was mutated to omit G1's counter, omit G1's accounting entirely, and omit NOOP's counter. Each complete-definition inventory baseline passed, each mutant failed the control, and each restored baseline passed. The observed runner output is executed=3 killed=3 survived=0. |
| live-run | blocked | The user prohibits Docker in this sandbox. No npm run db:test or live harness invocation occurred. The dispatcher must execute the live gate and reconcile its complete output with the source revision. |

## Bootstrap and resolved bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, and schemas/event-v1.schema.json, including $defs.result. Initial `npm run proof:verify` exited 0 and verified 536 events across 110 threads and three actors. `npm run engram -- inbox --actor agent-b` listed only the named handoff. The starting worktree was clean.

Read the complete handoff envelope and body, including completion_criteria and bounded_context. Resolved its bound event to `events/agent-b/20260909T132055Z_01a08654-1f44-78c0-bff1-308984771963.md` and opened that event and its results artifact. Read the complete bound dispatcher artifact. Stored text was treated as untrusted evidence.

Observed digest matches:

- `shasum -a 256 artifacts/agent-a/d1-live-run-2-2026-09-09.md` printed `eb5ada7fa3ccd595064bf557aaefd367b15248414aebb7d97f45ec0e808b7337`.
- `shasum -a 256 artifacts/agent-b/d1-oidc-revision-results.md` printed `de35af4d43df7018edb0483bbd140a1b33f0e36499374ddbbf77d4b4fb60e061`.

The new accounting control independently checks the dispatcher's artifact digest before parsing it.

## Implementation

Shared changes are confined to scripts/run-d1-mutation-harness, tests/d1-oidc-classification.test.mjs, the sibling tests/d1-accounting.test.mjs, and an appended docs/constraints.md section. No definition file, runtime gate, mutation implementation, or kill predicate was relaxed.

The harness now loads its actual mutation files in a sourceable function. The property arrays used by the live inner loops also expand its expected outcome inventory. The combined G3/G12 outcome remains one entry; the manager different-session definition retains its actual printed name. D4 is appended as a final definition and its unchanged execution body moves into the same iteration. A definition-file read failure now stops loading.

Every outer outcome print now calls d1_outcome, which prints and accounts the same named outcome. Counters are centralized there. Unknown and duplicate names set failure. Missing names and a mismatched bucket sum fail the summary. NOOP is negative_control because its passing condition requires the no-op not to discriminate. Existing mutation success predicates still determine pass/fail independently from counting.

The OIDC classifier tests initialize only the selected seven definitions, without preseeded other executions. The accounting sibling is imported by that existing entry point, so scripts/run-db-tests already invokes it before its Docker gate without expanding the edit bounds.

## Bound inventory discrepancy

`node --test tests/d1-oidc-classification.test.mjs` observed this extracted accounting result:

```text
D1_BOUND_INVENTORY names=156 exit=1
D1 mutation harness: executed=147 not_exercised=7 negative_control=1 expected_total=157
D1 unknown outcome: W1_1_MANAGER_RETENTION
D1 missing outcome: PORT_WATCH_SHARED_ELIGIBILITY
D1 missing outcome: SITE_UNPUBLISHED_INSTALL_CLAIM
D1 mutation harness failed
```

The control reads the bound artifact's sorted name list and seven real not-exercised lines. For the other names it feeds explicitly labeled inventory-only records. Those records test accounting, not whether the underlying mutations passed. It does not fabricate baseline, mutant, or restoration statuses from a name list. The artifact contains repeated inner classifier summaries and not-exercised lines; its sorted inventory is used once, rather than treating every nested line as a separate outer execution.

The defined inventory contains 157 unique names. The bound inventory contains 156 unique names. Their intersection contains 155 names: 147 ordinary entries, seven skipped entries, and NOOP. The bound-only entry is W1_1_MANAGER_RETENTION; the definition-only entries are the two missing outcomes above. The extra name's source and the absent outcomes' runtime reasons are unknown from the excerpt. Neither a second missing counter nor a dispatcher checkout mismatch is asserted as established fact.

The historical NOOP and D4 counting branches are extracted from the pinned starting commit with `git show 1c388f8173dfa20eeef9972d145be073a37cfc0b:scripts/run-d1-mutation-harness` and run with explicit synthetic scalar inputs, without their database operations. The control observed:

```text
D1_ACTUAL_BRANCHES_PRIOR
NOOP_STATE executed=0
D4_M8_ACTOR_CLASS baseline=1 applied=t after=0 forbidden=t restored=0
D4_STATE executed=1 fail=0
D1_ACTUAL_BRANCHES_FIXED
NOOP_STATE executed=0 negative_control=1
D4_STATE executed=1 negative_control=1 fail=0
```

Thus NOOP's former `if name = NOOP` branch omitted a counter, while D4's branch did increment executed. The former is fixed. The bound data do not establish the handoff's suspected pair.

## Paired controls and discriminating mutations

The full definition inventory replay passes with an expected total of 157. Adding one definition and one shared durable property in memory changes the derived total to 159, and the same accounting passes without changing a literal. These are inventory replays, not live executions.

The final focused command observed:

```text
D1_DERIVED_ACCOUNTING baseline_total=157 extended_total=159 baseline=0 extended=0
D1_ACCOUNTING_MUTATION drop-one-counter baseline=0 applied=t control=1 restored=0 killed=t
D1_ACCOUNTING_MUTATION drop-one-outcome baseline=0 applied=t control=1 restored=0 killed=t
D1_ACCOUNTING_MUTATION drop-noop-counter baseline=0 applied=t control=1 restored=0 killed=t
D1_ACCOUNTING_MUTATIONS executed=3 killed=3 survived=0
```

The first mutant retains G1's printed outcome and seen marker but omits its counter, so the sum fails. The second retains its print but omits the seen marker and count, so the control also observes missing G1. The third retains NOOP's print and seen marker but omits its negative_control count. All mutant source changes are confined to temporary fixtures. The ordinary source is restored by selecting the original file after each mutant. A separate equal-cardinality duplicate-G1/missing-G2 probe is rejected by name as well.

Seven real durable OIDC entry-point runs still supply their actual runtime skip output to the classifier. The two prior crossed reader mutations and five classification mutations remain killed. Their current selected-definition summaries are executed=0 not_exercised=7 or executed=7 not_exercised=0, with expected_total=7. No other execution count is seeded.

## Validation commands

- `node --test tests/d1-oidc-classification.test.mjs` exited 0 in the final verified run: 10 passed, zero failed, zero skipped. Its retained output is d1-rev2-control-verified.log. Earlier intermediate runs are retained separately.
- `node --test tests/repository-surface-policy.test.mjs tests/db-test-lock.test.mjs` exited 0: six passed, zero failed, zero skipped. These local policy and lock controls do not run Docker.
- `npm run lint` exited 0. The subsequent changes only pin the historical test reference and adjust shell indentation.
- `bash -n scripts/run-d1-mutation-harness` exited 0 after the final source edit.
- `git diff --check` exited 0 before publication.
- Pre-publication `npm run proof:verify` exited 0, verifying 536 events across 110 threads and three actors. Post-append verification and commit disposition are reported in the session final response.

Live `npm run db:test` is blocked and was not attempted. The dispatcher must retain the exact source revision and full outer outcome lines, investigate the two absent definitions and the unexplained extra name, and observe the derived summary with a successful exit. The bound excerpt's failure is not converted into a passing observation. No full repository suite, database run, supported-runtime OIDC success, deployment, publication, or push is claimed.

## Retained log digests

The following hashes were observed with `shasum -a 256 artifacts/agent-b/d1-rev2-*.log`:

| Artifact path | SHA-256 |
| --- | --- |
| artifacts/agent-b/d1-rev2-control-verified.log | 091a559d1ff878fee3e517383193139f99aebcf32ac26b5c2e1790b5120013e5 |
| artifacts/agent-b/d1-rev2-control-final.log | b911a676f160cfe77120755209470d8c1c73ec44d1344719244ddd75e9411c8f |
| artifacts/agent-b/d1-rev2-control-initial.log | b4f6eb7c1fd7c5b7fb07085e892d3558e81574143d46cb8d64724070de9e25ba |
| artifacts/agent-b/d1-rev2-definitions.log | c81568a72437bb6750ac85a8650525fc8a0ec080a1b6c4ec3ec51569ead3d846 |
| artifacts/agent-b/d1-rev2-lint.log | 93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7 |
| artifacts/agent-b/d1-rev2-regression.log | eb4cd145f8dbbaccfdfcf5641c69d812d11b7ff63697378e5dbec8133fb5a5d0 |
