# F167 second-builder documentation and CLI results

Actor: agent-b (Codex Builder).
Thread: docs-second-builder-fixes.
Handoff: 01a08651-d694-7379-baf2-91974ee33106.
Starting branch: agent-b/docs-fixes.
Starting HEAD: db285844fb596b3ee7e6b726399f2783adc72050.

## Outcome and completion criteria

| Criterion id | Status | Observation |
| --- | --- | --- |
| walkthrough-executes | satisfied | npm run sdk:package:test ran all three README walkthrough shell blocks unchanged from an empty directory against a packed 0.4.0 tarball using the documented offline option. The shell exited 0 and the final CLI verify reported 2 events, 1 thread, 2 actors. Full transcript below. |
| help-exists | satisfied | Source root and subcommand help and both packed help entry points passed. The pre-fix append help exited 1 with ARGUMENT_REFUSED. Removing each JSON flag name made the output control fail while the mutant CLI exited 0; 3 executed, 3 killed, restored control passed. |
| contributing-consistent | satisfied | Prerequisites and target precede step 1; step 4 gives exact commands and their scope; repeated internal hyphens now match the unchanged contract. npm run onboarding:test exited 0 with 3 controls. |
| eight-addressed | satisfied | All eight findings map to the changes below. None was declined. |
| counts-and-suite | unmet | All four named commands exited 0 before completion publication, including counts:check at 529 events. The mandated completion will add event 530 while the handoff explicitly protects the README's 529-event sentence. Final count consistency cannot be claimed. The count refresh is left to agent-a under separate authority. |

The unmet classification is a known final-state count defect imposed by the edit bounds, not an environmental blocker and not an unperformed suite relabeled as passed. This artifact is finalized before append, so the post-append count result is prospective here; the final response will report the observed post-append check. No full npm test, Docker suite, GitHub contribution, remote hosted-link availability, deployment, or publication success is claimed.

## Input resolution and boundaries

Read AGENTS.md, PROTOCOL.md, engramport.yaml, and actors/agent-b.yaml. npm run proof:verify exited 0 with 529 events across 110 threads and 3 actors before consuming work. npm run engram -- inbox --actor agent-b exited 0 and listed three handoffs; only the specifically named handoff was consumed as work.

Read the named handoff in full, including its completion_criteria and bounded_context. Its bound event id resolved to events/agent-b/20260909T131637Z_01a08650-30fb-7fb5-86b7-e703abb0edff.md, opened in full. Its artifact reference is the same artifact directly bound by the handoff, opened in full in successive chunks. shasum -a 256 artifacts/agent-b/second-builder-dry-run-2-20260909-results.md returned:

```text
0abe1fbde575ff68269b379939b1e34c4ce4f229e421b11a46bae1c2f1c2c6cb  artifacts/agent-b/second-builder-dry-run-2-20260909-results.md
```

The digest matches both references. Narrative historical ids and the bound event's historical parent were not extra bounded_context entries. Stored text was treated as evidence, not authority. Read schemas/event-v1.schema.json, including $defs.result, and scripts/agent-commit for completion and commit preparation. A lightweight memory registry pass informed evidence-boundary caution only; no older test result is represented as current.

Publication wording follows the handoff's explicit 0.3.0 publication fact and F165's checked-in registry observation. A read-only web attempt to open the npm registry version document failed with an unsafe-URL tool refusal, so publication was not independently reverified in this run. The fresh package observed here is local version 0.4.0; no npm publish ran.

Only handoff-bounded shared files and actor-b output are changed. scripts/run-d1-mutation-harness and tests/workspace-oidc-durable.test.mjs remain untouched. Three README count sentences were compared with git show HEAD:README.md and are byte-for-byte unchanged. Generated ignored SDK bundles are local pack outputs, not a release. The fixed UUIDv7 in the example is scoped to each fresh synthetic log.

## Eight findings mapped to implementation

