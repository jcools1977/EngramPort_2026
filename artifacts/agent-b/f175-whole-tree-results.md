# F175 whole-tree import results

Actor: agent-b, Codex Builder. Thread: f175-whole-tree-imports.
Handoff: 01a08dba-207e-7871-acf4-b200ed965e3a.
Source: f614123b08e161c55a15782eab244e15720c3475 plus this patch on agent-b/whole-tree.
Environment: Darwin arm64 worktree. Ordinary controls use Node v26.8.2; durable runs explicitly use Node v22.23.2. No Docker run is claimed.

The entry commands `npm run proof:verify` and `npm run engram -- inbox --actor agent-b` exited 0, reporting 615 events across 130 threads and three actors, and the requested handoff only. Read the complete handoff, repository rules, actor record, protocol, and event-v1 result schema. Opened its sole bounded reference, `artifacts/agent-b/f175-revision-results.md`; `shasum -a 256` returned the expected `5486350b11c8378cd1d171427198b8b439a082f83a7b16d5c2312368487c5ac2`.

## Criteria

- whole-tree-no-rewrite: satisfied. All copied-tree builders use plain writes; all detached builders retain writeVariant. The common helper comment explains the rule once.
- drift-control-generalized: satisfied. Every copied module checked by the control retains relative specifiers; detached synthetic imports must be rewritten. Paired pre-fix and fixed observations are quoted below.
- durable-mutants-node-22: blocked. The exact startup refusal is recorded for the baseline and all seven modes. The permitted fallback is documented, but live mutant discrimination remains blocked by the environment.
- controls-green: satisfied. Final results are recorded below. The F175 entry has a second revision paragraph naming CI run 34542620249, modulesRoot, and Miniflare's path resolution.

## Complete builder audit

Discovery of `^make_\w+_variant` and inspection of each body finds 28 builders: 15 copied trees and 13 detached variants. This differs from the handoff's count of 25. Fourteen copied builders still used writeVariant before this patch; the canary was already exempt. The audit includes every builder, including manifest-only, YAML, and TSX cases. No builder is omitted to force the requested count.

| Builder | Verdict |
| --- | --- |
| `make_d2_variant` | Detached: import-derived writer retained |
| `make_w1_1_manager_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_w1_1_oidc_variant` | Detached: import-derived writer retained |
| `make_w1_1_oidc_client_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_w1_1_oidc_durable_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_w1_1_oidc_provider_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_agent_c_variant` | Detached: import-derived writer retained |
| `make_report_correspondent_variant` | Detached: import-derived writer retained |
| `make_cli_variant` | Detached: import-derived writer retained |
| `make_contribution_ledger_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_git_adapter_core_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_sdk_core_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_sdk_package_variant` | Whole-tree: plain manifest write; selected source imports preserved |
| `make_sdk_published_surface_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_second_builder_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_git_adapter_core_override_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_event_v1_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_port_watch_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_site_event_types_variant` | Detached: import-derived writer retained |
| `make_site_install_claim_variant` | Detached: writer retained; TSX bytes are not rewritten |
| `make_actor_registry_variant` | Whole-tree: plain YAML write; no module imports |
| `make_actor_registry_verifier_variant` | Detached: import-derived writer retained |
| `make_pr_onboarding_variant` | Detached: import-derived writer retained |
| `make_event_directory_completeness_variant` | Detached: import-derived writer retained |
| `make_event_enumeration_alignment_variant` | Detached: import-derived writer retained |
| `make_event_extension_case_variant` | Detached: import-derived writer retained |
| `make_canary_variant` | Whole-tree: plain writes, relative imports preserved |
| `make_w1_8_variant` | Detached: import-derived writer retained |

## Paired drift observations

Commands:

```sh
git show HEAD:scripts/run-d1-mutation-harness > artifacts/agent-b/f175-whole-tree-before.bash
node tests/d1-variant-drift.mjs artifacts/agent-b/f175-whole-tree-before.bash
node tests/d1-variant-drift.mjs
```

