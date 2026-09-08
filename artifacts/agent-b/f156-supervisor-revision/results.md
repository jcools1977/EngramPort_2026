# F156 supervisor revision results

Agent: agent-b, Codex Builder. Date: 2026-09-08.
Thread: f156-artifact-scan.
Handoff: 01a082a8-187f-74ee-b71f-c0c117d063ab.
Starting commit: bc198f2da9cd2bd5c3a4a72ea0518652c3ca889d.

## Criteria results

| Criterion id | Status | Observed evidence |
| --- | --- | --- |
| one-constant | satisfied | Both consumers import MAX_CONTEXT_BYTES from the git-adapter credential boundary. npm run scan:append:test passes the normal baseline and the baseline with the shared limit lowered to 100,000. The append-restates-limit and supervisor-restates-limit mutations fail their behavioral controls and are killed. |
| supervisor-controls-live | satisfied | npm run scan:append:test exits 0 with 10 passing controls, zero skipped, and F156_MUTATIONS executed=15 killed=15 survived=0. The direct test run loads repository source, including packages/agent-c-supervisor/src/index.mjs. All three supervisor mutations execute. |
| agent-c-suite-still-green | satisfied | npm run agent-c:test exits 0 with 22 passing controls, zero skipped, and 20 AGENT_C_MUTATION lines reporting killed. |

## Applied change

Applied the digest-verified prepared supervisor proposal to packages/agent-c-supervisor/src/index.mjs. It imports MAX_CONTEXT_BYTES instead of declaring its own number, scans the final prompt using raw UTF-8 bytes, and preserves the detector's bytes and limit in size errors. The adapter already imports the same constant for append scans.

Removed F156_APPEND_ONLY from package.json, the control skip condition, and the mutation filter. The live supervisor-shared-limit and supervisor-credential controls now run in the normal scan:append:test command. Mutation copies are made from repository source to isolate deliberate changes; the generated proposal tree is no longer needed for these checks.

Only four shared files changed: package.json, packages/agent-c-supervisor/src/index.mjs, tests/append-scan-policy.test.mjs, and tests/run-append-scan-mutations.mjs.

## Commands and observations

- npm run proof:verify initially exited 0 and verified 485 events across 97 threads and three actors. It returned the same result after implementation, before appending the completion.
- npm run engram -- inbox --actor agent-b listed the requested revision and two other handoffs. Only the requested revision was handled.
- npm run scan:append:test completed with exit 0. The 10 direct controls passed, including supervisor-shared-limit and supervisor-credential. Its mutation runner reported CONTROL production=passed and CONTROL shared-limit-lowered-to-100000=passed. The lowered-limit baseline runs both consumer paths. A literal 1,000,000 restored in either consumer fails its control at the lowered budget.
- The same command reported append-restates-limit killed at executed=12, supervisor-restates-limit killed at executed=13, supervisor-truncated killed at executed=14, and supervisor-size-details-lost killed at executed=15. Final count: executed=15 killed=15 survived=0.
- npm run agent-c:test completed with exit 0, 22 passing controls, and all 20 existing mutations killed. The count was also checked from the complete log with a Python regular expression matching AGENT_C_MUTATION lines ending in =killed.
- git diff --check exited 0 after the change.

The supervisor controls use a stubbed provider. These are local observations, not evidence of a live model call or deployment. No full npm test run was performed for this revision.

## Bound references and prior evidence

Opened the complete prior completion at events/agent-b/20260908T201209Z_01a082a6-4353-7e21-bf56-59c89d9645fa.md and its results artifact, then reread the complete revision including completion_criteria and bounded_context. Both bounded references resolve to those files.

shasum -a 256 artifacts/agent-b/f156-scan-results.md returned 0cd438a78419d6898b149cf48ba41650fa892fa390fd50bc53cc21af2f0ebd6c, matching the revision and prior completion. shasum -a 256 artifacts/agent-b/f156-scan/SHA256SUMS returned 6d275221a85b304bb84727a3db2840c00546480d507ca054232dcbeb8ff5f5ee, matching the prior artifact. shasum -a 256 -c artifacts/agent-b/f156-scan/SHA256SUMS reported every entry OK, including the prepared proposal and prior gate logs.

The prior artifact records the following expected failures. They were not rerun or repaired in this revision:

- F160 identity mismatches: npm run identity:test reported commits 502ab6f and 2f033ec with agent authors and luke@covenantsystems.ai as signer.
- OIDC native crash: npm run session:test reported workspace-oidc-durable.test.mjs failing with the native Node assertion (env_->execution_async_id()) == (0).
- Docker refusals: npm run w1-7:test, npm run db:test, and npm run kms:test reported Docker socket permission denial; kms:test also reported KMS_UNAVAILABLE.
- Lint error: npm run lint reported the existing unused readdirSync import at tests/completion-status.test.mjs:19.

These historical failures remain outside this handoff. Their status is not converted into a full-suite passing claim.

Read schemas/event-v1.schema.json, including $defs.result, before creating the criteria results. Each entry has criterion_id, status, and artifact evidence. All three statuses are satisfied based on the completed commands above.

## Current command log digests

- artifacts/agent-b/f156-supervisor-revision/scan-append-test.log#sha256=d49511719fee0466aff33e4f7279c70edd8ebeb56ab68d3e6499bed97a549895
- artifacts/agent-b/f156-supervisor-revision/agent-c-test.log#sha256=3538b0bf3dee647c3e19fc76356b64d8f11c07e334e707625bfb1e20667a532d
