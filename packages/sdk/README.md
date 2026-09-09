# `@engramport/sdk`

This is the JavaScript wrapper for EngramPort Git. Its source delegates append
and inbox behavior to the same `event-core.mjs` used by the CLI and composes the
existing Port Watch package. It does not contain a second verifier, writer,
inbox resolver, or delivery engine.

The distributable contains bundled ES modules for the API and the `engram` CLI, plus their shared chunks. A clean consumer needs one tarball and no unpublished dependency. Rebuild whenever an internal source changes; the clean-package control verifies both the API and CLI from an installed tarball. Version 0.3.0 is published on npm. These documentation and help changes are for the next release; editing or packing the package does not publish it.

## New project

Run in an empty directory:

```sh
npx @engramport/sdk init --actor my-agent --kind agent --project my-project --mode free_form
npx @engramport/sdk verify
```

The installed bin is also available as `engram`. Init writes exactly `engramport.yaml`, `actors/<slug>.yaml`, `events/<slug>/.gitkeep`, and `artifacts/<slug>/.gitkeep`. Kind is required (`human|agent`). Project defaults to `my-project` and must match the verifier's slug pattern; mode defaults to `free_form` and also accepts `strict_relay`. Existing projects refuse with `INIT_PROJECT_EXISTS` and a pointer to `CONTRIBUTING.md`. Other nonempty directories refuse, and every file write uses exclusive creation. A filesystem error during creation can leave a partial scaffold. Init performs no Git or network operation.

Init creates one actor and no grant. It is separate from Port Package, which onboards a participant into an existing log under a grant decided elsewhere. The actor is a name in a file, not an authenticated identity; init confers no authority. Joining an existing project remains the pull request process in [CONTRIBUTING.md](https://github.com/jcools1977/EngramPort_2026/blob/main/CONTRIBUTING.md).

For a full two-seat handoff and completion with all JSON files, follow the
[local walkthrough](https://github.com/jcools1977/EngramPort_2026#a-complete-two-seat-local-walkthrough).
It distinguishes creating founding seats from joining an existing authorized log
and includes an offline tarball installation option. Generated projects use
`engram verify`; repository npm proof scripts require a repository clone.
In this release, `engram --help` and `engram append --help` describe the
`--bounded-context JSON_FILE`, `--completion-criteria JSON_FILE`, and
`--criteria-results JSON_FILE` array shapes. Each argument is a filename.

Read the hosted [security policy](https://github.com/jcools1977/EngramPort_2026/blob/main/SECURITY.md),
[findings register](https://github.com/jcools1977/EngramPort_2026/blob/main/docs/constraints.md),
and [MIT license](https://github.com/jcools1977/EngramPort_2026/blob/main/LICENSE).
An offline reader cannot follow these links and needs a local repository copy.

## API

```js
import { createClient, FileWatchStore, PostgresClaimStore, RecordingRunner } from "@engramport/sdk";

const port = createClient({ actor: "agent-b", cwd: process.cwd() });

const event = await port.append({
  thread: "example",
  type: "message",
  body: "Durable project fact.\n",
}, { id: callerControlledUuidV7 });

const addressed = await port.inbox({ entries: true });

const watch = port.createPortWatch({
  store: new FileWatchStore(".engramport/watch.json"),
  claimStore: new PostgresClaimStore(postgresPool),
  runner: new RecordingRunner(),
});
```

`append`, `reply`, `handoff`, and `complete` return the event-core result. A retry with the same UUIDv7 and complete canonical intent returns the existing event with `reused: true`. Reusing that identity for a different intent raises `APPEND_INTENT_COLLISION`. This is intent-level idempotence only: it neither authenticates a caller nor proves possession of a retry identity.

If the configured actor is absent from `actors/*.yaml`, event-core refuses the candidate because its event path is not registered. The SDK returns that refusal unchanged and creates no actor directory. This registry check is log structure validation, not enrollment or authorization; database enrollment and Git write authority remain separate boundaries.

Artifact references are likewise verified by event-core. An event authored as one actor cannot cite an `artifacts/<other-actor>/...` path in its top-level artifact list.

## Claim coverage and qualifiers

| Site claim | Coverage | What this package actually delivers |
| --- | --- | --- |
| Append a typed event; never overwrite another participant's history | Full | The SDK calls the shared version-1 writer. A fresh identity determines an actor-owned path, `wx` performs exclusive creation, and whole-log verification enforces actor-directory ownership. Never-overwrite is structural; there is no staged refusal for a public operation that cannot address another actor's accepted path. |
| Find addressed work; Port Watch delivers new work | Full with a service dependency | Shared inbox discovery and the existing Port Watch runner path are exposed. Delivery position is derived from the Git log. `PostgresClaimStore` makes claim and lease exclusion visible to independent connections using one reachable PostgreSQL control stream. The test does not run on two physical machines, so it proves that exclusion is not process- or filesystem-local, not that cross-machine networking or availability works. |
| Reply with causal links, provenance, and safe retries | Full, at intent level | `reply` requires an explicit parent id; event-core binds actor, body hash, parent, target, artifacts, and envelope fields into the append-intent digest. No caller-possession claim is made. |
| Transfer responsibility with bounded context and completion criteria | Full | `handoff` emits the version-1 bounded context and stable-id criteria fields; `complete` is accepted only with exact criterion evidence coverage. |

The SDK grants no authority. Git host identity, branch protection, enrollment, and approvals remain outside this wrapper.

Portable work-delivery exclusion now requires the PostgreSQL control stream to be reachable. This sharpens, but does not resolve here, the tension with ADR 0039's no-server description; ADR 0044 already accepts shared infrastructure for delivery state.
