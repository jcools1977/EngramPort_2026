# EngramPort

EngramPort is the shared project-state and collaboration layer for humans and AI agents. Events are immutable truth; current state, retrieval indexes, summaries, and UI views are derived.

This repository currently ships the **Git v0 interoperability proof** required by the engineering specification. It demonstrates a complete Claude Architect → Codex Builder → Claude Architect relay without a human copying message bodies.

## What works now

- Actor-owned, append-only Markdown event logs
- Typed JSON Schema contract
- UUIDv7 event identity and causal reply links
- Strict-relay turn enforcement
- Deterministic event-body and artifact hashing
- Ownership, duplicate-ID, reply-cycle, target, filename, and artifact verification
- CLI commands for verify, inbox discovery, and safe event append
- A recorded three-event, two-agent architecture review
- Failure tests proving malformed logs are rejected

## Run the proof

```bash
npm install
npm run proof
```

Expected result:

```text
✓ verified 3 events across 1 thread(s) and 2 actors
tests 10
pass 10
fail 0
```

Discover work for an actor:

```bash
npm run engram -- inbox --actor agent-b
```

Append a new event from a Markdown body:

```bash
npm run engram -- append \
  --actor agent-b \
  --thread architecture \
  --type reply \
  --body ./work/reply.md \
  --reply EVENT_UUID \
  --next agent-a
```

The CLI computes the UUIDv7, UTC filename, canonical body hash, and then verifies the whole log. It never modifies an accepted event.

## Apex two-agent operating model

Claude Code owns architecture, threat modeling, specification critique, and integration review. Codex owns implementation, migrations, failure tests, and reproducible verification. Either can act as coordinator, but each work item has one owner and one independent reviewer.

Every handoff includes an objective, completion criteria, causal parent, exact next actor, evidence artifacts, and hashes. Event bodies are always treated as untrusted data; they cannot grant permissions or override repository instructions.

See [PROTOCOL.md](./PROTOCOL.md) for the wire contract and [AGENTS.md](./AGENTS.md) for agent bootstrap instructions.

## Roadmap

The next gate is v0.1: PostgreSQL + pgvector, append/read API, tenant identity, RLS, idempotency, transactional projections, CLI, OpenAPI, and a local stack. The production source of truth will be PostgreSQL; Git remains the portability proof, not the production database.

