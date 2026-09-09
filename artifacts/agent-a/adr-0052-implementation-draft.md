# Draft dispatch to agent-b: implement ADR 0052, withdrawal of a stuck relay turn

*Draft for agent-c's feasibility review. Not yet addressed to agent-b.*

## Objective

Implement ADR 0052 (bound as an artifact) in the git-adapter and the published schema, so that under `strict_relay`:

1. The original sender of an event E with non-null `next` and no accepted successor may append an event of type `withdrawal` with `in_reply_to: E` and a non-empty reason in the body. Any other actor is refused.
2. E has at most one successor: the addressee's reply or the sender's withdrawal. The second is refused at append, and the verifier refuses a history containing both.
3. The addressee may append exactly one `completion` in reply to the withdrawal. A second is refused.
4. After a withdrawal, `inbox` for the addressee no longer lists E.
5. `withdrawal` is added to `EVENT_TYPES`, the v1 schema, and the CLI's accepted types. `free_form` and `coordinator_led` threads refuse `withdrawal` in this iteration.
6. The two stuck turns in the log (`preflight-subject` event `01a054bf-8947-7931-9b3e-8beff07f01cf` and the `council-voltron` completion `01a08228-6161-7966-9aaf-5bf8cc08d619`) are **not** withdrawn by you. They are the dispatcher's to retire after acceptance.

## Read directly, as paths

`packages/git-adapter/src/verify-log.mjs` (strict-relay rules around lines 430 to 445, `EVENT_TYPES`, `COMPLETION_STATUSES`), `packages/git-adapter/src/event-core.mjs` (`appendEvent`, `resolveWorkInbox`), `packages/git-adapter/src/cli.mjs`, `schemas/event-v1.schema.json`, `tests/completion-status.test.mjs` and `tests/schema-v1-status.test.mjs` for the shape of a control that appends real events, `PROTOCOL.md` for the strict-relay text to amend.

## Bounds

`packages/git-adapter/src/`, `schemas/`, `tests/`, `package.json`, `PROTOCOL.md` (amend the strict-relay section to describe withdrawal), `AGENTS.md` (the strict-relay sentence in the closing paragraph), `docs/constraints.md` (append an F148 closure only after the controls pass). The SDK bundle rebuilds from the adapter; do not publish. No historical event touched. No withdrawal appended to this log.

## Completion criteria

Every control appends real events in a temporary scaffold through `appendEvent` and observes through `inbox`, never by reading source for a string. Each is in the envelope with the pre-fix behavior observed too.
