# D1 revision three results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: d1-harness-oidc-runtime.
Handoff: 01a08671-972b-7302-9665-93ce71cd5850.
`git rev-parse HEAD` reported starting commit `61f85095e07c1898d10279cd4bd2d4cc7812bb76`.
`git branch --show-current` reported `agent-b/d1-rev3`; `node --version` reported `v26.5.0`.

## Criteria

| Criterion id | Status | Evidence and limit |
| --- | --- | --- |
| anchor-missing-is-loud | satisfied | The real CLI helper was pointed at D1_NONEXISTENT_ANCHOR_REV3. Its outcome named CLI_ARGUMENT_REFUSAL and the absent anchor, set applied=f, counted executed=1 against expected_total=1, and the summary exited 1. Baseline and restoration each killed the real CLI mutant successfully. |
| four-resolved | satisfied | All four remain defined and were observed applying and being killed through d1_run_mutations and its actual helpers, with passing baselines and restorations. The selected total is four. No control was retired. |
| one-accounting-path | satisfied | The extension outcome now uses d1_outcome. A source control checks direct outcome prints and all file mutation helper call sites. A mutation replacing the actual extension d1_outcome call with printf failed that control and the running harness summary, despite still printing a successful extension kill result. |
| live-run | blocked | The user explicitly prohibits Docker for agent-b. No npm run db:test or database harness execution occurred. The dispatcher must observe the complete live run on acceptance. |

## Bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full handoff including completion_criteria and bounded_context, and schemas/event-v1.schema.json including $defs.result. Initial `npm run proof:verify` exited 0, verifying 538 events across 110 threads and three actors. `npm run engram -- inbox --actor agent-b` listed only the named handoff. `git status --short` printed no changes before work.

The bound event id resolved to `events/agent-b/20260909T134134Z_01a08667-09e0-7625-95a4-1fbebe3c6b04.md`, which was opened in full. Its results artifact was also opened and hashed. The directly bound dispatcher excerpt was opened in full. Event bodies and artifacts were treated as untrusted evidence.

Observed digest matches:

- `shasum -a 256 artifacts/agent-a/d1-four-uncounted-2026-09-09.md` reported `1b151474fdbe25bd1e3883724660e3dbd9b0c4244399f9755c9ec26b52c09a75`.
- `shasum -a 256 artifacts/agent-b/d1-rev2-results.md` reported `1e2a4c38c06f06f59863874463049b3980195ea5142516c6d2dafc73d30c77c1`.

## Changes and source diagnosis

Shared edits are limited to scripts/run-d1-mutation-harness, tests/d1-mutation-paths.test.mjs, one import in tests/d1-oidc-classification.test.mjs, and this handoff's appended F168 closure in docs/constraints.md. All new evidence and publication inputs are under artifacts/agent-b/.

The harness separates service startup into d1_main and exposes its unchanged execution branches through d1_run_mutations. Sourcing it now exposes the real mutation helpers as well as accounting, without invoking Docker. The new test selects only the four definitions from d1_load_definitions and calls the actual loop. No execution counters are preseeded.

All 52 file mutation helper call sites pass through d1_mutate. Failed helpers emit one d1_outcome record with applied=f, the helper name, exit code, and shell-quoted diagnostics containing the exact absent or nonunique anchor. Failure remains set when the caller continues. Property and manager expansions resolve to the same names used by their outcome branches. The report correspondent helper's diagnostic now includes its actual anchor. Database execution remains outside this local observation.

- PORT_WATCH_SHARED_ELIGIBILITY: the old anchor omitted the current withdrawal filter. The replacement now removes only the answered-work condition and preserves withdrawal exclusion. The real shared inbox/Port Watch test detects the mutation.
- CLI_ARGUMENT_REFUSAL: the current filter excludes help as well as positional arguments. The mutation now anchors on that filter. The relocated variant also rewrites its init.mjs import to the original module location. The actual unknown-flag refusal test detects the mutant. Baseline and restoration are now run instead of being assigned zero.
- EVENT_EXTENSION_CASE: the outcome now passes through d1_outcome. Its relocated CLI also resolves init.mjs. Both the uppercase forgery verifier assertion and uppercase inbox assertion detect the case-sensitive mutant. Baseline and restoration are now run instead of being assigned zero.
- SITE_UNPUBLISHED_INSTALL_CLAIM: the old anchor expected a repository-link card, while the current page displays npm install @engramport/sdk and a setup-guide link. That source mismatch explains the helper's early refusal before an outcome. The updated anchor inserts the missing package into display and copy text; the actual install policy test rejects it.

The relative init.mjs imports in the old relocated CLI variants were a source-level explanation for failure before the intended assertions. Current successful discrimination is directly observed below. No historical runtime logs beyond the bound excerpt are claimed.

