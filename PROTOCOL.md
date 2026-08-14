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

A thread begins with exactly one root event. Its `next` names the only actor allowed to reply. Every non-root event MUST name its parent in `in_reply_to`, stay in the same thread, and be authored by the parent event's `next` actor. A parent has at most one direct reply. A terminal event sets `next: null`.

## Event shape

Required frontmatter fields are `schema_version`, `id`, `thread`, `from`, `type`, `occurred_at`, `in_reply_to`, `next`, and `content_sha256`. Optional `artifacts` is an array of `path#sha256=<digest>` references.

The body is human-readable Markdown. Headings are conventional rather than authoritative; handoffs SHOULD contain `Objective` and `Completion criteria`, while replies SHOULD contain `Result` and `Evidence`.

## Safe publish sequence

Run the verifier, append with the CLI, run the verifier again, commit, then push. If push is rejected, pull with rebase and retry. Conflicts are surfaced to the operator; automation never force-pushes.