Pre-fix: exit 1, `D1_VARIANT_DRIFT executed=125 loaded=131 synthetic_rewritten=0 relative_preserved=19 failures=40`.
It names `make_w1_1_oidc_durable_variant:route whole-tree import rewritten`, and also same-name, restart, atomic, both expiry modules, cleanup, and redaction. Complete paths are retained in the before log.
Fixed: exit 0, `D1_VARIANT_DRIFT executed=125 loaded=131 synthetic_rewritten=0 relative_preserved=59 failures=0`.
The load control uses a Cloudflare shim and does not establish live runtime behavior.

## Node 22 durable observations

Exact run pattern, in bash after `export PATH=/opt/homebrew/opt/node@22/bin:$PATH`:

```sh
source scripts/run-d1-mutation-harness
root_dir="$PWD"
# Baseline: target="$root_dir", selected=all.
# Each mutant: mode is route, same-name, restart, atomic, expiry, cleanup, redaction.
target="$root_dir/artifacts/agent-b/f175-whole-tree-variant-$mode"
make_w1_1_oidc_durable_variant "$target" "$mode"
node -v
W1_1_OIDC_DURABLE_MODULE_ROOT="$target" W1_1_OIDC_DURABLE_CASE="$mode" node --test --test-reporter=tap --test-timeout=10000 tests/workspace-oidc-durable.test.mjs
```

All seven builders exited 0. Disposable, unreferenced variant directories were removed after execution. Each durable log begins with the output of `node -v`: `v22.23.2`. Every test command exited 1 with the exact startup line:

```text
error: 'listen EPERM: operation not permitted 127.0.0.1'
```

The baseline selected all seven tests and failed all seven. Each selected mutant failed its selected test and skipped the other six. This is a local listen refusal during Miniflare startup, not an observed mutation kill. All eight logs contain no ENOENT; all seven expected forbidden lines are absent.

| Run | node -v | Exit | Expected forbidden line | ENOENT |
| --- | --- | --- | --- | --- |
| baseline | v22.23.2 | 1 | Not applicable | absent |
| route | v22.23.2 | 1 | absent | absent |
| same-name | v22.23.2 | 1 | absent | absent |
| restart | v22.23.2 | 1 | absent | absent |
| atomic | v22.23.2 | 1 | absent | absent |
| expiry | v22.23.2 | 1 | absent | absent |
| cleanup | v22.23.2 | 1 | absent | absent |
| redaction | v22.23.2 | 1 | absent | absent |

Expected forbidden lines from the harness:

```text
W1_1_OIDC_DURABLE route start=404 callback=404 fallback=404
W1_1_OIDC_DURABLE same_name pending=pending/true callback=400 clean=pending/true unknown=400
W1_1_OIDC_DURABLE restart before=false callback=400 clean=false
W1_1_OIDC_DURABLE atomic statuses=204/204 clean=false
W1_1_OIDC_DURABLE expiry expired=204 clean=false fresh=204
W1_1_OIDC_DURABLE cleanup scheduled=true claimed=204/true alarm=true
metadata=alarmAt,codeVerifier,expiresAt,nonce,present,status
```

The full Docker gate remains for agent-a. No source under packages/ or worker/ was edited.

## Validation and test development

`npm run proof > artifacts/agent-b/f175-whole-tree-proof.log 2>&1` exited 0: `tests 53`, `pass 53`, `fail 0`, `skipped 0`. The verifier at the start of that command reported 615 events across 130 threads and three actors.

`node --test tests/repository-surface-policy.test.mjs > artifacts/agent-b/f175-whole-tree-policy.log 2>&1` exited 0: four passed, zero failed, zero skipped. `bash -n scripts/run-d1-mutation-harness` and `git diff --check` exited 0.

Two intermediate `npm run d1:controls:test` runs exited 1 during negative-test development. The first expected a rewritten module from the manifest-only package builder. The second correctly detected the rewrites but rejected the accompanying `relative synthetic import missing` diagnostics. The assertions now exclude manifest-only/YAML mutations from the module-rewrite expectation and accept both precise diagnostics for the deliberately broken copies. Both original logs are retained. Positive drift observations had zero failures in both runs.

