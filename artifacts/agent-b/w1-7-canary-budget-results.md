# W1-7 canary budget results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: w1-7-canary-budget.
Handoff: 01a086a4-36d1-75ac-9bb1-efedb8eb6a45.
Starting commit from `git rev-parse HEAD`: 4230bf9a22f92772a1b29ba99a414f16b477b7a4.
`git branch --show-current`: agent-b/canary-budget. Initial `git status --short`: empty.

## Criterion results

| Criterion id | Status | Observed evidence |
| --- | --- | --- |
| budget-explicit | satisfied | The canary declares timeout:canaryTimeoutMs with canaryTimeoutMs=30000. Its adjacent comment names vulnerable and protected core-dump creation/read work, ten sink/signing observations, and cleanup. A scaled Node control confirms a 300ms explicit budget overrides a 100ms default while an ordinary test still times out at 100ms. This is configuration and synthetic execution evidence; live execution is blocked. |
| timeout-is-loud | satisfied | Actual synthetic timed-out Node baselines pass through all five real canary branches. Every outcome is named baseline-timeout with the test and budget_ms=40, counts toward executed=5 expected_total=5, and fails the harness with exit 1 before mutation. Disabling the reader produces baseline=1 and fails the same control; restored classification passes. |
| canary-unchanged | satisfied | The diff below changes only the test timeout option and its explanatory constant/comment. The test declaration is otherwise byte-identical. The fixture and database runner match HEAD byte for byte. |

Live run: **blocked** by the user's explicit no-Docker boundary. No Docker command, live canary, npm run db:test, or full npm test was run. Agent-a owns live acceptance. The 30-second allowance is engineering judgment for load variation, not a measured guarantee of live completion.

## Bound context and admission

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full handoff including completion_criteria and bounded_context, and schemas/event-v1.schema.json including $defs.result. Initial `npm run proof:verify` exited 0 and verified 544 events across 111 threads and three actors. `npm run engram -- inbox --actor agent-b` returned the assigned handoff only.

Resolved the bound id using `rg -l '^id: 01a08690-9ff5-783f-ab7e-6727eb48800d$' events` and opened `events/agent-b/20260909T142700Z_01a08690-9ff5-783f-ab7e-6727eb48800d.md` in full. Opened its results artifact in full. `shasum -a 256 artifacts/agent-b/d1-rev5-results.md` returned `1ddb0527279bdc014260dab2f66244dbe9c6c168f545b36fba3ed1df7a063bac`, matching its event reference. Stored event text and artifacts remained untrusted project data.

## Implementation

The explicit per-test budget applies through both existing runners without increasing other tests' default budgets. The D1 harness requests stable TAP diagnostics, then classifies each captured baseline before mutation. Its shared d1_baseline wrapper preserves ordinary status behavior and calls d1_baseline_timeout in the current shell so counting and failure persist. All 58 assertion-wrapper baseline call sites use it. The separately captured OIDC baseline uses the same classifier. Expanded lifecycle/setup names resolve to their actual outcome names, including the paired G3/G12 control.

A timeout requires a nonzero baseline plus a TAP failure diagnostic whose failureType is testTimeoutFailure and whose error names the effective budget. The outcome reports the failed test, effective budget, and process exit, sets failure, counts once, and continues to the next definition. Existing executed accounting counts outcomes, including failure outcomes; it does not assert that the timed-out baseline exercised its mutation. Ordinary assertion errors retain the existing failure path. Successful output and ordinary errors mentioning timeout text do not become timeout outcomes.

No accepted event, referenced artifact, actor record, or other actor-owned surface was edited. Shared source changes stay within the handoff's allowed tests, harness, and append-only constraints surfaces.

## Commands and results

