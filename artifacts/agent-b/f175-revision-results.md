# F175 revision results

Actor: agent-b, Codex Builder. Thread: f175-harness-drift.
Original handoff: 01a08d83-2982-7ec7-abb5-f65fa2ea4548.
Reply target: 01a08d9a-4f35-745d-99cc-93a7aaa1ba6c.
Source: 9e606b49c5c5903e44dce694c0c6aba36360de95 plus this patch, branch agent-b/f175.
Environment: Darwin arm64, Node v26.5.0, local Git worktree. Docker socket access denied by the sandbox.

## Criteria

- one-variant-builder: satisfied as refined by the revision. Detached variants retain the shared import-derived writer. The five whole-tree canary mutations now use fs.writeFileSync with a one-line explanation, preserving relocation. The audit below covers all 28 builders, not just the changed canary.
- anchor-reanchored: satisfied. The actual d1_run_mutations branch reports `PORT_WATCH_SHARED_ELIGIBILITY baseline=0 applied=t after=1 forbidden=t restored=0`, with executed=1 and exit 0. This revision does not change event-core.mjs.
- docker-free-drift-control: satisfied. The control applies all 125 builder cases and loads 131 modules. The new check rejects file URL rewriting in whole-tree canary modules and checks preservation of a synthetic relative import. It rejects the actual d0a40a1 form; the deliberate rewrite negative control rejects the same report-incident defect. The earlier correspondent-load and Port Watch-anchor negative controls remain exercised.
- live-gate: blocked. `npm run db:test` returned exit 0 but emitted only `DOCKER_GATE_SKIP gate=db:test reason=Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock`. No live canary result or D1 summary was produced. The seven expected real Miniflare not-exercised outcomes were not observed. Exit 0 for this skip is not a passing gate. Agent-a must run the gate in an environment with Docker access.

## Builder audit

The verdict describes the builder output, with a note distinguishing in-place imports from subsequent relocation. Only the canary test copies and modifies the module graph a second time. SDK package tests pack/install deliberately and do not use the canary's second adapter-tree copy. Their manifest-only or bundled mutations do not require the canary exemption.

