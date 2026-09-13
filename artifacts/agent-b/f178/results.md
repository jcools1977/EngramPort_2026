# F178 observations

Base: d545a22d25fe6aed4bb1a931302f66a10303267d; branch agent-b/f178, real node_modules copy, macOS arm64.

## Runtime ledger

Every Node/npm command used PATH prefixed with /opt/homebrew/opt/node@22/bin (v22.23.2) unless its artifact command explicitly names /opt/homebrew/bin/node or /opt/homebrew/bin/npm (v26.8.2). Child commands inherit that prefix; the rewritten synthetic child additionally uses process.execPath. Bootstrap proof/inbox, initial-fixed, lint, surface-policy, final proof and append use Node 22.23.2. Shell, Python, Git, rg and GitHub connector calls do not execute Node themselves. The probe and repeat scripts quote every runtime path and command. Ambient NODE_OPTIONS and NODE_TEST_CONTEXT were both unset. Parents create NODE_TEST_CONTEXT=child-v8; the matrix deliberately preserves or deletes it.

## Cause matrix

`python3 artifacts/agent-b/f178/probe.py` runs both Nodes with ambient and clean environments, direct and node:test-parent spawn contexts, default and explicit process/none isolation. `probe-experimental.py` repeats using the spelling accepted by Node 22. Full commands, child arguments and output are quoted in probe.log and probe-experimental.log. `bash artifacts/agent-b/f178/env-i.sh` separately quotes literal env -i PATH=... commands in env-i.log; env-i-parent.sh and env-i-parent.log cover nested spawn with the same literal command. Python's clean-env matrix supplies only PATH, equivalent to that shell command; parent-only CHILD_ARGS and STRIP_CONTEXT select the controlled experiment.

- Node 22.23.2 default/process isolation, direct or parent with context removed: file timeout at 100 ms, no canary subtest. Clean environment does not change it.
- Node 22.23.2 --experimental-test-isolation=none, direct or parent with context removed: `ok 1 - canary budget override`, `not ok 2 - ordinary default budget`.
- Node 22 rejects --test-isolation=process and none as bad options; those refusals are not timeout results.
- Node 26.8.2 direct or parent with context removed: expected subtests in default/process/none isolation, ambient and clean environments.
- Both Nodes with inherited NODE_TEST_CONTEXT: child exits 0 with `Warning: node:test run() is being called recursively within a test file. skipping running files.` No subtests execute. This is a third shape, not a file timeout and not a passing control.

The exact handoff claim that Node 26's existing run() (which already deletes NODE_TEST_CONTEXT) still times out the file was not reproduced by this matrix. No historical patch-change attribution is established by testing two different major versions today.

CI run 34598579655 / job 103260079303 was fetched using the authenticated GitHub connector after gh failed to connect to api.github.com. setup-node resolved 22.23.2: `2026-09-11T12:22:33.6240155Z node: v22.23.2`. CI checkout was 480da7e704b4556e298ada98d6ab6d44a53c6ee7 on Ubuntu 24.04.5 x64. ci-commands.log quotes executed command headings: the job did not execute d1:controls:test, and the full log has no D1_CANARY_BUDGET line. Its success does not prove this control passed.

## Change and paired evidence

Only tests/d1-baseline-timeout.test.mjs and docs/constraints.md are changed shared surfaces. The wizard source is read-only. The assertion reads run_w1_7's default from the harness, requires a larger numeric canary declaration, and checks application to the named canary test. A synthetic 40 ms per-test timeout has no CLI file deadline and a passing following sibling. Three copied-source mutations independently remove the option, remove the declaration, or lower it to the default; the same assertion refuses each and passes restored bytes.

The first implementation attempt incorrectly expected Node 22 to count a timeout as `# fail 1`; initial-fixed.log shows it counts `# cancelled 1` instead. The final assertion names the failing subtest, timeout diagnostic, passing sibling and total tests without relying on that summary classification.

Ten direct runs per Node passed: each reports 5 pass, 0 fail, 0 skipped and all three mutation kills. All summary lines are quoted in repeat-summary.log and 26-direct-summary.log, with full per-run logs. The first completed Node 22 npm run reports 24 pass, 0 fail, 1 skipped (25 tests); its 96.8-second duration explains why the initial full-suite capture timed out after 90 seconds; it is not counted. repeat-npm.py uses a 600-second limit and writes output as produced. After two completed Node 22 runs, its third run was intentionally interrupted to move the remaining independent repetitions to repeat-npm-parallel.py (four concurrent commands). The interrupted log is retained and excluded. The suite skip names an existing crossed runtime control requiring actual Node 26.5.0, not the changed canary control.

Node 22 lint and repository surface policy passed (four tests). Git diff --check passed. Bootstrap proof verified 630 events.

## Commit boundary

`git add tests/d1-baseline-timeout.test.mjs docs/constraints.md` refused with:

```
fatal: Unable to create '/Users/an2b/an2b/products/EngramPORT/.git/worktrees/EngramPORT-f178/index.lock': Operation not permitted
```

The linked Git metadata is outside writable roots. Approval is unavailable in this session. No commit or push can be claimed; continuation must stage the bounded files and agent-b evidence/event and run `scripts/agent-commit agent-b -m "Fix F178 canary budget control"` in an environment that permits that Git metadata write. Do not commit under the inherited human identity.

## Final repeated-run result

All 40 required completed runs passed: ten direct and ten `npm run d1:controls:test` on each Node. Each direct run has 5 passed, 0 failed, 0 skipped; each npm run has 24 passed, 0 failed, 1 skipped. `all-run-summaries.log` quotes every command, runtime, summary line and three mutation outcomes in the original TAP (Node 22) or spec (Node 26) format. The collector asserted all 40 exit codes, pass/fail totals and all 120 mutation kill/restoration records. The 90-second aborted attempt and intentionally interrupted repetition are excluded.
