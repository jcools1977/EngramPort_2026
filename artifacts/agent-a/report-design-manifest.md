# Re:PORT: canonical document manifest

Author: agent-a (Claude Architect)
Date: 2026-08-14

Binds the Re:PORT design documents to digests. Canonical documents live in `docs/` per specification section 25; the Git v0 verifier hash-binds only paths under `artifacts/`, so this manifest carries the digests. Verify with `shasum -a 256 <path>`.

| Document | Path | SHA-256 |
|---|---|---|
| report-prd.md | `docs/product/report-prd.md` | `3e5eb25e7fdb3bacaf75ac7250c11a792c0edd17785f9639e6824fd9e7645945` |
| 0013-report-correspondent.md | `docs/adr/0013-report-correspondent.md` | `fe027c67f0eb38512e5333fb7b43fcd001a723e0800d4c1a55c4a8ec59e87314` |
| report-envelope-v1.schema.json | `docs/schemas/report-envelope-v1.schema.json` | `0a3de72b2289eecbab2c88c00b2244c2092a71a71d5b908aa5b445207666793d` |
| report-inputs-v1.schema.json | `docs/schemas/report-inputs-v1.schema.json` | `de67f74620d06ec9806398ad914735762ad6554ebd319e97d4598ce04950fa33` |
| report-authorization-and-redaction.md | `docs/security/report-authorization-and-redaction.md` | `7b51b934c0a48ef705e4a2ee04b93c55589a37cf6394023b5a63a96bf18ea634` |
| report-threat-cases.md | `docs/security/report-threat-cases.md` | `849338769d4008915da31d7fd07b710eed672befdf2285fd1a4b5b0955bae390` |
| report-plan.md | `docs/plan/report-plan.md` | `1f2cb59db7f19fd175ef569b8371f587fc513e08b63bb395329818d5409db191` |
| port-family.md | `docs/architecture/port-family.md` | `c3337af333e406472e0495b06b57db1d1e5afaea10415a3d00d62c92824e18b6` |

## Reconciliation summary

Most of Re:PORT is already sanctioned by the engineering specification rather than a departure from it. Section 9.3 requires generated summaries to cite source event ids and be labeled generated. Section 10 requires extraction to treat content as quoted evidence, forbid embedded instructions, require exact evidence ids, and return schema-constrained JSON. Section 25 anticipates `apps/web/`. Section 5.4 anticipates new kinds through a registry.

**One genuine conflict: Public view.** Nothing in the specification contemplates publishing tenant content to the open internet. Section 6.3 classifies data-export and external-communication as consequential action classes where self-approval is prohibited, and a build-in-public feed is both at once. Section 30 defers external connectors. ADR 0013 promotes a narrow external-publication capability limited to allowlisted project evidence on a project-owned surface, human-approved and digest-bound. General connectors stay deferred.

## Decisions that are not details

- **Generated output is excluded from evidence, not merely labeled.** Without exclusion, reports cite reports, and an inference becomes a fact by repetition. Section 10 forbids fabricating consensus; this closes the slower path to it.
- **Views are authorization contexts, not display filters.** Post-filtering a shared candidate set means restricted content already entered generation, and a model that saw it can leak it through paraphrase without quoting.
- **Public view is allowlist-only.** Redaction-based publishing fails open on every field nobody anticipated, and the failure is invisible until it is public.
- **`progress.published` has typed fields and no free-form body.** That absence is the structural control against reporting hidden reasoning. Redaction is defense in depth and is never the reason something is safe.
- **Unauthorized content is removed, never signposted.** No counts, placeholders, or "hidden item" affordances. The required test is that output is byte-identical whether or not restricted content exists.
- **Reports are auditable, not bit-reproducible.** The reproducible object is the input set. Claiming determinism from a nondeterministic generator would violate section 15.
- **New kinds reuse existing ones wherever they exist.** Two vocabularies for one fact is how projections begin to disagree.

## Component relationships

`docs/architecture/port-family.md` fixes the invariant: Port Log is truth, and Port Context, Port Package, Port Watch, and Re:PORT are all derived projections of it, none of which may become truth by being useful. Re:PORT closes the loop Port Watch opens: Port Watch is how work reaches an agent without a human, Re:PORT is how a human learns what happened without reading a log.

Two cores are shared rather than duplicated: authorization-before-retrieval across Port Context, Port Package, and Re:PORT; webhook-first delivery with cursor recovery across Port Watch and Re:PORT. Three implementations of authorization-before-retrieval would be three chances to leak.

## Dispatch status

**No Re:PORT task is dispatched.** R1 is fully specified so it can be handed off without further design work once the priority order across the open workstreams is authoritative and agent-b has confirmed capacity.
