# F156 append scan result

Agent: agent-b, Codex Builder. Date: 2026-09-08.
Handoff: `01a08286-d08c-776e-afcc-ca823df4231a`, thread `f156-artifact-scan`.
Starting commit: `6ecdd5703b88b88a4cde78f237b07bbf992f3e18`.

## Criteria results

| Criterion id | Status | Observed evidence |
| --- | --- | --- |
| clean-large-artifact-accepted | satisfied | Real append accepted a clean 96,000-byte artifact. The same control with the exact pre-fix event-core refused with CREDENTIAL_INPUT_REFUSED. Mutation old-default killed, executed=1. |
| size-is-size | satisfied | Exactly 1,000,000 bytes accepted; 1,000,001 refused with SCAN_INPUT_TOO_LARGE, bytes=1000001, limit=1000000. Size-code, byte-count, and limit mutations killed, executed=2 through executed=4. |
| credential-past-old-boundary | satisfied | Synthetic credential begins after byte 96,000 and is refused with CREDENTIAL_INPUT_REFUSED. Artifact-scan removal and truncation mutations killed, executed=5 and executed=8. |
| one-constant | blocked | Append imports MAX_CONTEXT_BYTES from credential-boundary.mjs. Supervisor still declares its own constant. Required supervisor edits conflict with the handoff's location qualifier; clarification was requested and remains unanswered. The complete proposed change is prepared and tested separately. |
| suite-green-with-mutations | unmet | All 12 implemented append mutations are killed. Non-Docker gates are not all passing: historical identity mismatches, native OIDC crash, and existing lint failure remain. Docker refusal was observed. Proposed supervisor mutations are not claimed as implemented. |

## Implemented behavior

`event-core.mjs` sends body, artifact text, and structured envelope through one scan helper. `MAX_CONTEXT_BYTES` is 1,000,000 because this matches the supervisor's admitted context budget. The rationale is next to the exported constant. The budget is per scanned input, not a total event-plus-artifact budget.

Text is measured in UTF-8 bytes before JSON quoting. Envelopes are measured by their JSON representation, then walked structurally for credentials. This avoids hiding a credential behind an escaped newline in a serialized envelope. Existing detector callers retain their default 64 KB serialized-record profile. The detector's size result now carries `bytes` and `limit`; append exposes those fields and both numbers in its SCAN_INPUT_TOO_LARGE message. Refusals leave no event file.

`tests/wizard-w1-6.test.mjs` updates the existing N8 mutation target for the added size fields. It retains the same guard-removal behavior. `package.json` adds `scan:append:test` and includes it in the normal test chain. No historical event, schema, registry, or supervisor source was edited.

## Commands and observations

`npm run proof:verify` initially verified 483 events across 97 threads and three actors. `npm run engram -- inbox --actor agent-b` returned the requested handoff and two others; only this handoff was taken.

The bound event `events/agent-b/20260903T185325Z_01a0689e-623f-79e7-8928-2319011b8df7.md` and its complete artifact were opened. `shasum -a 256 artifacts/agent-b/bounded-context-delivery-results.md` returned `b0b404649992c66df94c81488566e30ba11f17e5a298d4d8a628461212cc18ba`, matching the event. `git show a1dd3de` was read for F150's actual fix. The prior result is historical evidence, not current gate evidence.

`npm run scan:append:test` completed with eight passing controls, two explicitly skipped supervisor proposal controls, and `F156_MUTATIONS executed=12 killed=12 survived=0`. The runner executes a clean baseline and a lowered shared limit of 100,000 bytes before mutations. A restated append limit fails the lowered-limit behavioral test. The exact pre-fix event-core is obtained with `git show 6ecdd5703b88b88a4cde78f237b07bbf992f3e18:packages/git-adapter/src/event-core.mjs` and actually executed, not inspected for a string.

The mutation mapping, with cumulative executed count, is:

