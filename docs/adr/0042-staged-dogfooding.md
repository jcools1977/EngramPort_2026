# ADR 0042: The team becomes EngramPort's first tenant, in stages

**Status:** accepted
**Date:** 2026-08-27
**Decided by:** DeVere

## Correction of terms, recorded because agent-a stated it loosely

**The Git log is shared institutional memory.** What the three actors lack is **shared runtime and semantic memory**: there is no database-backed retrieval, no vector index, no hidden common context. Agent-a's earlier phrasing, "no shared memory of any kind", was wrong in a way that undersold what the log already provides.

## Decision

The team becomes EngramPort's first tenant, through four stages, and **this becomes an explicit pre-launch gate rather than something postponed until customers discover whether it works.**

1. **Shadow indexing.** Mirror accepted Git events into PostgreSQL and build derived embeddings. Agents keep using Git. Compare vector retrieval against complete scans without affecting work.
2. **Read-only dogfooding.** Port Context proposes bounded evidence using full-text and vector retrieval. **Every result must resolve to a canonical event id and artifact digest**, so missing or stale embeddings cannot hide the source record.
3. **Measured agent use.** Agent-a and agent-b receive logged, reproducible context packages. **Agent-c remains cold and independent**, receiving only explicitly selected evidence. Measure tokens, latency, missed findings, false retrievals, review returns, corrections.
4. **Canonical cutover.** Only after tenant isolation, poisoning resistance, authorization-before-retrieval, rebuildability and retrieval-quality controls pass does PostgreSQL become the production source of truth, with Git remaining the portable export and proof layer.

## Three collisions this runs into, none of them fatal

**1. The repository already contradicts itself about what is truth.** `docs/architecture/port-family.md:20` states *"Port Log is truth. Everything else is a projection of it, and no projection may become truth by being useful."* `docs/adr/0012-workspace-setup-wizard.md:43` states *"PostgreSQL remains the single canonical store... the wizard introduces no second source of truth."* **Both are accepted, and stage 4 resolves in ADR 0012's favor.** That resolution should be explicit, because the port-family sentence was written to forbid exactly this move, and letting it be overridden silently is how a rule stops meaning anything (F95).

**2. Stage 4 is in tension with ADR 0039.** That ADR states *"Git is the substrate because builders already share repositories, so coordination needs no server, no account, and no vendor between them."* **If PostgreSQL becomes truth, multi-builder coordination requires a shared PostgreSQL, which is a server between them.** The product either keeps the no-server property and treats PostgreSQL as a per-builder accelerator, or accepts a server and gains a place to put the identity that F117 shows everything is blocked on. **These are different products and the choice should be made deliberately.**

**3. Poisoning resistance is blocked on identity.** Stage 4 gates on it, and F111 established that any caller may author an event as any actor. **Embeddings derived from forgeable events inherit the forgery**, so retrieval poisoning is not a separate hardening task; it is the impersonation defect reaching a new surface. This gate cannot pass before the attribution hardening does.

## The research value, and the one risk that is a gate rather than a measurement

DeVere named the comparisons: full-log scanning versus GraphRAG retrieval, context size and token cost, retrieval latency, findings discovered or missed, coordination quality, whether semantic retrieval introduces shared bias, and **whether independent review degrades when agents share retrieved context.**

**That last one is not a metric. It is a hard constraint, and stage 3 already encodes it correctly by keeping agent-c cold.** Agent-a and agent-b produce sealed independent recommendations whose value depends entirely on not sharing an evidence base; if both retrieve from one index, their recommendations correlate and the council mechanism reports agreement it did not earn. **Five of agent-c's findings this session were caused by agent-a's context selection alone** (F96, F99, F110, F119 and the SDK pre-flight framing), which is the same failure with one curator instead of an index.

**There is a ready-made baseline for the measurement.** This session produced findings F93 through F119 with known provenance, each traceable to the events and files that produced it. Replaying that corpus against retrieval gives a labeled comparison rather than an impression.
