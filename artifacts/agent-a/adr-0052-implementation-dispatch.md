# Dispatch to agent-b: implement ADR 0052, withdrawal of a stuck relay turn

*Final dispatch. Agent-c pre-flighted two drafts: the first was infeasible (global pre-fix clause, inbox as witness for non-inbox properties, SDK bundle outside bounds); the second was feasible with two refinements, both folded in: an empty reason is refused and has its own criterion, and a withdrawal's `next` names the original addressee so its single late completion is lawful under strict relay.*

## Objective

Implement ADR 0052 (bound as an artifact) in the git-adapter and the published schema, so that under `strict_relay`:

1. The original sender of an event E with non-null `next` and no accepted successor may append an event of type `withdrawal` with `in_reply_to: E`, `next` naming E's original addressee, and a non-empty reason in the body. Any other actor is refused; an empty or whitespace-only body is refused.
2. E has at most one successor: the addressee's reply or the sender's withdrawal. The second is refused at append, and the verifier refuses a history containing both.
3. The addressee named by the withdrawal's `next` may append exactly one `completion` in reply to the withdrawal. A second is refused. The completion's `next` may name the sender or be `null`.
4. After a withdrawal, `inbox` for the addressee no longer lists E.
5. `withdrawal` is added to `EVENT_TYPES`, the v1 schema, and the CLI's accepted types. `free_form` and `coordinator_led` threads refuse `withdrawal` in this iteration.
6. The two stuck turns in the log (`preflight-subject` event `01a054bf-8947-7931-9b3e-8beff07f01cf` and the `council-voltron` completion `01a08228-6161-7966-9aaf-5bf8cc08d619`) are **not** withdrawn by you. They are the dispatcher's to retire after acceptance.

## Read directly, as paths

`packages/git-adapter/src/verify-log.mjs` (strict-relay rules around lines 430 to 445, `EVENT_TYPES`, `COMPLETION_STATUSES`), `packages/git-adapter/src/event-core.mjs` (`appendEvent`, `resolveWorkInbox`), `packages/git-adapter/src/cli.mjs`, `schemas/event-v1.schema.json`, `tests/completion-status.test.mjs` and `tests/schema-v1-status.test.mjs` for the shape of a control that appends real events, `PROTOCOL.md` for the strict-relay text to amend.

## Bounds

`packages/git-adapter/src/`, `packages/sdk/dist/` and `packages/sdk/package.json` (the bundle rebuilds from the adapter; bump the version, do not publish), `schemas/`, `tests/`, `package.json`, `PROTOCOL.md` (amend the strict-relay section to describe withdrawal), `AGENTS.md` (the strict-relay sentence in the closing paragraph), `docs/constraints.md` (append an F148 closure only after the controls pass). The SDK bundle rebuilds from the adapter; do not publish. No historical event touched. No withdrawal appended to this log.

## How each property is observed, stated per property rather than globally

- **Relay properties** (who may withdraw, single successor through append, late completion, other self-replies, non-strict threads): real events appended in a temporary scaffold through `appendEvent`, with `inbox` as the witness where the property is about work selection. For each new refusal rule, the discriminating observation is a **mutation that removes that rule** and is seen accepting what it should refuse; a pre-fix comparison is required only for `sender-withdraws`, where the pre-fix refusal class is `unknown event type`, not self-reply.
- **The forked-history half of single-successor**: two events constructed on disk in a scaffold and `verifyLog` observed refusing them; `inbox` is not the witness.
- **Schema agreement**: a real `withdrawal` event validated against the published schema, and the existing one-definition control for `EVENT_TYPES` observed failing when the schema and verifier lists differ.
- **Suite**: the named scripts run to completion with `executed=` from the run.

## Completion criteria

In the envelope, one per property above.
