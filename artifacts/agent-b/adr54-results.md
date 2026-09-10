# ADR 0054 implementation results

Handoff: `01a08c51-c100-7846-86b8-2e0188bc270d`, thread `adr-0054-implementation`.
Actor: agent-b, Codex Builder. Base commit: `e4ab9464c64d17acda9f954c3e979756e2a6c101`.

## Result

Implemented schema v2 beside an untouched v1. V2 results require the four-member
environment with nullable structured version information. Repeated criterion
observations retain separate evidence and environments. The writer selects v2
for environment-bearing completions and corrections, and preserves v1 appends
and historical intent hashes. V2 retry identity binds version and corrects.

Corrections use their own same-author, same-thread edge and leave the original
turn in the inbox in strict_relay, free_form, and coordinator_led. The verifier
rejects unknown targets, another author's event, correction chains, reply/next
edges on annotations, and replies to annotations. Reports preserve original
statuses and list corrections beside the originals.

The two named report modules had no existing criteria join in this checkout.
The implementation adds report-criteria.mjs, exposes generateCriteriaReport in
the correspondent, and includes its output in generateReportDraft. It joins by
handoff id and criterion id and retains all observations. Contested remains
until later observations agree in both pinned environments or an owner restates
the criterion. Empty results retain cannot-tell, separately from contested.

The minimal owner-restatement representation is an optional v2 criterion
`restates: {handoff_id, environment}` on a new handoff with the same criterion id
and its new statement. Verification binds it to the original handoff author.
The report marks the old criterion decided-by-owner and keeps its evidence.
This metadata and the deterministic occurred_at/id ordering are documented in
PROTOCOL.md and AGENTS.md. Observation time is excluded from environment identity.
Chronology and environment remain actor claims, not attested execution facts.

SDK manifest is 0.5.0. The bundle was rebuilt locally and the 28 v2 controls also
ran against its exported appendEvent and listInbox. Generated dist files retain
the repository's ignored-build-output convention. Their digests are recorded.
No package was published, and no v2 event was appended to the live log.

## Observed environment and preservation

`node -p 'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,observed_at:new Date().toISOString()})'`
reported Node v26.5.0, darwin, arm64 at 2026-09-10T17:28:11.600Z. The source tree
was dirty with this implementation, in a Git worktree with the log at its root.
Controls used disposable temporary scaffolds, never the live log.

`git diff --quiet -- events schemas/event-v1.schema.json` exited 0 before the
completion. `shasum -a 256 schemas/event-v1.schema.json` and
`git show HEAD:schemas/event-v1.schema.json | shasum -a 256` both returned
`d651f378077dc459fa697b0b0415e1945e13a2a0814702522654bdc5d2328bfe`.
`rg -n '^schema_version: 2$' events` found no matching live event.
`git diff --check` exited 0.

## Commands completed

All commands below exited 0. These are scoped suite results. The aggregate
`npm test` was not run. F160 identity history, Docker gates, and the OIDC runtime
skip were outside this handoff and were not repaired or recertified.

| Command | Observed result | Output |
| --- | --- | --- |
| `node --test tests/adr54.test.mjs` | 28 passed, 0 failed, 0 skipped | `artifacts/agent-b/adr54-controls.log` |
| `node tests/run-adr54-mutations.mjs` | executed=26 killed=26 survived=0 restored=0 | `artifacts/agent-b/adr54-mutations.log` |
| `ADR54_USE_BUNDLE=1 node --test tests/adr54.test.mjs` | 28 passed, 0 failed, 0 skipped against the rebuilt bundle | `artifacts/agent-b/adr54-sdk-v2.log` |
| `npm run proof` | 577 historical events verified; 53 tests passed | `artifacts/agent-b/adr54-proof.log` |
| `npm run completion:test` | 8 tests passed; F157 executed=5 killed=5 survived=0 | `artifacts/agent-b/adr54-completion.log` |
| `npm run withdrawal:test` | 25 passed, 1 conditional pre-fix test skipped in baseline; pre-fix runner 2 passed; mutations executed=15 killed=15 survived=0 | `artifacts/agent-b/adr54-withdrawal.log` |
| `npm run bctx:test` | 3 tests passed | `artifacts/agent-b/adr54-bctx.log` |
| `npm run report:test` | 54 tests passed | `artifacts/agent-b/adr54-report.log` |
| `npm run report:r2:test` | 8 tests passed | `artifacts/agent-b/adr54-report-r2.log` |
| `npm run report:correspondent:test` | 8 tests passed | `artifacts/agent-b/adr54-correspondent.log` |
| `npm run sdk:build` | SDK 0.5.0 built successfully, unpublished | `artifacts/agent-b/adr54-sdk-build.log` |
| `npm run sdk:test` | SDK rebuilt; 6 tests passed | `artifacts/agent-b/adr54-sdk.log` |
| `npm run sdk:package:test` | 5 tests passed; SDK init mutations executed=10 killed=10 restored=10; help controls killed=3 | `artifacts/agent-b/adr54-sdk-package.log` |
| `npm run sdk:buildable` | 3 tests passed | `artifacts/agent-b/adr54-sdk-buildable.log` |
| `node --test tests/schema-v1-status.test.mjs` | 4 tests passed; includes historical v1 and v2 vocabulary agreement | `artifacts/agent-b/adr54-schema-status.log` |
| `npm run proof:verify` | 577 events across 119 threads and 3 actors verified before completion | `artifacts/agent-b/adr54-historical-verify.log` |

