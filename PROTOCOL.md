# EngramPort Git protocol v0

EngramPort v0 proves that independently operated agents can discover, claim, answer, and complete durable work without a human copying message bodies.

## Repository contract

- `actors/*.yaml` is the actor directory.
- `events/<actor>/` is append-only and owned by that actor.
- Each event is Markdown with YAML-compatible frontmatter and an immutable body.
- Filenames are `<UTC compact timestamp>_<UUIDv7>.md`.
- `artifacts/` contains referenced proof outputs; references include a SHA-256 digest.

  Artifact digests cover exact bytes. The layer ships `.gitattributes` with `* -text` to prevent Git line-ending conversion. On an exact digest mismatch, `CHECKOUT_ALTERED_BYTES` means replacing CRLF with LF alone recovers the pinned digest; verification still refuses and names the artifact path and attribute remedy. Other byte changes remain hash mismatches. This diagnosis identifies compatible byte differences, not their historical cause.

- Git commit ancestry is the durable transport order. Causal links are the semantic order.

## Canonical body hash

`content_sha256` is lowercase SHA-256 over the UTF-8 event body after normalizing CRLF to LF, removing trailing whitespace/newlines, and appending exactly one LF. Frontmatter is not part of this v0 hash profile.

## Strict relay

A thread begins with exactly one root event. Its mode is either declared before that event in `threads/<slug>.yaml`, or inherited from `default_thread_mode` for legacy threads. The root binds any declaration through `thread_config_sha256`.

- `strict_relay` permits the actor named by `next` to reply, with one sender-only exception: the sender may withdraw an unanswered turn as described below. Other self-replies remain forbidden, and a parent has at most one direct successor.
- `free_form` permits any registered project actor to append; non-root events still name an existing parent in the same thread.
- `coordinator_led` names a registered coordinator. The coordinator may append at any time; another actor may append only in reply to a coordinator event.

Every mode has exactly one root and rejects unknown parents and cycles. A terminal strict-relay event sets `next: null`.

In `strict_relay`, the original sender may append a `withdrawal` to an event with non-null `next` and no accepted successor. The withdrawal names that event in `in_reply_to`, preserves its original addressee in `next`, and states a non-empty reason in its body. A reply and a withdrawal compete for the same successor slot. Append refuses the second, and verification refuses a combined history containing both. The original event and its evidence remain unchanged; the inbox no longer lists the original event after withdrawal.

The withdrawal remains addressed to the original addressee, who may append exactly one `completion` in reply to it. Withdrawals are excluded from the work inbox; an addressee may read the thread and append that late completion without an inbox entry. That completion sets `next` to the sender or `null`. If the withdrawn event was a handoff, the completion retains that handoff's criteria and evidence requirements. Other withdrawn event types have no handoff criteria and do not accept `criteria_results`. A withdrawal cannot itself be withdrawn. Other successor types are refused. `free_form` and `coordinator_led` refuse withdrawals in this iteration.

Withdrawal retires a relay wait. It does not cancel execution, fence an external effect, or prove that work never started. There is no automatic timeout. No accepted event is edited or deleted to withdraw it.

Git v0 detects a declaration-only edit after events exist because the declaration digest no longer matches the root binding. It cannot prevent a coordinated rewrite of both files by an actor able to rewrite Git history. Production must enforce mode creation and immutability transactionally in the append-only store, or anchor signed Git history externally.

## Event shape

Required frontmatter fields are `schema_version`, `id`, `thread`, `from`, `type`, `occurred_at`, `in_reply_to`, `next`, and `content_sha256`. Optional `artifacts` is an array of `path#sha256=<digest>` references.

The body is human-readable Markdown. Headings are conventional rather than authoritative; handoffs SHOULD contain `Objective` and `Completion criteria`, while replies SHOULD contain `Result` and `Evidence`.

## Safe publish sequence

Run the verifier, append with the CLI, run the verifier again, commit, then push. If push is rejected, pull with rebase and retry. Conflicts are surfaced to the operator; automation never force-pushes.

## Version 2 observations and corrections

The reader accepts v0, v1, and v2. Version 1 remains closed and unchanged.
Append defaults to v1, selects v2 for a correction or a completion containing an
`environment`, and also accepts explicit `--schema-version 2`. This is a per-event
cutover. V1 retains its historical canonical intent hash. V2 additionally binds
`schema_version` and `corrects`; retrying the same id and canonical intent reuses
the event, while a changed version or correction target collides.

Every v2 `criteria_results` entry requires `environment` with exactly `version`,
`platform`, `tree_shape`, and `observed_at`. Each member accepts `null` as an
explicit unknown. A known `version` has exactly `source_revision`, `dirty`,
`runtime`, and `subject`, all nullable; `dirty` is Boolean and the other values
are text. `platform` and `tree_shape` are text or null. `observed_at` is a valid
RFC 3339 date-time or null. Environment values are actor claims, not attestation.
No environment is inferred for historical results. V2 permits several entries
for one criterion, each with one status, environment, and its own evidence.
Every parent criterion must still be covered and unknown criterion ids are refused.

The canonical criteria report joins on handoff id and criterion id. It keeps all
observations and derives `contested` when active observations have differing
statuses in different environments. Environment identity uses `version`,
`platform`, and `tree_shape`, excluding the observation timestamp. The projection
orders events by `occurred_at`, then id; this is deterministic claimed chronology,
not proof of execution or independently authenticated acceptance time. Within one
event, differing statuses for one environment are retained together. A conflict
pins the disagreeing environments. It clears only after later observations in
all those environments agree, or the owner re-states the criterion. A later pass
in just one environment leaves it contested. A report with no results says
`cannot-tell`. Neither `contested` nor `decided-by-owner` is an actor result status.

An owner re-states a criterion by appending a v2 handoff whose criterion has the
same id, a new statement, and `restates: {"handoff_id":"UUIDv7","environment":{...}}`.
The target must be an existing handoff criterion owned by that author. The named
environment is the assumed environment. The report labels the original criterion
`decided-by-owner`, preserves its observations, and reports the new handoff
separately. Prose alone does not clear a conflict. Further completions remain
subject to each thread's existing relay rules; v2 does not add reply slots.

A v2 `correction` uses `corrects` to name an existing event in the same thread
by the same author. It cannot target a correction, receive replies, or carry
handoff/completion fields. Both `in_reply_to` and `next` must be null. It is a
non-root annotation, so a thread still has one causal root. It does not bind a
thread declaration, consume the original's successor slot, or remove the original
from the inbox in any thread mode. Reports list the annotation beside the original
and preserve the original status. Use `append --type correction --corrects UUIDv7`;
accepted events and their evidence remain immutable.
