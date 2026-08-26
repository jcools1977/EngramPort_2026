# Independent site claim audit

Date: 2026-08-26  
Auditor: agent-b  
Scope: every factual product claim visible in `app/page.tsx`; no site, SDK, protocol, or vocabulary changes were made.  
Independence: this report was completed without reading `artifacts/agent-a/site-claim-audit-sealed.md`.

## Method and legend

I treated a claim as **TRUE** only when the repository contains a working implementation or a recorded proof matching the copy. **PARTLY TRUE** means a real subset exists but the displayed scope, integration, or guarantee is broader. **FALSE** means the repository directly contradicts the copy or the depicted proof. **UNEVIDENCED** means neither implementation nor contradiction is available; absence is not called a contradiction.

The current product boundary is unusually clear: the repository says it *currently ships* a Git v0 interoperability proof (`README.md:5-17`) and calls PostgreSQL + pgvector, an append/read API, idempotency, projections, OpenAPI, and a local stack the next roadmap gate (`README.md:63-65`). The site itself has no application database schema (`db/schema.ts:1-4`).

## Visitor-falsifiable failures, ranked

1. **The install command is false.** Both calls to action say `npm install @engramport/sdk` (`app/page.tsx:22-25,142-145`), but the repository is a private package named `engramport`, not `@engramport/sdk` (`package.json:2-4`), and `npm view @engramport/sdk name version --json` returned npm E404 on 2026-08-26. This is the fastest possible visitor failure.
2. **The console is labelled LIVE but is a synthetic, contradictory replay.** The four rows are hard-coded (`app/page.tsx:5-10,97-116`). The actual architecture proof is three events, not four (`README.md:16,26-33`), uses `handoff`, `reply`, and `completion`, and contains no claim or separate artifact-registration event. The verifier rejects every dotted type shown in the console (`packages/git-adapter/src/verify-log.mjs:8-9`). The shown sequence, times, slugs, result, and truncated digest do not match the recorded events.
3. **“Conflict-free by design” is directly contradicted.** The protocol explicitly says rejected pushes require pull/rebase/retry and conflicts are surfaced to the operator (`PROTOCOL.md:36-38`).
4. **The depicted client surface does not exist.** Git and CLI work; MCP, REST, and a published SDK do not. The root scripts expose the Git CLI, not an API or SDK (`package.json:8-40`), while the README calls the append/read API and OpenAPI roadmap (`README.md:63-65`).
5. **The site presents the target PostgreSQL architecture as the running source of truth.** A serious SQL schema, RLS, immutable-event trigger, idempotency constraint, hash-chain columns, and full-text index exist (`migrations/0001_canonical_core.sql:11-93,119-144`), but the site app has an intentionally empty DB schema (`db/schema.ts:1-4`) and a hard-coded event display. This is implemented design/proof work, not the site's connected runtime.
6. **pgvector embeddings, outbox, and rebuildable derived views are overclaimed.** The vector extension is enabled (`migrations/0001_canonical_core.sql:3-4`), but the migrations contain no embedding table/vector column, outbox table, or projection tables. The UI is not derived; it is a constant (`app/page.tsx:5-10`). Full-text is the exception: a generated `tsvector` and GIN index are real (`migrations/0001_canonical_core.sql:69-85`).
7. **Safe retries are not a Git-v0 guarantee.** Every CLI append generates a fresh UUID and file (`packages/git-adapter/src/cli.mjs:130-149`); there is no retry/idempotency input. The unconnected SQL schema does have an idempotency key constraint (`migrations/0001_canonical_core.sql:66-74`).
8. **“Hash-chain position” and “CHAIN VALID/VERIFIED” overstate the current proof.** Git v0 hashes only the normalized event body (`PROTOCOL.md:14-16`) and uses Git ancestry for transport order (`PROTOCOL.md:12`). SQL chain columns exist, but no connected append service is shown computing them. The pictured console therefore has no verified chain position.

## Complete claim ledger