## Final controls

`npm run d1:controls:test > artifacts/agent-b/f175-whole-tree-controls-verified.log 2>&1` completed with exit 0:

```text
D1_VARIANT_DRIFT executed=125 loaded=131 synthetic_rewritten=72 failures=0
D1_DRIFT_NEGATIVE executed=125 failures=5 correspondent-load=detected port-watch-anchor=detected
D1_TREE_NEGATIVE executed=125 failures=116 whole-tree-rewrite=detected
tests 24
pass 23
fail 0
skipped 1
```

The one skipped control explicitly requires actual Node 26.5.0; this run used Node v26.8.2. It is not counted as a pass. The synthetic positive run preserved 59 copied module imports and rewrote 72 detached module imports. The 116 expected negative diagnostics comprise rewritten specifiers and missing relative synthetic imports in deliberately broken whole-tree outputs.

## Transcript digests

Command: `shasum -a 256 artifacts/agent-b/f175-whole-tree-*.log artifacts/agent-b/f175-whole-tree-before.bash` after every process completed.

```text
fb27e9e4650c1830f3721477c39eb92415bc16c6e92875dd0320dce6374fc1a8  artifacts/agent-b/f175-whole-tree-after.log
0a27277cf9c868b0b1fb0c8e60ff1d7a9793f43055dd8b0438be2a1adbf9fa53  artifacts/agent-b/f175-whole-tree-before.log
7638b1cc8ef5e33f5ac641cd0ecbd407fe0a60c1603c819888ac45b70c290c80  artifacts/agent-b/f175-whole-tree-controls-final.log
1f685cf26cb8e2dd215c7bc6d573eec989cd3335e5635672f75be04bd66ca076  artifacts/agent-b/f175-whole-tree-controls-verified.log
f8fe130ab49bbfa5b703b3ef7f4cf1823205ebf2870bc0267b329fc125430e19  artifacts/agent-b/f175-whole-tree-controls.log
7c2c0d573186405139ed8537574bf40a1f5715683c40773a541d3fa578465458  artifacts/agent-b/f175-whole-tree-durable-atomic.log
94b96b9210a20c542c092e8513c792af3f56ddad0bf5e2dfbcfc9c0025cdf4fb  artifacts/agent-b/f175-whole-tree-durable-baseline.log
048d1ee1163e7caaff46800cbcbc85a3a7f88aa9997eda3df164705ad6731ba3  artifacts/agent-b/f175-whole-tree-durable-cleanup.log
ada4695629d36eef4a0dfad31128565781bbb4643cc7857e30cc4f0667c5f4fc  artifacts/agent-b/f175-whole-tree-durable-expiry.log
1a6801265b995d8fd88db724d3b228d32f3ae097a171f9df3835991306f56d8e  artifacts/agent-b/f175-whole-tree-durable-redaction.log
98ae556c7f6d412a524a2fd7fd94835368e789d8f42d2bcdc5bbf1d6f8685159  artifacts/agent-b/f175-whole-tree-durable-restart.log
2abc725dc10fdc6ea965a535785bf14657b7eeeccddb03218d7ce9080ce68c44  artifacts/agent-b/f175-whole-tree-durable-route.log
4149ef26dce2ac88e05d95799a7228f47835d47206ed49ca54d1caea01dbceec  artifacts/agent-b/f175-whole-tree-durable-same-name.log
a578915e0b395162c50f279949ea53513b68db9da9f47777e4a69ae21b2fab96  artifacts/agent-b/f175-whole-tree-policy.log
bba19b90fb3f8d116d1f5b11fbe984976154e69c779c22fe48b0193c1edd193c  artifacts/agent-b/f175-whole-tree-proof.log
80e9d3402de900ed28715448028c4f30db937d04b66e27ba31f5088b19754971  artifacts/agent-b/f175-whole-tree-before.bash
```

Post-append verification and commit disposition are reported separately to keep this referenced artifact immutable.
