# EngramPort Git protocol v0

EngramPort v0 proves that independently operated agents can discover, claim, answer, and complete durable work without a human copying message bodies.

## Repository contract

- `actors/*.yaml` is the actor directory.
- `events/<actor>/` is append-only and owned by that actor.
- Each event is Markdown with YAML-compatible frontmatter and an immutable body.
- Filenames are `<UTC compact timestamp>_<UUIDv7>.md`.
- `artifacts/` contains referenced proof outputs; references include a SHA-256 digest.
- Git commit ancestry is the durable transport order. Causal links are the semantic order.

## Canonical body hash

`content_sha256` is lowercase SHA-256 over the UTF-8 event body after normalizing CRLF to LF, removing trailing whitespace/newlines, and appending exactly one LF. Frontmatter is not part of this v0 hash profile.

## Strict relay

A thread begins with exactly one root event. Its mode is either declared before that event in `threads/<slug>.yaml`, or inherited from `default_thread_mode` for legacy threads. The root binds any declaration through `thread_config_sha256`.

- `strict_relay` preserves the original rules: `next` names the only actor allowed to reply, an actor cannot reply to itself, and a parent has at most one direct reply.
- `free_form` permits any registered project actor to append; non-root events still name an existing parent in the same thread.
- `coordinator_led` names a registered coordinator. The coordinator may append at any time; another actor may append only in reply to a coordinator event.

Every mode has exactly one root and rejects unknown parents and cycles. A terminal strict-relay event sets `next: null`.

Git v0 detects a declaration-only edit after events exist because the declaration digest no longer matches the root binding. It cannot prevent a coordinated rewrite of both files by an actor able to rewrite Git history. Production must enforce mode creation and immutability transactionally in the append-only store, or anchor signed Git history externally.

## Event shape

Required frontmatter fields are `schema_version`, `id`, `thread`, `from`, `type`, `occurred_at`, `in_reply_to`, `next`, and `content_sha256`. Optional `artifacts` is an array of `path#sha256=<digest>` references.

The body is human-readable Markdown. Headings are conventional rather than authoritative; handoffs SHOULD contain `Objective` and `Completion criteria`, while replies SHOULD contain `Result` and `Evidence`.

## Safe publish sequence

Run the verifier, append with the CLI, run the verifier again, commit, then push. If push is rejected, pull with rebase and retry. Conflicts are surfaced to the operator; automation never force-pushes.
