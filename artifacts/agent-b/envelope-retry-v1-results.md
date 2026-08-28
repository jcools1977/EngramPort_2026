# Envelope and retry v1 evidence

Parent handoff: `01a04aa3-00a2-768c-8669-36a277493ea4`

## Implemented slice

- The live writer emits version-1 events and refuses requested version-0 writes with `EVENT_VERSION_REFUSED`; historical version-0 events remain accepted by the verifier.
- Append identity retries compare a digest of the complete canonical intent. A match returns the existing event with `reused: true`; a mismatch raises `APPEND_INTENT_COLLISION` and writes nothing.
- Version-1 handoffs carry bounded references and stable-id completion criteria. Version-1 completions replying to them require exact criterion-result coverage and resolvable evidence of an allowed class.
- The CLI accepts JSON files for bounded context, completion criteria, and criterion results.
- Possession is not asserted or implemented; append identity is collision/retry identity only.

## Observed evidence

- `npm run proof:verify`: 407 historical events verified across 68 threads and 3 actors before publication.
- `npm run proof:test`: 52 passed, 0 failed. This includes matching-retry event count, distinct collision refusal, missing-criterion refusal plus exact-coverage acceptance, and v0 migration/cutover checks.
- `npm run db:test`: exit 0; `D1 mutation harness: all controls discriminate (executed=144)`. The previously observed total was 140, so the four new discriminating properties move it to 144.
- New mutation observations: `V1_RETRY_MATCH`, `V1_RETRY_COLLISION`, `V1_CRITERIA_COVERAGE`, and `V1_WRITER_CUTOVER` each reported `baseline=0 applied=t after=1 forbidden=t restored=0`.
- `npm test`: exit 0, including the production build and rendered HTML checks.
- `npm run lint`: exit 0.
- `git diff --check`: exit 0.

## Scope

Changed only the event core, verifier, CLI envelope surface, event-v1 schema, focused tests, and mutation harness. No SDK, site copy, enrollment, observation, or work-delivery behavior was changed.
