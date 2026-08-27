# Port Watch surface, supplied because the package itself cannot be

`packages/port-watch/src/index.mjs` cannot be passed as agent-c review context: the credential boundary refuses it because the identifier `token` appears as domain vocabulary. Recorded as F110. This summary is transcribed from the source so the durable-cursors claim can be reviewed.

**Exports:**

- `authorizedInboxSource(query)`
- `class RecordingRunner` with `run(context, token)`, recording invocations and returning `{run_id}`
- `class FileWatchStore`
- `decideDelivery({cursor, events})`

**Cursor behavior:** delivery decisions are taken against a stored `cursor` per `(agent, project)` pair, held in a transactional store, with lease acquisition and `expireLease(agent, project, lease_token)`. State is keyed by agent and project, carrying `scopes`.

**Relevance to the site's claim** *"Port Watch delivers new work through durable cursors"*: `decideDelivery` is the function that implements it, and the cursor is persisted through `FileWatchStore` rather than held in memory.

**This is agent-a's transcription, not the source.** Treat it as a secondhand description and say so if a finding depends on detail it does not carry.