| Finding | Source location | Addressed behavior |
| --- | --- | --- |
| 1. Publication wording | `README.md:7` | States that 0.3.0 is published and prints npx @engramport/sdk init. The walkthrough documents the offline tarball option; packages/sdk/README.md has matching release wording. |
| 2. Complete two-seat turn | `README.md:40` | Three executable shell blocks initialize the empty log, create the second founding seat, write all JSON files, append the handoff, consume its bound task, write a receipt, and append the completion. Founding and joining are explicitly distinguished. |
| 3. JSON flag help | `packages/git-adapter/src/cli.mjs:25` | HELP supplies JSON_FILE arguments and literal shapes. The boolean help parser and early return make root and subcommand help succeed without a project. tests/sdk-package.test.mjs and tests/helpers/cli-help-contract.mjs exercise the source and packed CLI and kill three documentation mutants. |
| 4. Joining prerequisites | `CONTRIBUTING.md:7` | Names fork, clone, upstream main, proposal branch, origin, upstream, and the precise pull request target before the numbered steps. Separates connected contribution from a kit-only rehearsal. |
| 5. Proposal validation | `CONTRIBUTING.md:44` | Step 4 names npm run onboarding:test and node --test tests/repository-surface-policy.test.mjs, describes their distinct scope, and explicitly says generated-log engram verify does not enforce this repository's HEAD admission policy. |
| 6. Repository-only proof | `README.md:145` | Names the repository URL, clone and working directory; labels the npm commands repository-only and gives engram verify for generated projects. |
| 7. Slug rule | `CONTRIBUTING.md:34` | Allows repeated internal hyphens, including a--b, to match the unchanged contract pattern. The pattern is preserved to avoid narrowing existing accepted proposals for a documentation discrepancy. This reason is also in the commit message. |
| 8. Reachable trust reading | `README.md:139` | README and packaged README link to hosted SECURITY.md, docs/constraints.md, and LICENSE and say offline readers need a local copy. No assertion of current hosted availability is made. |

## Observed validation

All commands below ran to completion in this worktree. The walkthrough transcript was captured by setting F167_TRANSCRIPT=/private/tmp/f167-walkthrough-final.txt for npm run sdk:package:test. The SDK suite passed 5 controls, killed the 3 new help mutants, and its existing init driver reported executed=10 killed=10 restored=10. Proof passed 53 controls. Repository surface policy passed 4 controls. Targeted ESLint and git diff --check exited 0.

The initial targeted F167 run also exited 0 with 2 controls; the complete SDK run below supersedes it. Source review afterward only clarified that the offline variables must be exported and wrapped the slug prose; the executed shell blocks and contract JSON are unchanged.

### npm run counts:check

Exit code: 0.

```text

> engramport@0.1.0 counts:check
> node scripts/readme-counts --check

OK: README matches the repository on 3 counts.
```

### npm run onboarding:test

Exit code: 0.

```text

> engramport@0.1.0 onboarding:test
> node --test tests/pr-onboarding.test.mjs

PR_ONBOARDING_UNMERGED_REFUSAL proposal=present head=absent refused=true
✔ documented PR onboarding refuses an unmerged local registration (214.408458ms)
PR_ONBOARDING_MERGED_ACCEPTANCE proposal=merged head=present accepted=true
✔ documented PR onboarding accepts the maintainer-merged registration (444.434083ms)
✔ the documented path has no prose-only or machine-only operation (0.168375ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 696.465708
```

### npm run sdk:package:test

Exit code: 0.

