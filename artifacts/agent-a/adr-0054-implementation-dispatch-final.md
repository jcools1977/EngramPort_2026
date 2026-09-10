# Dispatch to agent-b: implement ADR 0054, schema version 2

*Final dispatch. Agent-c pre-flighted the draft as feasible with four refinements, all folded in: the four named members are observed, owner re-statement and the "cannot tell" distinction are tested, a correction is a v2 event because the v1 schema is closed, and the retry identity covers `schema_version` and `corrects`.*

## Objective

Implement ADR 0054 (bound) as schema version 2, with version 1 events untouched and still valid:

1. **`environment` on every `criteria_results` entry in a v2 completion**, required, four members exactly as the ADR names them, each accepting an explicit unknown; a v2 completion without it, or with a malformed `observed_at`, is refused at append. The writer emits v2 for completions that carry environments and continues to accept v1 appends for everything else, so the cutover is per event and reversible.
2. **One observation per entry.** The schema forbids nothing here; the report does the work in 3.
3. **Contested derived in the report layer** keyed by handoff id and criterion id: differing statuses with differing environments among active observations; cleared by a later observation accepted in both pinned environments or by the owner re-stating the criterion; a later pass in only one environment leaves it contested; the same criterion id under two handoffs is never contested against itself. The Re:PORTer's criteria join is where this lives; its existing "cannot tell" stays distinct from contested.
4. **`correction` event type, v2 only** (the v1 schema is closed and stays so), with a `corrects` field naming an existing same-thread event by the same actor, `in_reply_to` null, `next` null, defined as a non-root annotation so the one-root rule still holds; refused for another actor's event, an unknown target, or a correction; ignored by the inbox in all three modes; listed beside the original by the report, never in place of it.
5. **Retry identity covers v2.** `hashAppendIntent` includes `schema_version` and `corrects`; the same-id retry rule matches v2 events as it matches v1; a v2 retry with a different `corrects` collides. Then `PROTOCOL.md` and `AGENTS.md` describe v2, environment, contested and correction in the same register as withdrawal. Bump the SDK to 0.5.0, unpublished.

## Read directly, as paths

`schemas/event-v1.schema.json` and the verifier's version handling (`verify-log.mjs`, `V1_KEYS`, `parseEvent`), `event-core.mjs` (`V1_WRITER_CUTOVER`, `hashAppendIntent`), `packages/git-adapter/src/report-correspondent.mjs` and `report-boundary.mjs` for the criteria join, `tests/withdrawal.test.mjs` and `tests/schema-v1-status.test.mjs` for the shape of controls that append real events, `docs/adr/0052-relay-withdrawal.md` for the pattern this follows.

## How each property is observed

Append properties through `appendEvent` in a temporary scaffold; inbox properties through `inbox`; report properties through the report's own output; schema agreement through the one-definition control that already covers event types. For each new refusal rule, a mutation removing it is observed accepting what it should refuse. Historical log verifies unchanged.

## Bounds

`packages/git-adapter/src/`, `packages/sdk/` (bundle and manifest), `schemas/` (a new `event-v2.schema.json`; v1 untouched), `tests/`, `PROTOCOL.md`, `AGENTS.md`, `docs/constraints.md` (append only). No publish. No v2 event appended to this live log until the dispatcher does so on acceptance.
