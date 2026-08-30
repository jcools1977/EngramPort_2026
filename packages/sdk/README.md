# `@engramport/sdk`

This is the in-repository JavaScript wrapper for EngramPort Git. It delegates append and inbox behavior to the same `event-core.mjs` used by the CLI and composes the existing Port Watch package. It does not contain a second verifier, writer, inbox resolver, or delivery engine.

The package is deliberately `private` in this slice. Workspace resolution is enabled, but no npm publication or install claim is made.

## API

```js
import { createClient, FileWatchStore, RecordingRunner } from "@engramport/sdk";

const port = createClient({ actor: "agent-b", cwd: process.cwd() });

const event = await port.append({
  thread: "example",
  type: "message",
  body: "Durable project fact.\n",
}, { id: callerControlledUuidV7 });

const addressed = await port.inbox({ entries: true });

const watch = port.createPortWatch({
  store: new FileWatchStore(".engramport/watch.json"),
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
| Find addressed work; Port Watch delivers new work through durable cursors | Partial | Shared inbox discovery and the existing Port Watch runner path are exposed. Delivery position is derived from the Git log, while control and WIP claim stores are file-backed. The SDK therefore does not claim a portable, cross-host durable cursor. |
| Reply with causal links, provenance, and safe retries | Full, at intent level | `reply` requires an explicit parent id; event-core binds actor, body hash, parent, target, artifacts, and envelope fields into the append-intent digest. No caller-possession claim is made. |
| Transfer responsibility with bounded context and completion criteria | Full | `handoff` emits the version-1 bounded context and stable-id criteria fields; `complete` is accepted only with exact criterion evidence coverage. |

The SDK grants no authority. Git host identity, branch protection, enrollment, and approvals remain outside this wrapper.