1. old-default: large clean artifact acceptance.
2. size-as-credential: distinct size code.
3. missing-byte-count: diagnostic byte count.
4. missing-limit: diagnostic limit.
5. artifact-scan-removed: credential beyond the old boundary.
6. body-scan-removed: body credential beyond the old boundary.
7. envelope-scan-removed: envelope credential beyond the old boundary.
8. scan-truncated: full artifact coverage.
9. serialized-instead-of-utf8: exact-limit escaped and multibyte text.
10. body-size-bypassed: oversized body refusal.
11. envelope-size-bypassed: oversized envelope refusal.
12. append-restates-limit: runtime response to a changed named constant.

`node artifacts/agent-b/f156-scan/run-gates.mjs` executed every command in the npm test chain individually, followed by db:test, kms:test, and lint, so an early failure did not suppress later observations. Final results are recorded in `f156-scan/gates.json`: 37 completed commands, 31 exit 0 and six exit 1. Each command has its own full log in the same directory.

The six nonzero results are:

- `npm run identity:test`: F160, 502ab6f and 2f033ec name agent authors but carry luke@covenantsystems.ai as signer. No history rewrite was attempted.
- `npm run session:test`: 32 passing controls and one failed test file, `workspace-oidc-durable.test.mjs`, with the native Node assertion `(env_->execution_async_id()) == (0)`. That file is unchanged.
- `npm run w1-7:test`: three controls pass; the canary fails because access to the Docker socket is denied.
- `npm run db:test`: Docker socket permission denied.
- `npm run kms:test`: Docker socket permission denied and KMS_UNAVAILABLE.
- `npm run lint`: pre-existing unused `readdirSync` import at `tests/completion-status.test.mjs:19`. That file is unchanged.

All other listed gates completed successfully, including proof, SDK packaging/build/runtime, supervisor tests and its 20 mutations, W1-6, production build, and rendered HTML. `npm test` itself stopped at identity:test. It is not reported as green. `git diff --check` passed before the result was written.

## Supervisor proposal and remaining authority

The handoff says `packages/agent-c-supervisor/src/` may change "only if the constant moves there." Its objective also requires both callers to import one named limit. Moving the constant into git-adapter preserves the adapter's standalone dependency direction, but requires changing the supervisor import despite that qualifier. A scope clarification was requested. No response was treated as authorization.

`f156-scan/proposed-supervisor-index.mjs` is the concrete proposed replacement, prepared from the unchanged supervisor source. It imports the adapter constant, removes the local number, uses the same raw UTF-8 scan profile for the final prompt, and preserves size fields in the supervisor error. It is not installed in packages/.

`node artifacts/agent-b/f156-scan/prepare-supervisor-proposal.mjs` writes that proposal and builds a temporary source tree. With F156_SOURCE_ROOT set to that generated tree, `node --test tests/append-scan-policy.test.mjs` passes all ten controls and `node tests/run-append-scan-mutations.mjs` reports `executed=15 killed=15 survived=0`. The additional mutations are supervisor-restates-limit (13), supervisor-truncated (14), and supervisor-size-details-lost (15). Lowering the shared constant to 100,000 bytes passes the baseline; either consumer restating 1,000,000 fails its actual call-path control. These observations belong to the proposal only. Per-record supervisor scanning and its existing context errors are outside the applied append correction.

## Release preparation

Recommended next SDK release: 0.3.1, from the currently declared 0.3.0. Proposed release note: "Append scans clean evidence up to 1,000,000 UTF-8 bytes and reports oversized input with a distinct size error and explicit byte count and limit. Credentials after the former 64 KB boundary remain refused."

The shared-limit criterion must be resolved before presenting full F156 closure. The SDK manifest and lockfile are outside this handoff's package-file bounds, so no version file was edited. No package was published and no push was attempted.

## Evidence inventory

The command logs, proposal, and reproduction runner are under `artifacts/agent-b/f156-scan/`. Their SHA-256 inventory is `artifacts/agent-b/f156-scan/SHA256SUMS`, with digest `6d275221a85b304bb84727a3db2840c00546480d507ca054232dcbeb8ff5f5ee`.

`schemas/event-v1.schema.json` was read before writing criteria results. Its result object requires criterion_id, status, and evidence references. Its status remains constrained to satisfied, the known F157 mismatch. The active verifier accepts satisfied, unmet, and blocked. This completion uses the required object shape and reports the actual outcomes without editing the schema or relabeling missing work.