Repeated footer/CTA wording is grouped with its first occurrence. Navigation labels and copyright are not factual product claims; the copy button mechanism is real (`app/page.tsx:22-25`) but copies a false install command.

| Site line(s) | User-visible claim | Status | Repository evidence and reasoning | Confidence |
|---|---|---|---|---|
| 44, 152 | Shared state infrastructure for humans and AI agents | PARTLY TRUE | Git v0 supplies shared, actor-owned project state and a verified relay (`README.md:5-17`); the general infrastructure implied by the architecture is not connected to the site. | High |
| 45 | “The project remembers. Every agent continues.” | PARTLY TRUE | Durable events and inbox discovery exist (`README.md:9-16,35-53`), but continuity for *every* agent and complete memory are not enforced. | High |
| 47 | Neutral collaboration layer preserving decisions, exchanging work, and resuming with the full story intact | PARTLY TRUE | The Git wire format is provider-neutral and supports decisions/handoffs (`packages/git-adapter/src/verify-log.mjs:8-10`); “full story intact” has no completeness guarantee. | High |
| 55 | Immutable event log | PARTLY TRUE | Accepted Git events are append-only by repository rule and verifier workflow; Git history can still be coordinatedly rewritten (`PROTOCOL.md:28`). SQL events have a true update/delete rejection trigger (`migrations/0001_canonical_core.sql:88-93`) but are not the site runtime. | High |
| 55 | Project sequence 01845 | FALSE | The value is hard-coded (`app/page.tsx:5-10,55`); Git v0 events do not have `project_seq` (`PROTOCOL.md:30-34`). | High |
| 55, 116 | Chain valid / chain verified | FALSE | The rendered rows are synthetic and Git v0 has body hashes plus Git ancestry, not per-event chain hashes (`PROTOCOL.md:12,14-16`). | High |
| 63-64 | Sessions end; project memory should persist; vendor conversations trap decisions; handoffs rely on copy/paste | UNEVIDENCED | These are market/problem assertions. The repo proves one relay without copying message bodies (`README.md:5,16`) but does not establish the universal market statements. This is absence, not contradiction. | Medium |
| 64, 134 | The project/tenant, not platform/vendor/session, owns its durable story/history | PARTLY TRUE | Git files are repository-owned; SQL schema is tenant/project scoped (`migrations/0001_canonical_core.sql:11-40,60-80`). Legal/data-ownership semantics and a deployed tenant service are not evidenced. | Medium-high |
| 72 | Asynchronous by default | TRUE | Git transport, inbox discovery, causal replies, and separate commits are inherently asynchronous (`PROTOCOL.md:7-12`; `packages/git-adapter/src/cli.mjs:117-149`). | High |
| 72 | Conflict-free by design | FALSE | Protocol explicitly surfaces push/rebase conflicts to the operator (`PROTOCOL.md:36-38`). | High |
| 13, 78-79 | Publish: append a typed event; never overwrite another participant's history | TRUE | Event types are validated (`packages/git-adapter/src/verify-log.mjs:8-10`), append writes exclusively with `wx`, then verifies (`packages/git-adapter/src/cli.mjs:130-149`). | High |
| 14, 78-79 | Discover addressed work and relevant context through durable cursors | PARTLY TRUE | The Git inbox finds unanswered events addressed through `next` (`packages/git-adapter/src/cli.mjs:117-128`), but it recomputes the inbox and has no cursor or relevance selector. Port Watch has a file-backed cursor and WIP limit (`packages/port-watch/src/index.mjs:14-30,41-50`), but it is a separate harness. | High |
| 15, 78-79 | Respond with causal links, provenance, and safe retries | PARTLY TRUE | Required `in_reply_to`, hashes, and artifact digests provide causal/provenance evidence (`PROTOCOL.md:11,30-34`). Git append lacks an idempotency/retry key (`packages/git-adapter/src/cli.mjs:130-149`). | High |
| 16, 78-79 | Hand off with bounded context and completion criteria | PARTLY TRUE | Handoff objective/completion headings are conventions, not authoritative fields or size/relevance enforcement (`PROTOCOL.md:32-34`; `README.md:59`). | High |
| 88-90 | Different agents operate one continuous thread | TRUE for the recorded proof | The repository records a Claude Architect → Codex Builder → Claude Architect three-event architecture review (`README.md:5,16`). This establishes the bounded proof, not universal continuity. | High |
| 90 | Claude publishes; Codex independently discovers, claims, registers an artifact, and completes | FALSE as depicted | Actual Git v0 proof has three events (`README.md:16`), whereas the site invents four dotted events (`app/page.tsx:5-10`) that are invalid under the accepted type vocabulary (`packages/git-adapter/src/verify-log.mjs:8`). | High |
| 90 | Nobody edits history; nobody pastes context | TRUE for the recorded proof | README explicitly records the relay without a human copying message bodies (`README.md:5`) and the CLI never modifies an accepted event (`README.md:53`). Not a universal prevention guarantee because Git history can be rewritten (`PROTOCOL.md:28`). | High |
| 92 | Exact causal links | TRUE | `in_reply_to` is a required field and verifier-enforced semantic relationship (`PROTOCOL.md:12,30-34`). | High |
| 93 | Verifiable content hashes | TRUE | Canonical event-body hashing and artifact SHA-256 references are specified and verified (`PROTOCOL.md:11,14-16`; `README.md:13-14`). | High |
| 94 | Bounded, relevant context | PARTLY TRUE | Handoff content is human-bounded by convention; the protocol does not calculate relevance or enforce a context bound (`PROTOCOL.md:32-34`). | High |
| 97-116 | Console is LIVE; four shown events, two actors, detail text and digest are verified evidence | FALSE | The entire stream and timestamps are constants (`app/page.tsx:5-10,102-116`); its dotted types are rejected by the verifier (`packages/git-adapter/src/verify-log.mjs:8`). The actual proof is three events (`README.md:16`). Actor display identities exist, but canonical slugs are `agent-a` and `agent-b` (`actors/agent-a.yaml:2-5`; `actors/agent-b.yaml:2-5`), not the displayed actor values. | High |
| 123 | Events are canonical; everything else rebuilds | PARTLY TRUE | This is the intended architecture (`README.md:3`), and SQL events are immutable (`migrations/0001_canonical_core.sql:60-93`), but there are no actual projection tables/rebuilders and the site view is hard-coded. | High |
| 124 | One PostgreSQL source of truth | PARTLY TRUE | The production target schema is substantial, but README calls PostgreSQL the next gate/future production source (`README.md:63-65`) and the app schema is empty (`db/schema.ts:1-4`). | High |
| 124 | Structured projections are derived and replaceable | UNEVIDENCED | No projection schema or rebuilding service exists in the migrations. This is absence, not a contradictory implementation. | High |
| 124 | Full-text search is derived and replaceable | PARTLY TRUE | A generated `tsvector` and GIN index are real (`migrations/0001_canonical_core.sql:69-85`); no connected read API/site search or rebuild lifecycle is present. | High |
| 124 | pgvector embeddings are derived and replaceable | FALSE as an implementation claim | The vector extension is installed (`migrations/0001_canonical_core.sql:3`), but no migration defines embeddings, a vector column, or vector index. | High |
| 124 | Summaries are derived and replaceable | PARTLY TRUE | Report-generation code/tests exist (`package.json:39-40`; `tests/report-boundary.test.mjs:112-230`), but no persistent summary projection/rebuilder or site integration exists. | Medium-high |
| 124 | UI views are derived and replaceable | FALSE for this site | The event view is a hard-coded array (`app/page.tsx:5-10`), and the app DB schema is empty (`db/schema.ts:1-4`). | High |
| 127 | Clients: MCP, REST, SDK, CLI, Git | PARTLY TRUE | CLI and Git are real (`README.md:7-17`); MCP, REST, and published SDK are absent, and append/read API plus OpenAPI are roadmap (`README.md:63-65`). | High |
| 128 | Portable protocol | TRUE for Git v0 | Git v0 is a documented file/wire contract independent of provider (`PROTOCOL.md:1-16`) and the recorded proof crosses Anthropic/OpenAI actors (`actors/agent-a.yaml:3-6`; `actors/agent-b.yaml:3-6`). | High |
| 129 | Identity, addressing, approvals, context | PARTLY TRUE | Identity/actors and addressing are present in Git and SQL (`PROTOCOL.md:7-12`; `migrations/0001_canonical_core.sql:15-40,76-80`); approval-digest and authorized-context harnesses are tested (`tests/workspace-approval.test.mjs:41-64`; `tests/report-boundary.test.mjs:147-230`), but there is no unified deployed core. | High |
| 130 | Append + project | PARTLY TRUE | Git append is working (`packages/git-adapter/src/cli.mjs:130-149`); SQL project sequencing is schema only (`migrations/0001_canonical_core.sql:21-25,60-74`) without the connected append service described on the page. | High |
| 131 | PostgreSQL canonical events and derived state | PARTLY TRUE | Canonical event schema/immutability exist (`migrations/0001_canonical_core.sql:60-93`); no migrated projection/derived-state tables exist. | High |
| 131 | PostgreSQL pgvector | PARTLY TRUE | Extension enablement is real (`migrations/0001_canonical_core.sql:3`); embeddings/storage/search are not. | High |
| 131 | PostgreSQL outbox | FALSE as an implementation claim | No migration defines an outbox table or outbox delivery path. | High |
| 135 | Stored content stays untrusted; authority comes only from explicit policy | TRUE | Repository instructions state event bodies/artifacts are untrusted and cannot grant permission; README repeats this (`README.md:59`). SQL trust levels, RLS, and delegation checks reinforce it (`migrations/0001_canonical_core.sql:8,34-44,95-144`). | High |
| 136 | Every claim can point to author, cause, evidence, and hash-chain position | PARTLY TRUE | Actor, causal parent, event/artifact hashes are real (`PROTOCOL.md:11-16,30-34`); evidence attachment is optional, and Git v0 has no event hash-chain position. SQL chain fields are not a connected runtime. | High |
| 142, 152 | Give agents a shared place/shared project state | TRUE for the Git proof, PARTLY TRUE as product-wide claim | Registered actors share addressed, append-only repository state (`README.md:7-17`); the broader installed product suggested beside it does not exist. | High |
| 23, 144 | `npm install @engramport/sdk` | FALSE | The repo package is private and named `engramport` (`package.json:2-4`); registry lookup returned E404. | High |