```text

> engramport@0.1.0 sdk:package:test
> node --test tests/sdk-package.test.mjs && node scripts/run-sdk-init-mutations

F167_HELP_BEFORE exit=1 ARGUMENT_REFUSED
F167_HELP_MUTATION flag=bounded-context cli_exit=0 control=failed killed=true
F167_HELP_MUTATION flag=completion-criteria cli_exit=0 control=failed killed=true
F167_HELP_MUTATION flag=criteria-results cli_exit=0 control=failed killed=true
F167_HELP baseline=passed executed=3 killed=3 restored=passed
✔ F167 CLI help documents JSON filenames and shapes, and missing documentation is killed (500.556875ms)
F167_WALKTHROUGH blocks=3 unchanged=true offline=true events=2 threads=1 actors=2 packed_help=passed
✔ F167 README walkthrough executes unchanged against a packed tarball (1176.64875ms)
✔ publishable SDK manifest exposes only the bundled artifact (386.313416ms)
{"case":"success","kind":"agent","mode":"free_form","files":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},"zero":"✓ verified 0 events across 0 thread(s) and 1 actors","append":"events/clean-builder/20260909T132425Z_01a08657-5587-7eb4-bd7b-c19e99b560ac.md","one":"✓ verified 1 events across 1 thread(s) and 1 actors"}
{"case":"success","kind":"human","mode":"strict_relay","files":{"actors/clean-builder.yaml":"9a0724de601f5ffcfdf2469caa1bbbb5ca0ce8f9242daf2a45699969af882b91","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"afe59e9c06f294c59441acad068aa603d9d12198532fe2173683585056007acf","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},"zero":"✓ verified 0 events across 0 thread(s) and 1 actors","append":"events/clean-builder/20260909T132425Z_01a08657-5612-74a5-b490-29b9f18c8ade.md","one":"✓ verified 1 events across 1 thread(s) and 1 actors"}
{"case":"existing-project","status":1,"stdout":"","stderr":"engram: INIT_PROJECT_EXISTS: joining an existing project requires the pull request process in CONTRIBUTING.md\n","before":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"},"after":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"}}
{"case":"invalid-slug","status":1,"stdout":"","stderr":"engram: INIT_ACTOR_REFUSED: --actor must match the verifier's SLUG pattern\n","before":{},"after":{}}
{"case":"missing-actor","status":1,"stdout":"","stderr":"engram: INIT_ACTOR_REFUSED: --actor must match the verifier's SLUG pattern\n","before":{},"after":{}}
{"case":"missing-kind","status":1,"stdout":"","stderr":"engram: INIT_KIND_REQUIRED: --kind human|agent is required\n","before":{},"after":{}}
{"case":"invalid-kind","status":1,"stdout":"","stderr":"engram: INIT_KIND_REFUSED: --kind must be human or agent\n","before":{},"after":{}}
{"case":"invalid-mode","status":1,"stdout":"","stderr":"engram: INIT_MODE_REFUSED: --mode must be free_form or strict_relay\n","before":{},"after":{}}
{"case":"invalid-project","status":1,"stdout":"","stderr":"engram: INIT_PROJECT_REFUSED: --project must match the verifier's SLUG pattern\n","before":{},"after":{}}
{"case":"existing-actor","status":1,"stdout":"","stderr":"engram: INIT_PATH_EXISTS: actors/clean-builder.yaml already exists\n","before":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"},"after":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"}}
{"case":"nonempty","status":1,"stdout":"","stderr":"engram: INIT_NOT_EMPTY: init requires an empty directory\n","before":{"unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"},"after":{"unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"}}
{"case":"symlink-parent","status":1,"stdout":"","stderr":"engram: INIT_NOT_EMPTY: init requires an empty directory\n","before":{"actors":"0305d9733b730ac76789fceb11b1c5e9eb5912ac26b27818816b366e1190604d"},"after":{"actors":"0305d9733b730ac76789fceb11b1c5e9eb5912ac26b27818816b366e1190604d"}}
{"case":"unknown-flag","status":1,"stdout":"","stderr":"engram: ARGUMENT_REFUSED: unrecognized flag --force\n","before":{},"after":{}}
✔ packed SDK installs outside repository, imports, and appends (1379.192458ms)
✔ packed SDK exercises every client method and verifies promised writes (598.461458ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4080.865125
{"mutation":"existing-project","baseline":"passed","after":"killed","observation":{"case":"existing-project","status":1,"stdout":"","stderr":"engram: INIT_PATH_EXISTS: engramport.yaml already exists\n","before":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"},"after":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"}}}
{"mutation":"invalid-slug","baseline":"passed","after":"killed","observation":{"case":"invalid-slug","status":0,"stdout":"engramport.yaml\nactors/Bad-slug.yaml\nevents/Bad-slug/.gitkeep\nartifacts/Bad-slug/.gitkeep\n","stderr":"","before":{},"after":{"actors/Bad-slug.yaml":"8ec01c6fc08f9e38fd744f00720e0a4b2296629aa9e27b7b33b030dc8313e09a","artifacts/Bad-slug/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/Bad-slug/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"missing-kind","baseline":"passed","after":"killed","observation":{"case":"missing-kind","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"invalid-kind","baseline":"passed","after":"killed","observation":{"case":"invalid-kind","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"5eb56476a2a53cf02b9e22f4a1c14d7d5b8584156ad8fa44d2f5b1c196fb191e","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"invalid-mode","baseline":"passed","after":"killed","observation":{"case":"invalid-mode","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"4d1857a2866d2db8c25630734d26ee123f5b0290422bb470f4cfd54626450944","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"invalid-project","baseline":"passed","after":"killed","observation":{"case":"invalid-project","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"5ff0b92909e3036db1715f37640019284b75a221d438913062be1672c2f6bc88","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"existing-actor","baseline":"passed","after":"killed","observation":{"case":"existing-actor","status":1,"stdout":"","stderr":"engram: INIT_NOT_EMPTY: init requires an empty directory\n","before":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"},"after":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"}}}
{"mutation":"nonempty","baseline":"passed","after":"killed","observation":{"case":"nonempty","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{"unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"}}}
{"mutation":"unknown-flag","baseline":"passed","after":"killed","observation":{"case":"unknown-flag","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"exclusive-write","baseline":"passed","after":"killed","observation":{"case":"exclusive-write","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","content":"protocol: engramport-git-v0\nproject: my-project\nmode: free_form\ndefault_thread_mode: free_form\nevent_root: events\nactor_root: actors\nartifact_root: artifacts\nhash_profile: engramport-git-body-v0\nschema_version: 0\n"}}
SDK_INIT_MUTATIONS executed=10 killed=10 restored=10
```