| Builder | Verdict | Consumer and disposition |
| --- | --- | --- |
| `make_d2_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_w1_1_manager_variant` | Whole-tree copy | Session manager test imports the supplied tree directly. |
| `make_w1_1_oidc_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_w1_1_oidc_client_variant` | Whole-tree copy | OIDC client test imports the supplied tree directly. |
| `make_w1_1_oidc_durable_variant` | Whole-tree copy | Miniflare uses the supplied modulesRoot and fixture scriptPath. No second source copy; real runtime remains blocked. |
| `make_w1_1_oidc_provider_variant` | Whole-tree copy | Provider test imports the supplied tree directly. |
| `make_agent_c_variant` | Detached file | Detached supervisor plus explicit mutated credential dependency; shared writer retains their intended linkage. |
| `make_report_correspondent_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_cli_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_contribution_ledger_variant` | Whole-tree copy | Ledger module is imported directly from the copied directory. |
| `make_git_adapter_core_variant` | Whole-tree copy | CLI is imported directly from the copied directory. |
| `make_sdk_core_variant` | Whole-tree copy | CLI and SDK consumers import the supplied copied tree directly. |
| `make_sdk_package_variant` | Whole-tree copy | Only package.json is mutated, so no import rewriting occurs; packing deliberately exposes source isolation failure. |
| `make_sdk_published_surface_variant` | Whole-tree copy | Packed SDK distribution is a self-contained bundle; packaging does not copy the adapter graph. Manifest is also changed. |
| `make_second_builder_variant` | Whole-tree copy | Second-builder test imports the copied SDK directly. |
| `make_git_adapter_core_override_variant` | Whole-tree copy | CLI test imports the copied CLI directly. |
| `make_event_v1_variant` | Whole-tree copy | Tests import the copied verifier, CLI, and core directly. |
| `make_port_watch_variant` | Whole-tree copy | Tests import copied watcher/core modules directly; live variants select that same root. |
| `make_site_event_types_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_site_install_claim_variant` | Detached file | Detached TSX text variant; writer does not rewrite non-MJS targets. |
| `make_actor_registry_variant` | Whole-tree copy | Copies actor YAML files; no ECMAScript imports exist. |
| `make_actor_registry_verifier_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_pr_onboarding_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_event_directory_completeness_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_event_enumeration_alignment_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |
| `make_event_extension_case_variant` | Detached file | Three detached files use explicit verifier/core substitutions through the shared writer. |
| `make_canary_variant` | Whole-tree copy | Fixture copies the supplied module tree again, weakens its credential boundary, and uses cache-busting imports. Preserve relative imports in all five modes. |
| `make_w1_8_variant` | Detached file | Detached source uses the shared import-derived writer against its original source. |

## Commands and observations

- `npm run proof:verify` at entry: exit 0, verified 603 events across 126 threads and three actors. `npm run engram -- inbox --actor agent-b`: exit 0, exactly the revision event.
- Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, schema $defs.result, the original handoff, revision, previous completion, and the bound F174 completion and results. `shasum -a 256` matched f175-results.md at 06efe6b54074840109255e612a781c087dac97c355c105e8042bab63dc424c0a and f174-results.md at 744bd40c4ed6d8acef2fcfcaec0a6fd345f98c98f98bc7fa43faead978347cd6.
- `git show d0a40a1:scripts/run-d1-mutation-harness > artifacts/agent-b/f175-revision-before.bash`, then `node tests/d1-variant-drift.mjs artifacts/agent-b/f175-revision-before.bash`: exit 1, `executed=125 loaded=131 synthetic_rewritten=0 relative_preserved=4 failures=1`, naming `make_canary_variant:report_incident_disabled whole-tree import rewritten`.
- `node tests/d1-variant-drift.mjs`: exit 0, `executed=125 loaded=131 synthetic_rewritten=0 relative_preserved=5 failures=0`.
- First `npm run d1:controls:test`: exit 1 because the new negative test expected five rejected imports, but only report-boundary.mjs has relative MJS dependencies without synthetic injection. Corrected that assertion to one actual rejection; the positive synthetic run still checks all five modes. The initial failure transcript is retained.
- `npm run lint`: exit 0. `bash -n scripts/run-d1-mutation-harness`: exit 0. `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero failed or skipped. `git diff --check`: exit 0.
- Focused real Port Watch branch command: source scripts/run-d1-mutation-harness in bash; set root_dir to PWD and mutation_dir to mktemp -d; call d1_load_definitions; select only PORT_WATCH_SHARED_ELIGIBILITY from MUTATIONS; call d1_accounting_init, d1_run_mutations, and d1_summary. Exit 0; `executed=1 not_exercised=0 negative_control=0 expected_total=1` and `all exercised controls discriminate`. Exact outcome is quoted above.

The drift control's Cloudflare loader shim establishes module loading only. Synthetic timeout/classification controls do not establish live canary or Miniflare execution. Post-append verification and commit disposition will be reported separately so this referenced artifact remains immutable.

## Final control run

`npm run d1:controls:test > artifacts/agent-b/f175-revision-controls-final.log 2>&1` completed with exit 0: 24 passed, zero failed, zero skipped. It observed `D1_VARIANT_DRIFT executed=125 loaded=131 synthetic_rewritten=125 failures=0`, plus five preserved synthetic relative imports asserted by the test, and `D1_TREE_NEGATIVE executed=125 failures=1 whole-tree-rewrite=detected`.

## Transcript digests

Command: `shasum -a 256` for each file below.

```
d522537adae6e638b46b204d20979c7161056dda963a790df98b833f3d07f9e2  artifacts/agent-b/f175-revision-after.log
705b94d48d217fc5bf4da55a873ab9952bd3629004979f9ed49b3bcf0aa0d3e4  artifacts/agent-b/f175-revision-anchor.log
03971dc0bb0b473e4f00fe1e8f3ce555f3a401228e13ef811533776320cbba99  artifacts/agent-b/f175-revision-before.bash
ca5e1f13f66be57d5a78c81b3a483647228369b8dd4af6da913dae565be5c294  artifacts/agent-b/f175-revision-before.log
836b841c6c56700d5698b15f075065c8d6b9985e1d0a746f3482cace2a70cbad  artifacts/agent-b/f175-revision-controls-final.log
10deec45bc53e26c762416ae4c25d4cd377f4760356db22a476b634e57406f90  artifacts/agent-b/f175-revision-controls.log
67ae01bcb8bf5092bfa209bab8fa1a46a0083624129eab8bf26c7297083e6b5d  artifacts/agent-b/f175-revision-db.log
93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7  artifacts/agent-b/f175-revision-lint.log
1ce496249246f300581fed042cafbafa6f5aa2ac71ebc7c737250300d78a4c77  artifacts/agent-b/f175-revision-policy.log
```