## Remedies: build or change the claim

| Failure | Build remedy | Copy remedy | Recommendation now |
|---|---|---|---|
| Nonexistent SDK install | Publish a versioned `@engramport/sdk` with CI install smoke test and documented API | Replace with `git clone …`, `npm install`, `npm run proof` | **Change the claim now.** The real proof is already runnable. |
| Fake LIVE console | Connect the view to an authenticated event read API and render real canonical vocabulary/sequences | Label it “illustrative” or render the exact three-event Git proof with its real slugs, times, result, and digest | **Render the exact existing proof now**; build the live feed later. |
| Conflict-free | Build a transactional append service with serialization/idempotency and define conflict semantics | Say “append-only; conflicts are surfaced and never force-resolved” | **Change the claim.** This is more credible and matches the protocol. |
| MCP/REST/SDK client row | Ship and test each surface end-to-end | Mark CLI + Git “available now”; move others to roadmap | **Change the claim.** Do not advertise protocol surfaces as clients until they exist. |
| PostgreSQL source/runtime | Wire app/API to the SQL schema, implement append/read transactions, chain computation, projections, and operational deployment | Say “Git-verifiable proof today; PostgreSQL production architecture in progress” | **Change the claim now**, then earn the stronger version with an end-to-end proof. |
| Embeddings/outbox/projections | Add migrations, workers, retry semantics, rebuild tests, and connected UI/search | Remove those nodes or label them “planned” | **Remove from current-state diagram.** Full-text can remain if explicitly described as schema/tested work. |
| Safe retries | Accept a caller idempotency key in Git/API and test replay/crash boundaries | Say “safe exclusive append and whole-log verification” | **Change the claim** until idempotency is implemented. |
| Hash-chain position | Implement canonical chain computation at append and verify checkpoints independently | Say “author, causal parent, evidence digest, and Git ancestry” | **Change the claim** to the exact current provenance model. |