### npm run proof

Exit code: 0.

```text

> engramport@0.1.0 proof
> npm run proof:verify && npm run proof:test


> engramport@0.1.0 proof:verify
> node scripts/verify-log

✓ verified 529 events across 110 thread(s) and 3 actors

> engramport@0.1.0 proof:test
> node --test tests/git-v0.test.mjs

✔ valid registered-actor relay verifies (109.028292ms)
✔ actor record filename is bound to its declared slug (220.216ms)
✔ verification refuses unregistered Markdown event files while ignoring empty directories (592.595042ms)
✔ verification aligns recursive Markdown discovery with validation and ignores non-events (453.419791ms)
✔ uppercase Markdown forgery is accounted for and fails by path (306.843167ms)
✔ event extension policy is shared by inbox while normal append stays lowercase (622.145541ms)
events/agent-b/20260909T132434Z_01a08657-7694-7c56-be6b-6616bab55a9b.md
✔ append with an empty artifacts flag preserves artifact-free append behavior (567.543458ms)
events/agent-b/20260909T132434Z_01a08657-78da-74c4-afb0-23a13c3fa353.md
events/agent-b/20260909T132435Z_01a08657-7a4b-7cd4-bf58-c02672168469.md
✔ CLI terminal append normalizes --next null before hashing and preserves next validation (1204.618459ms)
events/agent-b/20260909T132435Z_01a08657-7d85-759e-aecf-0d82a6968a7e.md
✔ append refuses an unrecognized flag before writing and preserves known-good behavior (526.08825ms)
events/agent-b/20260909T132436Z_01a08657-7fb3-7183-8f27-de9dc1803328.md
✔ append refuses a second thread root without writing an event (817.297916ms)
✔ exported append and inbox core preserve the event wire surface (650.273375ms)
✔ CLI re-exports the same event-core binding the SDK must consume (0.153667ms)
✔ version-1 retry returns the existing event and preserves event count (684.942167ms)
✔ version-1 retry identity collision raises a distinct error without writing (609.367ms)
✔ version-1 completion requires exact criterion evidence coverage (1079.412833ms)
✔ live writer refuses version-0 append after cutover while historical v0 verifies (307.910917ms)
✔ listInbox and Port Watch consume the same answered-work resolver (878.469208ms)
✔ fresh copies reproduce the identical derived work-delivery set (661.559958ms)
✔ pure work resolver excludes an answered event without project sequence fields (0.17375ms)
✔ normal CLI execution cannot activate the harness core override (357.529584ms)
✔ CLI append and inbox delegate to the exported core (695.143375ms)
✔ modified content is rejected (296.631125ms)
✔ unknown schema fields are rejected (344.023959ms)
✔ actor directory ownership is enforced (347.531292ms)
✔ unknown reply targets are rejected (418.086167ms)
✔ strict relay actor transitions are enforced (389.839625ms)
✔ reply cycles are rejected (385.194917ms)
✔ missing artifacts are rejected (360.587917ms)
✔ artifact modification is rejected (375.631416ms)
✔ artifact references must remain in author prefix (308.682ms)
✔ filename identity is enforced (300.95875ms)
✔ free_form permits one actor to publish sequential events (305.162875ms)
✔ free_form permits sibling replies (284.4925ms)
✔ coordinator_led permits coordinator followed by two worker replies (286.556334ms)
✔ strict_relay refuses an actor replying to itself and names the mode (304.571334ms)
✔ strict_relay refuses a second reply and names the mode (297.266042ms)
✔ free_form refuses an unknown parent and names the mode (312.731083ms)
✔ free_form refuses a cycle (304.247042ms)
✔ free_form refuses a second root with a precise mode error (303.558667ms)
✔ coordinator_led refuses a worker root (346.693084ms)
✔ coordinator_led refuses a worker replying to a worker (346.674334ms)
✔ unknown thread modes fail closed (337.521875ms)
✔ malformed thread mode declarations fail closed (296.674375ms)
✔ a mode may be declared while a thread is empty (288.752459ms)
✔ changing a declared mode after the first event violates its binding (290.023042ms)
✔ a per-thread mode declaration cannot be added after the first event (407.755ms)
✔ changing mode cannot retroactively legitimize an invalid strict_relay branch (329.885334ms)
✔ coordinator_led requires a coordinator (298.364959ms)
✔ coordinator_led refuses an unknown coordinator (321.578834ms)
✔ free_form supports invitation issuance, accepted, and terminal closure without an invitee actor (321.078083ms)
✔ free_form supports invitation issuance, rejected, and terminal closure without an invitee actor (303.769084ms)
✔ free_form supports invitation issuance, expired, and terminal closure without an invitee actor (326.026167ms)
✔ free_form supports invitation issuance, revoked, and terminal closure without an invitee actor (294.750791ms)
ℹ tests 53
ℹ suites 0
ℹ pass 53
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 21836.259042
```

