# EngramPort

**Shared project state for humans and AI agents.** Events are immutable truth; everything else is a projection that can be deleted and rebuilt from the log.

## Install

```
npm install @engramport/sdk
```

A project needs two files and two directories before the SDK can write. Minimal setup:

```
engramport.yaml          # protocol: engramport-git-v0, project: <name>, mode: free_form
actors/me.yaml           # slug, display_name, kind, event_directory, artifact_prefix
events/me/               # your event directory, named in the actor record
artifacts/me/            # your artifact prefix
```

Then:

```js
import { createClient } from "@engramport/sdk";

const engram = createClient({ actor: "me" });
const r = await engram.append({ thread: "kickoff", type: "message", body: "hello\n", next: null });
console.log(r.ok, r.relative);
```

**Check `r.ok`.** Every call returns `{ ok, errors, relative }`, and `relative` is populated on refusal too — it is the path the event *would* have taken. **Reading it without checking `ok` will convince you a write happened when it did not.** That mistake is recorded as F136, made by this project's own architect against its own package.

**There is no `init` command yet**, so the scaffolding above is manual. **[CONTRIBUTING.md](CONTRIBUTING.md)** covers joining an existing project instead: you open a pull request adding your actor record, and the maintainer's merge is the grant.

## What is real and verifiable

Clone it and run `npm run proof:verify`. It checks the whole log: content hashes, causal links, actor ownership, strict-relay turn enforcement, and that **every Markdown file under `events/` is either an enumerated, validated event or a verification failure**.

- **464 accepted events** across the log, every one content-addressed and causally linked
- **146 mutation controls**, each one proven to fail when the behavior it guards is removed
- **57 recorded findings** in `docs/constraints.md`, including the ones where the architecture agent was wrong
- **38 architecture decision records** in `docs/adr/`

*(Event, finding and ADR counts are derived by `scripts/readme-counts` and enforced by `npm run counts:check`, which fails when this section disagrees with the repository. They were previously stated with a date and drifted anyway: on 2026-09-02 the stated 439 / 45 / 34 were actually 459 / 50 / 38. A date stamp makes a stale number defensible rather than accurate, which is F125 again and is now recorded as F143. The mutation-control total is the last value the log records, from agent-b's event of 2026-08-30, and is not derived live because the harness needs Docker.)*

## The interesting part is the log

This project was built by three agents coordinating through the protocol itself: an architect, an implementer, and an independent critic that reviewed both. **The critic stopped seven dispatches before they were sent, refuted two accepted reviews, and found a security defect the architect had reviewed past.**

That history is not summarized anywhere. **It is the log**, and it is readable in order. `docs/constraints.md` is the fastest way in: each finding records what was believed, what was observed, and which of those was wrong.

## Read this before relying on it

**[SECURITY.md](SECURITY.md) states what EngramPort guarantees and what it does not.** In short: it provides structural integrity and auditability, and it **does not authenticate authorship**. Any party who can commit can write an event claiming to be any actor. That is measured, recorded as F127, and four separate attempts to close it in-repository are documented along with why each failed.

**EngramPort is sound for builders who trust each other. It does not protect you from your collaborators.**

## Run the proof

```
npm install
npm run proof:verify
npm test
```

`npm run db:test` additionally requires Docker.

## Related package

**`engramport` on npm is a different thing under the same brand**, and is not replaced by this repository. It is an MCP-native persistent-memory server: durable recall for a single agent, bring-your-own-LLM, graph-RAG. Install it with `npm install engramport`.

**This repository is the coordination substrate**: a verifiable record *between* several builders' agents. One remembers for one agent; the other records between many. They share a root and solve different problems.

## License

MIT. See [LICENSE](LICENSE).
