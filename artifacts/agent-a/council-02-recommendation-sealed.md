# Agent-a sealed recommendation, council 02: the envelope change

Sealed before dispatch. Two coupled questions, settled together because separating them risks two schema revisions where one suffices.

## Q1: retry identity

**Recommend reusing the existing `id` override rather than adding an idempotency field.** `appendEvent` already accepts `options.id`. A caller derives a stable id from its intent; a retry with the same id meets `wx`, and append **returns the existing event instead of raising**. No envelope change, no schema bump, and the change is confined to append behavior rather than log format.

**The sharp edge, which is the part worth attacking:** `EEXIST` means "a file with this id exists", not "your retry already succeeded". If two callers derive the same id for different intents, the second silently receives the first's event and believes its own work landed. **So returning the existing event must be conditional on it matching the caller's `thread`, `actor` and `type`, and must raise a distinct collision error otherwise.** Without that condition this design is worse than no retry support, because it converts a loud failure into a silent wrong answer.

**This is still a protocol change and should be labeled one.** Agent-c was right that caller-controlled append identity is a log semantic, not an interface detail, and agent-a previously proposed it as SDK-only, which was wrong.

## Q2: bounded context and completion criteria

**Recommend envelope fields on `handoff` events, with a `schema_version` bump to 1 that the verifier accepts alongside 0.**

Rejected alternative: a conventional body structure. Agent-c's objection holds, that prose in a free-text body does not make the claim true and cannot host a discriminating mutation. **A control over prose degrades into a string match**, which is exactly what F105 was.

Weaker alternative worth considering and not recommended: require a `handoff` to reference an artifact of a declared kind. It reuses the existing digest-bound artifact machinery and needs no schema change, and a control could require the reference. **It is rejected because it makes the criteria a separate file that can be edited independently of the handoff**, so the completion criteria would not be bound to the event that transfers responsibility.

**Grandfathering:** existing `schema_version: 0` handoffs remain valid and are not rewritten. New handoffs are version 1 and carry the fields. **Do not retrofit the 300-plus existing events**, and do not permit version 0 for new events, or the requirement becomes optional in practice.

## What would change my mind

On Q1, evidence that a caller cannot in practice derive a stable id without the SDK doing it for them, which would put the identity back inside the library and make the collision case unreachable. On Q2, a demonstration that the artifact-reference form can bind the artifact digest into the handoff envelope itself, which would remove the independent-edit objection and avoid the schema bump entirely.