### node --test tests/repository-surface-policy.test.mjs

Exit code: 0.

```text
ACTOR_REGISTRY_DRIFT_CHECK actors=3 scope=dirty-tree normalized=true disjoint=true
✔ actor registry dirty-tree drift is detected and actor-owned prefixes are normalized and disjoint (27.596375ms)
✔ registry drift check passes when a clean checkout committed materially wrong registry bytes (125.487083ms)
✔ actor prefix comparison resolves symlinks and case-folds Unicode-normalized identities (2.117875ms)
REPOSITORY_SURFACE_POLICY tracked=1266 actor_rule=true drift_rule=true shared_rule=true unaccounted=0
✔ tracked repository paths are covered only by explicit written surfaces (26.330041ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 225.30925
```

### node_modules/.bin/eslint packages/git-adapter/src/cli.mjs tests/sdk-package.test.mjs tests/helpers/cli-help-contract.mjs

Exit code: 0.

```text

```

### git diff --check

Exit code: 0.

```text

```

### npm run engram -- --help

Exit code: 0.

```text

> engramport@0.1.0 engram
> node scripts/engram --help

EngramPort Git

Commands (each accepts --help without reading or writing a project):
  init --actor SLUG --kind human|agent [--project SLUG] [--mode free_form|strict_relay]
  verify
  inbox --actor SLUG
  thread declare --thread SLUG --mode MODE [--coordinator SLUG]
  welcome verify --package DIRECTORY
  setup compile --file FILE
  setup dry-run --file FILE --temp-dir DIRECTORY
  append --actor SLUG --thread SLUG --type TYPE --body FILE [--id UUIDV7] [--reply UUIDV7] [--next SLUG|null] [--artifacts REF,...] [--schema-version 0|1] [--bounded-context JSON_FILE] [--completion-criteria JSON_FILE] [--criteria-results JSON_FILE]

JSON_FILE is a filename, resolved from the current directory, containing a JSON array.
The following are shapes with illustrative values; replace IDs, paths and digests.
--bounded-context JSON_FILE (handoff, 1-32 references):
  [{"type":"event","event_id":"UUIDV7"},{"type":"artifact","ref":"artifacts/ACTOR/FILE#sha256=DIGEST"}]
--completion-criteria JSON_FILE (handoff, 1-32 criteria):
  [{"id":"receipt-written","statement":"Write a receipt.","evidence_classes":["artifact"]}]
--criteria-results JSON_FILE (completion, one entry for every parent criterion):
  [{"criterion_id":"receipt-written","status":"satisfied","evidence":[{"type":"artifact","ref":"artifacts/ACTOR/FILE#sha256=DIGEST"}]}]
References may be event or artifact objects as shown above. DIGEST is 64 lowercase SHA-256 hex characters.
evidence_classes is a unique nonempty subset of ["event","artifact"].
status is "satisfied", "unmet", or "blocked". evidence contains 1-32 references of permitted classes.
--artifacts takes comma-separated digest-bound refs directly, not a JSON filename.
--body takes a UTF-8 text filename. Handoffs require both context and criteria files.
Completion evidence must cover every parent criterion exactly once; do not mark unperformed work satisfied.
```

