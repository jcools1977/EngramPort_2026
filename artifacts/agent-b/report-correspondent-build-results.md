# Re:PORT correspondent build results

Parent handoff: `01a0447c-8cf9-7e7e-be78-3b1736a52f32`

## Bounded implementation

- Added a deterministic correspondent generator at `packages/git-adapter/src/report-correspondent.mjs` without changing the accepted R1/R2 report boundary, evidence assembly, generated-evidence exclusion, or unchanged-source path.
- Added `npm run report:draft`, which reads a reviewed claim manifest and the agent-a-maintained `docs/report/findings-status.json` registry, verifies the complete canonical Git v0 log, and emits Markdown to stdout.
- Added the inert draft surface `artifacts/agent-b/report-drafts/engramport-experiment-lab-report.draft.md`. No app route, site copy, or publisher was added.
- The claim manifest rejects unknown fields including reviewer callbacks. The generator neither imports Agent C nor accepts a context sink, so ADR 0042's reviewer-cold boundary stays intact.
- Every claim requires a canonical event UUID plus an artifact path and SHA-256 registered by that event. A missing event and an unregistered digest both fail closed.
- A claim with a `finding_id` is refused unless agent-a's registry marks it `fixed`; a fixed mark used by a claim must reference a canonical agent-a event. F108, F111, and F113 begin `unfixed`; F120 begins `fixed`.
- Corrections, reversals, and failures render before successes at the same heading depths. A manifest containing no failure-class claim is refused as `REPORTING_DEFECT_NO_FAILURES`.
- Draft generation sets `published: false`. The CLI refuses `--publish`. Publication preparation requires DeVere, an exact draft digest, and an approval reference, and still returns `published: false`; there is no publication sink.

Draft SHA-256: `0ecd2f2dc4a2b861468f0b5c76e1d7799ffddda3b7969cc59ff3696ee36cddf3`.

## Discriminating controls

The report suite contains six controls:

1. checked-in traced draft generation and ordering;
2. unfixed-finding refusal plus a fixed-status positive mutation;
3. absent-event and mismatched-artifact trace refusals;
4. triumph-only report refusal;
5. Agent C reviewer-field refusal;
6. missing and mismatched digest-bound publication approval refusals.

The canonical mutation harness removes the `REPORT_UNFIXED_FINDING_GUARD`. The mutated module accepts the unfixed F111 claim and the named test fails. The shipped module and restored rerun pass:

```text
REPORT_UNFIXED_FINDING_GUARD baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=130)
```

`executed=` moved from the observed baseline 129 to 130 for this one new source mutation.

## Verification

- `npm test`: exit 0, including proof, 54 R1 report tests, 8 R2 tests, 6 correspondent tests, live canary, build, and rendered HTML controls.
- `bash scripts/run-d1-mutation-harness`: exit 0; `executed=130`.
- `node scripts/generate-report-draft --publish`: exit 1 with `PUBLICATION_NOT_IMPLEMENTED`; no publication occurred.
- Generated stdout exactly matches the checked-in draft surface.
- `npm run lint`: exit 0.
- `git diff --check`: exit 0.
- `npm run proof:verify` before event append: 387 accepted events, 61 threads, 3 actors.

## Authority and disposition

This output is generated, noncanonical, and unpublished. It carries no implementation, assignment, approval, memory-acceptance, architecture-vote, or project-fact authority. Publication remains a separate DeVere action under ADR 0036. No SDK, protocol, enrollment, Agent C review, app page, site copy, or outward publication changed.
