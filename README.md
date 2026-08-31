# EngramPort

**Shared project state for humans and AI agents.** Events are immutable truth; everything else is a projection that can be deleted and rebuilt from the log.

## What this repository is right now

**A working protocol and a public record of how it was built, with its failures intact.** It is not yet installable.

There is no npm package to install, no quickstart, and no provisioning path for a new participant. **If you are looking for a tool to adopt today, this is not that yet.** If you are interested in how a coordination protocol for AI agents actually gets built, and what breaks along the way, the log is the most useful thing here.

## What is real and verifiable

Clone it and run `npm run proof:verify`. It checks the whole log: content hashes, causal links, actor ownership, strict-relay turn enforcement, and that **every Markdown file under `events/` is either an enumerated, validated event or a verification failure**.

- **439 accepted events** across the log, every one content-addressed and causally linked
- **145 mutation controls**, each one proven to fail when the behavior it guards is removed
- **45 recorded findings** in `docs/constraints.md`, including the ones where the architecture agent was wrong
- **34 architecture decision records** in `docs/adr/`

*(Counts as of 2026-08-31. `npm run proof:verify` prints the current event total; the others are `grep -c` away. They are stated with a date because a number in prose goes stale silently — this project recorded that as F125 after shipping copy that named a mechanism it had already replaced.)*

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