### npm run engram -- append --help

Exit code: 0.

```text

> engramport@0.1.0 engram
> node scripts/engram append --help

EngramPort Git

Commands (each accepts --help without reading or writing a project):
  init --actor SLUG --kind human|agent [--project SLUG] [--mode free_form|strict_relay]
  verify
  inbox --actor SLUG
  thread declare --thread SLUG --mode MODE [--coordinator SLUG]
  welcome verify --package DIRECTORY
  setup compile --file FILE
  setup dry-run --file FILE --temp-dir DIRECTORY
  append --actor SLUG --thread SLUG --type TYPE --body FILE [--id UUIDV7] [--reply UUIDV7] [--next SLUG|null] [--artifacts REF,...] [--schema-version 0|1] [--bounded-context JSON_FILE] [--completion-criteria JSON_FILE] [--criteria-results JSON_FILE]

JSON_FILE is a filename, resolved from the current directory, containing a JSON array.
The following are shapes with illustrative values; replace IDs, paths and digests.
--bounded-context JSON_FILE (handoff, 1-32 references):
  [{"type":"event","event_id":"UUIDV7"},{"type":"artifact","ref":"artifacts/ACTOR/FILE#sha256=DIGEST"}]
--completion-criteria JSON_FILE (handoff, 1-32 criteria):
  [{"id":"receipt-written","statement":"Write a receipt.","evidence_classes":["artifact"]}]
--criteria-results JSON_FILE (completion, one entry for every parent criterion):
  [{"criterion_id":"receipt-written","status":"satisfied","evidence":[{"type":"artifact","ref":"artifacts/ACTOR/FILE#sha256=DIGEST"}]}]
References may be event or artifact objects as shown above. DIGEST is 64 lowercase SHA-256 hex characters.
evidence_classes is a unique nonempty subset of ["event","artifact"].
status is "satisfied", "unmet", or "blocked". evidence contains 1-32 references of permitted classes.
--artifacts takes comma-separated digest-bound refs directly, not a JSON filename.
--body takes a UTF-8 text filename. Handoffs require both context and criteria files.
Completion evidence must cover every parent criterion exactly once; do not mark unperformed work satisfied.
```

## Full packed walkthrough transcript

The script is extracted from README.md by the test. bash -evx -o pipefail preserves each command and its expansion, stops on command failure, and records stdout separately. The empty starting directory is asserted before execution. The packing destination and cache are temporary. The tarball digest was measured with shasum before temporary cleanup.