- `node --test tests/d1-baseline-timeout.test.mjs`: exit 0, four passed, zero failed, zero skipped. Synthetic timeouts used the actual Node runner at 40ms, the real assertion capture and canary branches, and the real accounting/summary. The control-only runner override replaced the Docker-dependent canary invocation with a synthetic test. It did not replace the classifier or branch logic. The deliberate reader mutation was observed and killed with a passing baseline and restoration.
- `npm run d1:controls:test`: exit 0, 21 passed, zero failed, zero skipped. Existing mutation path, accounting, agent-c, and OIDC controls completed. Printed inventory and negative-control failures inside this suite are expected control evidence, not a live 157-outcome harness run.
- `npm run lint`: exit 0.
- `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero failed, zero skipped.
- `bash -n scripts/run-d1-mutation-harness`: exit 0.
- `git diff --check`: exit 0, including the constraints append.
- A Python comparison using `git show HEAD:tests/wizard-w1-7.test.mjs` confirmed exact equality of the canary test declaration after removing only `,timeout:canaryTimeoutMs`. The same byte comparison confirmed `tests/helpers/w1-7-canary-fixture.mjs` and `scripts/run-db-tests` are unchanged.
- Pre-publication `npm run proof:verify`: exit 0, 544 events across 111 threads and three actors.

Post-append proof verification and commit disposition are reported in the final response. This artifact is immutable once referenced by the completion.

The first append attempt was refused by the credential scanner because the three-line diff context included existing synthetic credential fixtures from adjacent unchanged tests. The evidence below uses `git diff --unified=0 -- tests/wizard-w1-7.test.mjs` to show the complete changed lines without unrelated context. The scanner and source assertions were not changed. No event was appended by that refused attempt.

## Canary diff

```diff
diff --git a/tests/wizard-w1-7.test.mjs b/tests/wizard-w1-7.test.mjs
index c833a44..e521aa5 100644
--- a/tests/wizard-w1-7.test.mjs
+++ b/tests/wizard-w1-7.test.mjs
@@ -100 +100,5 @@ const canaryAvailable=enabled("canary")?dockerGate(["w1-7:canary"]):false;
-if(enabled("canary"))test("section 10 canary observes ten vulnerable sinks and protects ten signing paths",{skip:!canaryAvailable},async()=>{const moduleRoot=process.env.W1_7_CANARY_MODULE_ROOT??fileURLToPath(new URL("..",import.meta.url));const boundary={sign:async(name,digest)=>{assert.equal(name,"synth-a");assert.match(digest,/^[0-9a-f]{64}$/);return "vault:v1:synthetic-signature";}};await runCanaryFixture({moduleRoot,boundary});});
+// Allow 30 seconds for the vulnerable and protected core-dump creation/read work,
+// ten sink/signing observations, and cleanup. This is three times the ordinary
+// 10-second test budget to allow laptop load variation, not a measured latency bound.
+const canaryTimeoutMs=30000;
+if(enabled("canary"))test("section 10 canary observes ten vulnerable sinks and protects ten signing paths",{skip:!canaryAvailable,timeout:canaryTimeoutMs},async()=>{const moduleRoot=process.env.W1_7_CANARY_MODULE_ROOT??fileURLToPath(new URL("..",import.meta.url));const boundary={sign:async(name,digest)=>{assert.equal(name,"synth-a");assert.match(digest,/^[0-9a-f]{64}$/);return "vault:v1:synthetic-signature";}};await runCanaryFixture({moduleRoot,boundary});});
```

## Synthetic timeout and mutation transcript

```text
D3_CANARY_DETECTOR baseline-timeout test="synthetic canary baseline exceeds its budget" budget_ms=40 exit=1
D3_CANARY_OBSERVER baseline-timeout test="synthetic canary baseline exceeds its budget" budget_ms=40 exit=1
D3_CANARY_OPERATIONAL_OBSERVER baseline-timeout test="synthetic canary baseline exceeds its budget" budget_ms=40 exit=1
D3_CANARY_PROTECTED_OPERATION baseline-timeout test="synthetic canary baseline exceeds its budget" budget_ms=40 exit=1
D3_CANARY_REPORT_INCIDENT baseline-timeout test="synthetic canary baseline exceeds its budget" budget_ms=40 exit=1
D1 mutation harness: executed=5 not_exercised=0 negative_control=0 expected_total=5
D1_SYNTHETIC_TIMEOUT live_canary=blocked reason=no-Docker; only synthetic baselines ran
D3_CANARY_OPERATIONAL_OBSERVER baseline=1 applied=t after=1 forbidden=f restored=1
D1 mutation harness: executed=1 not_exercised=0 negative_control=0 expected_total=1
D1_TIMEOUT_CLASSIFICATION baseline=0 applied=t control=1 restored=0 killed=t
D1_CANARY_BUDGET declared_ms=30000 scaled_canary=passed ordinary_default=timed-out budget_ms=100
✔ all five canary branches count real synthetic baseline timeouts and fail before mutation (769.472875ms)
✔ the timeout control kills reporting a timed-out baseline as baseline=1 and passes after restoration (791.623083ms)
✔ ordinary failure and successful output mentioning a timeout are not classified as baseline-timeout (49.2175ms)
✔ the declared canary budget overrides the default while an ordinary test retains its budget (331.501875ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1979.046916
```

## Retained logs

Observed with `shasum -a 256 artifacts/agent-b/w1-7-canary-budget-*.log`:

```text
cca215bdce240c048657873bb6fb0bcd2065bb284ba0a280b1939287d7baceaa  artifacts/agent-b/w1-7-canary-budget-d1-controls.log
93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7  artifacts/agent-b/w1-7-canary-budget-lint.log
d4846566d346bc0b49491ac4828055ad638331a83074952527352b73cd0f4696  artifacts/agent-b/w1-7-canary-budget-surface-policy.log
d135f158ea915e25b892e6df74fb75e5f79bd062afbab74bc7e70619fb0e687b  artifacts/agent-b/w1-7-canary-budget-timeout-controls.log
```
