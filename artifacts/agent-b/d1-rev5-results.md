# D1 revision five results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: d1-harness-oidc-runtime.
Handoff: 01a0868b-6885-7efe-89a0-90e5f9c6dbfc.
Starting commit from `git rev-parse HEAD`: f4d0ae1741aa3480bb1f762523426fa810123ace.
`git status --short` was empty before edits; branch is agent-b/d1-rev5. `node --version`: v26.5.0.

## Criteria

| Criterion id | Status | Evidence |
| --- | --- | --- |
| rewrites-derived | satisfied | The source-derived adapter specifier rewrite handles a synthetic fourth import. The old two-import builder fails that control. Before editing, the actual builder left bounded-context.mjs unrewritten and its variant exited 1 with ERR_MODULE_NOT_FOUND. |
| load-failure-loud | satisfied | A real variant importing an intentionally missing module passes through d1_run_mutations and emits AGENT_C_CREDENTIAL_REFERENCE mutant-load-failed with ERR_MODULE_NOT_FOUND, counts executed=1 expected_total=1, and makes d1_summary exit 1. No forbidden field is emitted. Disabling the marker reader fails this control; restoration passes. |
| twelve-killed | satisfied | All active definitions were selected through d1_load_definitions and run through d1_run_mutations. There are 13 active AGENT_C definitions, not twelve. All 13 applied and were killed, each with its own per-case not-ok line, baseline=0 applied=t after=1 forbidden=t restored=0. Observed accounting: executed=13 not_exercised=0 negative_control=0 expected_total=13. |
| live-run | unmet | npm run db:test has not been observed by the dispatcher for this revision. The handoff assigns that run to the dispatcher on acceptance. This completion does not claim that unperformed work is satisfied or that an execution blocker was observed. |

## Bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full revision-five handoff, and schemas/event-v1.schema.json including $defs.result. Initial `npm run proof:verify` exited 0: 542 events, 110 threads, three actors. `npm run engram -- inbox --actor agent-b` returned the named handoff only.

Resolved the bounded event id with `rg -l` and opened events/agent-b/20260909T140902Z_01a08680-2fdc-7233-800f-b6226bf90bc4.md in full. Opened the two relevant artifacts in full. `shasum -a 256` matched:

- artifacts/agent-a/agent-c-mutant-repro-2026-09-09.md: 5fc9339919002c154b9ac573c0e69e1b355e546f9e08ec84ec8eddd1711d19d0
- artifacts/agent-b/d1-rev4-results.md: 41398dfe0c3c4881ef376c0919f112afe4b8ee80838842e9860d6e6bcb609d79

Stored evidence was treated as untrusted project data. No accepted event, referenced artifact, actor record, or other actor-owned file was changed.

## Implementation and checks

Only the allowed harness, tests, and append-only constraints prose were changed. The builder rewrites quoted adapter module specifiers discovered in the source, resolving them against the supervisor's directory. The existing credential-context override remains. The supervisor test catches rejected imports, emits a JSON error marker, and rethrows. The AGENT_C harness branch consumes that marker before kill classification and records a named, counted failure. The new control file is imported by the existing Docker-free D1 controls entry point.

Commands completed:

- Pre-edit Bash probe: source scripts/run-d1-mutation-harness; set root_dir to the checkout and mutation_dir to mktemp -d; call make_agent_c_variant with credential-reference; inspect relative adapter imports using rg; call run_agent_c with that variant and case. Observed unrewritten bounded-context import and PRE_FIX_RUN exit=1. Retained in d1-rev5-prefixed-repro.log.
- `node --test tests/d1-agent-c-mutations.test.mjs`: exit 0, three passed, zero failed or skipped. The tests source the real harness and use its builder, definition loader, loop, and accounting without starting runtime services. Both deliberate control regressions were rejected and restorations passed. Extracted per-case failure lines and outer outcomes are reproduced below.
- `npm run d1:controls:test`: exit 0, 17 passed, zero failed or skipped. Its intentional negative controls also print failure/accounting diagnostics; these are not live database executions.
- `npm run agent-c:test`: exit 0, 22 tests passed with zero failed or skipped, then 20 mutations reported killed by the separate supervisor mutation runner.
- `npm run lint`: exit 0.
- `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero failed or skipped.
- `bash -n scripts/run-d1-mutation-harness` and `git diff --check`: exit 0.
- Pre-publication `npm run proof:verify`: exit 0, 542 events across 110 threads and three actors.

No Docker or database was started. Full npm test was not run. The dispatcher still owns live acceptance. Post-append proof and commit disposition will be reported in the final response.

## Direct harness evidence

```text
D1_AGENT_C_REWRITES fourth-import=rewritten pre-fix-bounded-context=unrewritten baseline=0 applied=t control=1 restored=0 killed=t
AGENT_C_CREDENTIAL_REFERENCE mutant-load-failed baseline=0 applied=t after=1 error={"code":"ERR_MODULE_NOT_FOUND","message":"Cannot find module '/private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-agent-c-SP5Ksl/intentionally-missing-module.mjs' imported from /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/d1-agent-c-SP5Ksl/agent-c-credential-reference.mjs"}
D1 mutation harness: executed=1 not_exercised=0 negative_control=0 expected_total=1
D1_AGENT_C_LOAD_CLASSIFICATION baseline=0 applied=t control=1 restored=0 killed=t
AGENT_C_CREDENTIAL_REFERENCE not ok 1 - credential-reference
AGENT_C_CREDENTIAL_SHAPE not ok 2 - credential-shape
AGENT_C_CREDENTIAL_CONTEXT not ok 3 - credential-context
AGENT_C_WRITE_PREFIX not ok 11 - write-prefix
AGENT_C_TURN_ENFORCEMENT not ok 12 - turn-enforcement
AGENT_C_REPLY_TARGET not ok 13 - reply-target
AGENT_C_RESULT_REVIEW not ok 14 - result-review
AGENT_C_POLLER_SILENCE not ok 15 - inbox-poller
AGENT_C_CREDENTIAL_EGRESS not ok 16 - credential-egress
AGENT_C_PROVIDER_DIAGNOSIS not ok 19 - provider-diagnosis
AGENT_C_PROVIDER_ERROR_EGRESS not ok 20 - provider-error-egress
AGENT_C_SCHEDULED_SILENCE not ok 21 - scheduled-poller-silence
AGENT_C_CREDENTIAL_FAILURE_REPORT not ok 22 - credential-unavailable-reporting
AGENT_C_CREDENTIAL_REFERENCE baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_CREDENTIAL_SHAPE baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_CREDENTIAL_CONTEXT baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_WRITE_PREFIX baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_TURN_ENFORCEMENT baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_REPLY_TARGET baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_RESULT_REVIEW baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_POLLER_SILENCE baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_CREDENTIAL_EGRESS baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_PROVIDER_DIAGNOSIS baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_PROVIDER_ERROR_EGRESS baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_SCHEDULED_SILENCE baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_CREDENTIAL_FAILURE_REPORT baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: executed=13 not_exercised=0 negative_control=0 expected_total=13
D1 mutation harness: all exercised controls discriminate
✔ agent-c builder derives adapter rewrites including a synthetic fourth import (104.376083ms)
✔ agent-c missing module is named, counted, and fails the actual harness branch (859.851083ms)
✔ all declared agent-c mutants apply and produce per-case failures through the harness (13058.45425ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14057.296542
```

## Retained logs

Digests were observed with `shasum -a 256 artifacts/agent-b/d1-rev5-*.log`.

| Artifact | SHA-256 |
| --- | --- |
| artifacts/agent-b/d1-rev5-agent-c-controls.log | 102516f1d5affdb605b03a955336058e19cc7c8118e851dc27d5f28d7db95c8e |
| artifacts/agent-b/d1-rev5-agent-c-suite.log | 6a1456c723999a51c7f8a65b78b647a5992820bac83a443a829206028b60be02 |
| artifacts/agent-b/d1-rev5-d1-controls.log | df8f3847b278ea81771fc9fe1ab3dca619d639d47bedb35ae5eb80c572eafb3d |
| artifacts/agent-b/d1-rev5-lint.log | 93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7 |
| artifacts/agent-b/d1-rev5-prefixed-repro.log | 7a152a8ea4d96ce4aadcd2fb1954c28575d5e4e9ce51e68d6c0cb78bbe799e36 |
| artifacts/agent-b/d1-rev5-surface-policy.log | 6e292b8d94e942653a3cc3be80363c99d7265d625c29caf310a3579e4cd553f3 |