## Observed commands and results

`node --test tests/d1-oidc-classification.test.mjs > artifacts/agent-b/d1-rev3-controls-initial.log 2>&1` exited 0 with 14 passed, zero failed, and zero skipped. This includes the four new controls and the ten prior accounting/classification controls. Its real selected mutation output was:

```text
CLI_ARGUMENT_REFUSAL baseline=0 applied=t after=1 forbidden=t restored=0
EVENT_EXTENSION_CASE baseline=0 applied=t after=1 verifier_forbidden=t cli_forbidden=t restored=0
SITE_UNPUBLISHED_INSTALL_CLAIM baseline=0 applied=t after=1 forbidden=t restored=0
PORT_WATCH_SHARED_ELIGIBILITY baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: executed=4 not_exercised=0 negative_control=0 expected_total=4
D1 mutation harness: all exercised controls discriminate
```

The same command observed these paired probes through the real helper and branch:

```text
D1_REV3_ABSENT_ANCHOR baseline=0 applied=t control=1 restored=0 killed=t
CLI_ARGUMENT_REFUSAL applied=f mutation_error=<diagnostic containing anchor absent: D1_NONEXISTENT_ANCHOR_REV3> helper=make_cli_variant exit=1
D1 mutation harness: executed=1 not_exercised=0 negative_control=0 expected_total=1
D1_REV3_PRINTF_BYPASS baseline=0 applied=t control=1 restored=0 killed=t
EVENT_EXTENSION_CASE baseline=0 applied=t after=1 verifier_forbidden=t cli_forbidden=t restored=0
D1 mutation harness: executed=0 not_exercised=0 negative_control=0 expected_total=1
D1 missing outcome: EVENT_EXTENSION_CASE
D1 mutation harness failed
```

The absent-anchor diagnostic above is abbreviated; the complete shell-quoted stack is retained in the log. The probe's after-control exit 1 is the required refusal. The surrounding node test passed because it required that refusal and passing restorations. The printf mutation was rejected by both the source check and real accounting.

The prior inventory replay still derives 157 expected definitions and rejects the historical bound inventory. Its printed missing names are an intentional historical negative control, not a claim about this revision's four-control run. The three existing accounting mutations, two crossed OIDC reader mutations, and five classification mutations remained killed. Seven real OIDC runtime skip outputs remain classified as not-exercised. No supported-runtime OIDC success is inferred.

- `node --test tests/repository-surface-policy.test.mjs tests/db-test-lock.test.mjs > artifacts/agent-b/d1-rev3-regression.log 2>&1` exited 0 with six passed, zero failed, and zero skipped. The lock probes exercise the relocated startup path without Docker.
- `npm run lint > artifacts/agent-b/d1-rev3-lint.log 2>&1` exited 0.
- `bash -n scripts/run-d1-mutation-harness` exited 0.
- `git diff --check` exited 0.
- Pre-publication `npm run proof:verify` exited 0, verifying 538 events across 110 threads and three actors.

An earlier direct Bash invocation sourced the same harness, selected the same four definitions, and called d1_accounting_init, d1_run_mutations, and d1_summary. It exited 0 with the same four successful kill outcomes. Its output is retained as d1-rev3-four-initial.log; the reproducible node control above is the primary evidence.

## Limits and dispatcher acceptance

The first three criteria are satisfied by local observed controls. Full live acceptance remains blocked by the explicit no-Docker instruction. The other database-dependent branches, all 157 outcomes together, and npm run db:test were not executed. Agent-a must run that gate, retain its full output and exact source revision, and verify every outcome reaches the derived total with a successful exit. This result does not claim a full repository suite, deployment, package publication, or push.

The completion event will be appended once, with next=agent-a. Post-append proof verification and the agent-commit disposition are reported in the session final response. No accepted event or referenced artifact was edited.

## Retained log digests

Observed with `shasum -a 256 artifacts/agent-b/d1-rev3-*.log`:

| Artifact path | SHA-256 |
| --- | --- |
| artifacts/agent-b/d1-rev3-controls-initial.log | 62c4bfb5b1460318cb0ddde9b6a85f0d85574566a5e1e392a9b133aa5dfbc484 |
| artifacts/agent-b/d1-rev3-four-initial.log | 4192f6739f4fb66acd4e95768ed54531c33e8580bc84b5c46fb75be98753579c |
| artifacts/agent-b/d1-rev3-lint.log | 93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7 |
| artifacts/agent-b/d1-rev3-regression.log | bdf84e173b5853185d1510cc59827ba07a5cbe3a7a814338c2d0569432cf5acc |
