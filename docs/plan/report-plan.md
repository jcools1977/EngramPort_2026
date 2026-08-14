# Re:PORT implementation plan, bounded tasks, and acceptance tests

Status: proposed. **No task in this document is dispatched.** See section "Dispatch status".
Owner: agent-a (architecture)
Date: 2026-08-14
Related: `docs/product/report-prd.md`, `docs/adr/0013-report-correspondent.md`, `docs/security/report-authorization-and-redaction.md`, `docs/security/report-threat-cases.md`, `docs/schemas/report-envelope-v1.schema.json`, `docs/schemas/report-inputs-v1.schema.json`

## Dispatch status

Re:PORT is specified and **not scheduled**. No R-task may be handed to agent-b until the open workstreams have an authoritative priority order and agent-b has confirmed capacity. The priority decision is thread `priority` in the event log. R1 below is fully specified so that it can be dispatched without further design work once that gate clears, not so that it can be started now.

## Sequencing constraints

1. **R1 and R2 are Node-only and provable today.** Everything from R3 onward needs a live PostgreSQL, which no agent environment has yet. This is the same blocker as the open v0.1 thread and phase W2 of the wizard.
2. **Re:PORT shares two cores rather than owning them.** The retrieval and authorization core is shared with Port Context and Port Package; the delivery core is shared with Port Watch. R4 and R7 consume work that belongs to those components, and building either core inside Re:PORT is a defect, not a shortcut.
3. **Public view is last on purpose.** It is the only view that points at the internet, and it should be built after the authorization model has been exercised by six other views.

## Phases and bounded tasks

### R1. Report envelope schema, validator, and non-canonicity enforcement

Runnable now. **This is the first task, and it is not yet dispatched.**

Install `report-envelope-v1` and `report-inputs-v1` from `docs/schemas/` verbatim into `schemas/`, implement a validator, and enforce the two properties most likely to erode: fact and inference separation, and the exclusion of generated output from evidence.

Scope: the two schemas; an envelope validator; a payload validator for the new kinds; the evidence-exclusion gate for `report.generated`; the referential rule that every fact's `event_ids` are a subset of `source_event_ids`. No generation, no model call, no retrieval, no rendering.

**Positive acceptance tests**
1. A well-formed envelope for each of the seven view modes validates.
2. A well-formed payload for each new kind validates: `progress.published`, `risk.raised`, `risk.retired`, `blocker.raised`, `blocker.cleared`, `test.recorded`, `incident.opened`, `incident.resolved`, `report.generated`.
3. A fact citing an event present in `source_event_ids` is accepted.
4. With the documented opt-in flag set, a `report.generated` event does appear in an evidence set, proving the exclusion is a real gate rather than an accident of the fixture.
5. A `public_view` envelope carrying a complete `publication` block, `sensitivity: public`, and `visibility: public` validates.

**Negative acceptance tests**, each asserting the specific error
6. Envelope with any unknown field is rejected.
7. Envelope missing `generated`, or with `generated: false`, is rejected.
8. A `verified_facts` entry with an empty or absent `event_ids` is rejected.
9. A `verified_facts` entry citing an id absent from `source_event_ids` is rejected.
10. An `inferences` entry missing `basis` or `confidence` is rejected.
11. A `public_view` envelope without `publication` is rejected; likewise one with `sensitivity` above `public`.
12. `progress.published` carrying `notes`, `reasoning`, `thoughts`, or `scratchpad` is rejected. This is threat case ID-7.
13. `test.recorded` without `negative_controls_ran` is rejected.
14. A `report.generated` event is absent from a default evidence set. This is threat case PI-6.
15. An envelope with `source_event_ids` empty is rejected.

Additional criteria: Node only, no new dependency, no network; state the Node version; `npm run proof` and `npm run welcome:test` still pass; every negative has a paired positive; no secret in any fixture.

### R2. Deterministic evidence assembly and the unchanged-state gate

Runnable now, with retrieval behind an interface.

Assemble an evidence set from an authorized source, compute an `as_of_seq`, and decide whether anything changed. Shares the Port Watch delivery decision core.

Positive: identical state yields an identical evidence set and identical `as_of_seq`; a new authorized event changes both. Negative: **zero model invocations when project state is unchanged**, asserted as exactly zero; an unauthorized event changes neither the evidence set nor `as_of_seq` and triggers no generation.

### R3. Audience-scoped authorized retrieval

Blocked on a database host. Implements section 1 of the authorization rules: one authorized query per view, no shared candidate set, all four dimensions applied before selection.

Positive: each audience receives exactly what its policy allows. Negative: threat cases ID-1, ID-2, ID-8, and the prohibition on any code path that assembles once and narrows per view.

### R4. Generation with schema-constrained output

Blocked on R3. Generator invocation with quoted-evidence prompting per specification section 10, schema-constrained output, and rejection of any envelope failing validation.

Positive: a report generated over a known evidence set states the facts those events support. Negative: threat cases PI-1, PI-2, PI-3, PI-4, PI-5, PI-7.

### R5. The six internal views

Blocked on R4. Live feed, terminal ticker, daily briefing, executive view, technical view, collaborator briefing.

Positive: each renders within its budget and preserves generated labeling, including the ticker where space pressure makes dropping the label tempting. Negative: threat cases ID-3, ID-4, ID-9, with the byte-identical-output assertion of ID-3 as the headline control.

### R6. Public view, allowlist, and the publication gate

Blocked on R5. Last by design.

Positive: allowlisted evidence with a valid approval publishes. Negative: threat case ID-5, plus digest invalidation on evidence change, plus self-approval refusal, plus an empty public report when nothing is marked publishable.

### R7. Delivery, storage, and audit

Blocked on R3. Webhook-first with cursor polling recovery, consuming the shared delivery core; report storage as derived artifacts and `report.generated` events; the audit record of section 9 of the authorization rules, including per-dimension exclusion counts.

Positive: a reviewer reconstructs any report's exact evidence set from its `report_id`. Negative: threat case ID-6, and a detector failure that fails closed.

## Cross-cutting acceptance

Beyond per-task tests, Re:PORT is not done until:

1. Every threat case in `docs/security/report-threat-cases.md` has a passing negative control and a paired positive control.
2. A tenant-leak suite runs across all seven views and all retrieval paths, not only the chronological one.
3. Zero generated reports have entered an evidence set or a memory proposal.
4. The product claims auditability and not reproducibility anywhere in its copy, per ADR 0013 decision 9.
5. Specification section 31's definition of done is met for each task.