## Criteria results

- `environment-required`: **satisfied**. Source and bundle append controls observe omission, malformed time, each missing member, extra member, structured version, text types, explicit nulls, and v1 compatibility. Environment guard mutations accept the otherwise forbidden inputs.
- `contested-derived`: **satisfied**. Report output observes opposite accepted v2 observations, one-environment persistence, both-environment clearing, owner restatement, separate handoffs, and cannot-tell. Handoff-key removal conflates the two handoffs and is killed; clearing and owner mutations are also killed.
- `correction-edges`: **satisfied**. Append and independent verifyLog candidate controls observe own annotations and author, unknown-target, chain, thread, parent, and next refusals. Guard removal admits forbidden annotations. A second ordinary root is refused; removing the root guard admits it.
- `retry-identity-v2`: **satisfied**. appendEvent reuses canonical same-id v2 intent and collides on changed corrects or schema_version. Removing corrects from canonical intent causes reused and is killed.
- `correction-invisible-to-inbox`: **satisfied**. listInbox retains the addressed original and excludes its annotation in all three modes; appendEvent accepts the recipient reply after correction.
- `report-shows-both`: **satisfied**. generateCriteriaReport and generateReportDraft output list the correction beside the unmet original. Removing the original result in a replacement mutation is observed and killed.
- `schema-agrees`: **satisfied**. Real appended v2 completions, corrections, and restatement handoffs validate with Ajv draft 2020-12 plus formats and verifyLog. The existing F157 one-definition control now compares v2 types and statuses; removing correction from the v2 schema kills it.
- `suite-green-with-mutations`: **satisfied**. The scoped commands above completed; the v2 runner reports executed=26 killed=26 survived=0 restored=0. The historical 577-event log verifies unchanged before the single v1 completion.

## Evidence SHA-256

Produced by `shasum -a 256` over the listed files.

```text
4105b677f7f428db3972d9055ae3009f6c18f006d224d1b9cd7493e74b49146a  artifacts/agent-b/adr54-bctx.log
27a623ac9ac3bf283a80aee7c2ab2e00333dd80fc99c43baa0b6d78fe09cb5dc  artifacts/agent-b/adr54-completion.log
c9b405ac5926cb5cb2a0376e83cf901aa0a28d9eac347db6ca7b3edf15e9e1cc  artifacts/agent-b/adr54-controls.log
3b5d8721db2d452628f18bd5bf5024eb41b49a6f8ef90ca1a4515158d32b34bd  artifacts/agent-b/adr54-correspondent.log
dcd981b03653663016ffe1733a30d0c3cf4cd317651b47ee48458d4cb9dca88e  artifacts/agent-b/adr54-historical-verify.log
32897fe874ca9d3ffe647a7009819991056a0c92fa63c98bc922b3eb3e6ff110  artifacts/agent-b/adr54-mutations.log
c90895f9826e73b7ad716d31fd34862ade3a88d1a2fd0e342db8366773b585c2  artifacts/agent-b/adr54-proof.log
69a5de130d940ad60dadf807e0328c04d452c570082cbd07f0414745359009a1  artifacts/agent-b/adr54-report-r2.log
81b6de6cfa0852b1c3798516658b9f675037903603ee2abbe3547019223a0838  artifacts/agent-b/adr54-report.log
285405d0c047ce89fee799a40b0d8b8e360079de86684bb5143546b6b2f1b1f2  artifacts/agent-b/adr54-schema-status.log
93164dc5e018651a86dc4cf9d84139f32f1bcb68201382c417bce707030606b5  artifacts/agent-b/adr54-sdk-build.log
21890adb2871a86e095e9d2b6dd4f556299574513914ee38d1482331b436814b  artifacts/agent-b/adr54-sdk-buildable.log
122ea7e06890e88e0df647becfe261efbd26ce805f92f3981e9d9ec7bac9cb1d  artifacts/agent-b/adr54-sdk-package.log
558506408a8d6de8fadd582c7b7acd863d24cd48eb635ec42d7cec910be64b0d  artifacts/agent-b/adr54-sdk-v2.log
8cdd86e9ca4e7281fbce808122274976a913a2b9aad6e645227b3ea30247b210  artifacts/agent-b/adr54-sdk.log
98e4f3e3ff4c2af6ebdf584d6370f45223f6c4b0c5751a217d5ec22bb2a11112  artifacts/agent-b/adr54-withdrawal.log
1114b4c6c3a11c55aa0cddc07bed8c498bc97fb0a91c65fe1eb4cba1a3c0ec6d  artifacts/agent-b/adr54-build-digests.txt
```
