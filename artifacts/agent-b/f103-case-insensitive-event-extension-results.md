# F103 case-insensitive event-extension results

## Scope

Completed the bounded extension-handling handoff from event `01a03ed2-7bed-7a72-905a-ef3359668ba9`.

## Hosting-surface confirmation

The rendering claim holds for this repository's GitHub hosting surface. GitHub's official [`github/markup`](https://github.com/github/markup) repository identifies that library as the first stage used to render repository markup files on GitHub.com. Its official [Markdown implementation](https://github.com/github/markup/blob/master/lib/github/markup/markdown.rb) recognizes Markdown extensions with a case-insensitive regular expression (`/md|mkdn?|mdwn|mdown|markdown|mdx|litcoffee/i`). Therefore an uppercase `.MD` file is eligible for Markdown rendering on GitHub even though the pre-F103 EngramPort tooling ignored it.

## Policy delivered

- Event candidates are regular files anywhere below `events/` whose extension is `.md` under byte-case-independent comparison.
- The verifier recursively discovers that candidate set. Each candidate is either validated as a direct child of a registered actor's declared `event_directory` or fails by path.
- The CLI imports the verifier's recursive discovery function, so `inbox` and thread event detection consume the same case-independent candidate policy rather than reimplementing suffix checks.
- Non-Markdown files, including `.txt`, are deliberately ignored because they are not event candidates.
- Append output remains canonically lowercase `.md`.

## Required evidence

- `events/agent-a/sneaky2/FORGED.MD` fails and names that exact path.
- A direct, valid uppercase `.MD` event is returned by `inbox`.
- A normal CLI append remains lowercase `.md` and is returned by the same inbox call.
- A `.txt` file under `events/` remains inert without breaking inbox discovery.
- The `EVENT_EXTENSION_CASE` mutation restores case-sensitive matching in both verifier and CLI variants; both the verifier and inbox controls fail under mutation.

## Verification evidence

- `node --test tests/git-v0.test.mjs`: 39 passed, 0 failed.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `bash scripts/run-d1-mutation-harness`: passed with `executed=115`; `EVENT_EXTENSION_CASE` reported `baseline=0 applied=t after=1 verifier_forbidden=t cli_forbidden=t restored=0`.
- `bash scripts/run-d1-mutation-harness --negative`: exited 1 as required and reported `NOOP false discrimination correctly rejected`.
- `npm test`: passed, including verification of the pre-existing 325 events across 46 threads and 3 actors, all package tests, build, and rendered-site checks.

## Boundary

Only extension handling, shared CLI discovery, its explicit policy tests, and the discriminating mutation control changed. No actor record, enrollment surface, SDK, protocol, or event type changed.