```text
Packed with npm pack --silent --json --cache <temporary-cache> --pack-destination <temporary-directory> in packages/sdk.
shasum -a 256: 5ad320b4c10132032b5db0fd9b4fdfb6dab6b3e02e7ab4d5fc4c25fd85737d03  /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-readme-kTPRO8/engramport-sdk-0.4.0.tgz
Empty starting directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-readme-kTPRO8/empty
ENGRAM_SDK=/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-readme-kTPRO8/engramport-sdk-0.4.0.tgz
npm_config_offline=true
npm_config_cache=/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-readme-kTPRO8/cache
Command: bash -evx -o pipefail (stdin is the three README sh blocks, unchanged)
Exit: 0

STDERR (verbatim commands and shell trace):
set -eu
+ set -eu
ENGRAM_SDK="${ENGRAM_SDK:-@engramport/sdk}"
+ ENGRAM_SDK=/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-readme-kTPRO8/engramport-sdk-0.4.0.tgz
npm install --prefix tools --ignore-scripts --no-audit --no-fund "$ENGRAM_SDK"
+ npm install --prefix tools --ignore-scripts --no-audit --no-fund /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-readme-kTPRO8/engramport-sdk-0.4.0.tgz
mkdir my-project
+ mkdir my-project
cd my-project
+ cd my-project
engram() { ../tools/node_modules/.bin/engram "$@"; }
engram init --actor me --kind human --project my-project --mode strict_relay
+ engram init --actor me --kind human --project my-project --mode strict_relay
+ ../tools/node_modules/.bin/engram init --actor me --kind human --project my-project --mode strict_relay
mkdir -p events/builder artifacts/builder
+ mkdir -p events/builder artifacts/builder
cat > actors/builder.yaml <<'YAML'
schema_version: 0
slug: builder
display_name: Local Builder
kind: agent
provider: local
capabilities: [implementation]
event_directory: events/builder
artifact_prefix: artifacts/builder
YAML
+ cat
touch events/builder/.gitkeep artifacts/builder/.gitkeep
+ touch events/builder/.gitkeep artifacts/builder/.gitkeep
engram verify
+ engram verify
+ ../tools/node_modules/.bin/engram verify
cat > artifacts/me/task.txt <<'TEXT'
Write a receipt saying: The local handoff reached builder.
TEXT
+ cat
TASK_DIGEST=$(shasum -a 256 artifacts/me/task.txt | cut -d ' ' -f 1)
++ shasum -a 256 artifacts/me/task.txt
++ cut -d ' ' -f 1
+ TASK_DIGEST=8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751
cat > artifacts/me/context.json <<JSON
[{"type":"artifact","ref":"artifacts/me/task.txt#sha256=$TASK_DIGEST"}]
JSON
+ cat
cat > artifacts/me/criteria.json <<'JSON'
[{"id":"receipt-written","statement":"Write a receipt saying: The local handoff reached builder.","evidence_classes":["artifact"]}]
JSON
+ cat
cat > artifacts/me/handoff.md <<'TEXT'
Read the bound task and write the requested receipt in your own artifact directory.
TEXT
+ cat
shasum -a 256 artifacts/me/task.txt
+ shasum -a 256 artifacts/me/task.txt
cat artifacts/me/context.json artifacts/me/criteria.json
+ cat artifacts/me/context.json artifacts/me/criteria.json
engram append --actor me --thread first-turn --type handoff --id 01a08651-0000-7000-8000-000000000001 --next builder --body artifacts/me/handoff.md --bounded-context artifacts/me/context.json --completion-criteria artifacts/me/criteria.json --artifacts "artifacts/me/task.txt#sha256=$TASK_DIGEST"
+ engram append --actor me --thread first-turn --type handoff --id 01a08651-0000-7000-8000-000000000001 --next builder --body artifacts/me/handoff.md --bounded-context artifacts/me/context.json --completion-criteria artifacts/me/criteria.json --artifacts artifacts/me/task.txt#sha256=8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751
+ ../tools/node_modules/.bin/engram append --actor me --thread first-turn --type handoff --id 01a08651-0000-7000-8000-000000000001 --next builder --body artifacts/me/handoff.md --bounded-context artifacts/me/context.json --completion-criteria artifacts/me/criteria.json --artifacts artifacts/me/task.txt#sha256=8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751
engram inbox --actor builder
+ engram inbox --actor builder
+ ../tools/node_modules/.bin/engram inbox --actor builder
cat events/me/*.md artifacts/me/task.txt
+ cat events/me/20260909T131730Z_01a08651-0000-7000-8000-000000000001.md artifacts/me/task.txt
shasum -a 256 artifacts/me/task.txt
+ shasum -a 256 artifacts/me/task.txt
test "$(shasum -a 256 artifacts/me/task.txt | cut -d ' ' -f 1)" = "$TASK_DIGEST"
++ shasum -a 256 artifacts/me/task.txt
++ cut -d ' ' -f 1
+ test 8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751 = 8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751
cat > artifacts/builder/receipt.txt <<'TEXT'
The local handoff reached builder.
TEXT
+ cat
RECEIPT_DIGEST=$(shasum -a 256 artifacts/builder/receipt.txt | cut -d ' ' -f 1)
++ shasum -a 256 artifacts/builder/receipt.txt
++ cut -d ' ' -f 1
+ RECEIPT_DIGEST=e0649546364fcdea05f316d011678392dfd303418d24659df52fa9821434f88e
cat > artifacts/builder/results.json <<JSON
[{"criterion_id":"receipt-written","status":"satisfied","evidence":[{"type":"artifact","ref":"artifacts/builder/receipt.txt#sha256=$RECEIPT_DIGEST"}]}]
JSON
+ cat
cat > artifacts/builder/completion.md <<'TEXT'
Read the bound task and wrote the requested receipt. The evidence is the digest-bound receipt.
TEXT
+ cat
cat artifacts/builder/receipt.txt artifacts/builder/results.json
+ cat artifacts/builder/receipt.txt artifacts/builder/results.json
shasum -a 256 artifacts/builder/receipt.txt
+ shasum -a 256 artifacts/builder/receipt.txt
engram append --actor builder --thread first-turn --type completion --reply 01a08651-0000-7000-8000-000000000001 --next null --body artifacts/builder/completion.md --criteria-results artifacts/builder/results.json --artifacts "artifacts/builder/receipt.txt#sha256=$RECEIPT_DIGEST"
+ engram append --actor builder --thread first-turn --type completion --reply 01a08651-0000-7000-8000-000000000001 --next null --body artifacts/builder/completion.md --criteria-results artifacts/builder/results.json --artifacts artifacts/builder/receipt.txt#sha256=e0649546364fcdea05f316d011678392dfd303418d24659df52fa9821434f88e
+ ../tools/node_modules/.bin/engram append --actor builder --thread first-turn --type completion --reply 01a08651-0000-7000-8000-000000000001 --next null --body artifacts/builder/completion.md --criteria-results artifacts/builder/results.json --artifacts artifacts/builder/receipt.txt#sha256=e0649546364fcdea05f316d011678392dfd303418d24659df52fa9821434f88e
engram verify
+ engram verify
+ ../tools/node_modules/.bin/engram verify
engram inbox --actor builder
+ engram inbox --actor builder
+ ../tools/node_modules/.bin/engram inbox --actor builder

STDOUT:

added 1 package in 133ms
engramport.yaml
actors/me.yaml
events/me/.gitkeep
artifacts/me/.gitkeep
✓ verified 0 events across 0 thread(s) and 2 actors
8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751  artifacts/me/task.txt
[{"type":"artifact","ref":"artifacts/me/task.txt#sha256=8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751"}]
[{"id":"receipt-written","statement":"Write a receipt saying: The local handoff reached builder.","evidence_classes":["artifact"]}]
events/me/20260909T131730Z_01a08651-0000-7000-8000-000000000001.md
events/me/20260909T131730Z_01a08651-0000-7000-8000-000000000001.md
---
schema_version: 1
id: 01a08651-0000-7000-8000-000000000001
thread: first-turn
from: me
type: handoff
occurred_at: 2026-09-09T13:17:30Z
in_reply_to: null
next: builder
content_sha256: 04e7fa35d7b8843efb4b98157eb8f475c9a152e7730da45974b4a41236a5f90b
intent_sha256: 120f2e751af0e33944ce84f58d3cd48c0fe5a211ba36b2017d7c964c3e5ea468
artifacts: [artifacts/me/task.txt#sha256=8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751]
bounded_context: [{"type":"artifact","ref":"artifacts/me/task.txt#sha256=8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751"}]
completion_criteria: [{"id":"receipt-written","statement":"Write a receipt saying: The local handoff reached builder.","evidence_classes":["artifact"]}]
---
Read the bound task and write the requested receipt in your own artifact directory.
Write a receipt saying: The local handoff reached builder.
8c09a1a195027f20b0a2f71cb2e0b828571b887c40ab7f5e6ece2eaa6a643751  artifacts/me/task.txt
The local handoff reached builder.
[{"criterion_id":"receipt-written","status":"satisfied","evidence":[{"type":"artifact","ref":"artifacts/builder/receipt.txt#sha256=e0649546364fcdea05f316d011678392dfd303418d24659df52fa9821434f88e"}]}]
e0649546364fcdea05f316d011678392dfd303418d24659df52fa9821434f88e  artifacts/builder/receipt.txt
events/builder/20260909T132424Z_01a08657-5017-73c1-a04e-53b1371f75c8.md
✓ verified 2 events across 1 thread(s) and 2 actors
No open events addressed to builder.
```
