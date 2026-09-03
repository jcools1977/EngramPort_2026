# F145 bounded-context delivery evidence

## Delivered behavior

- `packages/git-adapter/src/bounded-context.mjs` owns repository-safe context resolution.
- `packages/agent-c-supervisor/src/index.mjs` consumes that resolver for both schema-v1 `bounded_context` and legacy `artifacts:` references.
- Event references resolve to their canonical event body and are checked against `content_sha256` before delivery.
- Artifact references retain and enforce their `#sha256:` digest; the previous digest-discarding path is gone.
- Explicit `--context`, target-event, bounded-event, and artifact records share one canonical-path deduplication set.
- Every delivered record remains inside the existing credential scan and 1,000,000-byte context ceiling.

## Historical observation

The permanent `bounded-context-delivery` control builds the real review prompt for event `01a061fa-d7f1-7b9b-824d-185c792cd3e6`. The resulting prompt contains the body headed `Pre-flight: the verified builder subject` from bound event `01a054bf-8947-7931-9b3e-8beff07f01cf`. Rebuilding the same prompt with `bounded_context` removed does not contain that body.

## Refusal observations

| Property | Observed result |
| --- | --- |
| Unknown event id | `CONTEXT_EVENT_NOT_FOUND` |
| One-byte event-body change | `CONTEXT_DIGEST_MISMATCH` |
| Unaltered artifact | delivered |
| Altered bounded artifact | `CONTEXT_DIGEST_MISMATCH` |
| Altered legacy `artifacts:` reference | `CONTEXT_DIGEST_MISMATCH` |
| Context above one million bytes | `CONTEXT_TOO_LARGE` |
| Same event in explicit and bounded context | one `<repository-file>` block |

## Executed controls

`npm run agent-c:test` passed 22 supervisor tests. Its mutation runner killed all 20 mutations: the 13 existing supervisor mutations and seven F145 mutations covering delivery, missing-event refusal, event digest, bounded-artifact digest, legacy-artifact digest, size ceiling, and deduplication.

`npm run proof:verify` verified 465 events across 90 threads and three actors.

The first repository-wide `npm test` attempt passed proof, identity, counts, onboarding, ledger, SDK packaging, SDK runtime, second-builder, agent-c, spend, D2, and W1-6, then stopped because Docker Desktop was not running. OrbStack was started and the complete gate was rerun. The live W1-7 fixture observed all 10 vulnerable sinks, all 10 protected signing paths, and all six operation signatures, then failed its cleanup assertion because 244 anonymous OrbStack volumes remained. This is outside F145's bounded files and is reported as a repository-gate failure, not a full-suite pass. Every remaining non-Docker suite was executed explicitly and passed: report boundary, report R2, correspondent, welcome, setup, watch, session/OIDC, approval, dry-run, database lock, database static grants, dispatch, production build, and rendered HTML.

`git diff --check` passed. No schema, historical event, deployment, website copy, credential storage, or production data changed.