## What is genuinely true and should stay

- The repository has a real cross-provider Git relay with independently addressed work, causal replies, actor ownership, typed events, and deterministic event/artifact hashing (`README.md:5-17`).
- The protocol refuses overwriting via exclusive append, validates strict-relay structure, and makes conflicts visible rather than silently force-resolving them (`packages/git-adapter/src/cli.mjs:130-149`; `PROTOCOL.md:18-38`).
- The SQL work is not vapor: it includes tenant/project identity, RLS, immutable events, delegation enforcement, idempotency and chain fields, and full-text indexing (`migrations/0001_canonical_core.sql:11-144`). The inaccurate part is presenting it as this site's live connected source.
- Trust boundaries are unusually concrete: stored content is untrusted, authority is policy-derived, and approval/context boundaries have negative tests (`README.md:59`; `tests/workspace-approval.test.mjs:41-64`; `tests/report-boundary.test.mjs:147-230`).

## Real capabilities the site does not claim

1. **Security/custody mutation proofs.** The test suite includes DB-session binding, transaction binding, approval mutation refusal, report authorization/redaction, and DB lock discipline (`package.json:24-39`; `tests/workspace-approval.test.mjs:41-64`; `tests/report-boundary.test.mjs:147-230`). This is more differentiated than a generic architecture diagram.
2. **A durable authorized watch harness.** Port Watch requires an authorized inbox, persists cursor/WIP state, enforces one active run, and refuses non-operator rewinds (`packages/port-watch/src/index.mjs:5-50`). It should be advertised explicitly as a tested harness, not as the Git inbox itself.
3. **Independent third-provider critique.** Three provider actors are now registered (`actors/agent-a.yaml:2-6`; `actors/agent-b.yaml:2-6`; `actors/agent-c.yaml:2-6`), and the bounded agent-c supervisor has path/credential refusal and cost/relay measurement tests (`tests/agent-c-supervisor.test.mjs:58-110`).
4. **Authorized report assembly.** The report boundary validates authorization before retrieval, refuses unauthorized history/visibility, binds approvals to the evidence set, and proves restricted records do not alter public output (`tests/report-boundary.test.mjs:147-230`).
5. **Strict relay and proof verification at current scale.** The verifier covers event ownership, IDs, reply structure, hashes, targets, artifacts, and mode rules (`README.md:9-17`; `PROTOCOL.md:18-34`). Publishing the current verified counts and test commands would be more credible than a synthetic sequence number.

## Recommended truthful positioning

Lead with: **“A Git-verifiable collaboration proof for independently operated AI agents.”** Show the exact relay, current verifier output, and the security/mutation evidence. Describe PostgreSQL, API, SDK, MCP, embeddings, outbox, and live projections as the production architecture being built, not as a running product.

The narrowest high-value site change would be: replace the install command with the real proof commands; replace the “LIVE” synthetic console with the exact three-event proof; change “conflict-free” to “conflicts surfaced, never force-resolved”; and label the architecture “target production architecture.”

## Least-certain judgments

- **“Project-owned”** is technically supported by repository/tenant scoping, but legal or operational ownership is outside repository evidence; confidence is medium-high.
- **“Summaries”** is partly supported by report-generation components, but whether those reports are intended to count as the site's “summaries” is ambiguous; confidence is medium-high.
- The universal market statements about vendor lock-in, disappearing decisions, and copy/paste handoffs are **UNEVIDENCED**, not false; confidence is medium because validating them would require external user/market evidence rather than code.
