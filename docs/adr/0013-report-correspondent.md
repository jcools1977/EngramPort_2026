# ADR 0013: Re:PORT, generated reporting, and external publication

Status: proposed
Date: 2026-08-14
Amends: `ENGRAMPORT_ENGINEERING_SPEC.md` sections 5.4, 25, and 30
Depends on: ADR 0001, 0002, 0008, 0011, and ADR 0012

## Context

Re:PORT is a read-only, provenance-backed correspondent that turns accepted events into an audience-shaped narrative. Reconciling it against the engineering specification surfaces one conflict requiring promotion, one requiring a new trust boundary, and three decisions that the specification implies but does not state.

**Most of Re:PORT is already sanctioned.** Section 9.3 requires that generated summaries cite source event ids and be labeled generated. Section 10 requires that extraction treat event content as quoted evidence, forbid embedded instructions, require exact evidence ids, and return schema-constrained JSON. Section 25 anticipates `apps/web/`. Section 5.4 anticipates new kinds through a registry. A reporting layer that reads authorized events and labels its output is a natural consequence of the specification rather than a departure from it.

**The exception is Public view.** Nothing in the specification contemplates publishing tenant project content to the open internet. Section 6.3 classifies both data-export and external-communication as consequential action classes where self-approval is prohibited. A build-in-public feed is simultaneously both. Section 30 defers external connectors as future work. External publication is therefore not merely a feature of a reporting product; it is a new egress boundary, and the specification's silence is not permission.

## Decision

**1. Re:PORT holds no authority over project facts.** Its actor carries `events:read` within an audience policy plus a narrow `reports:write` scope that can produce only `report.generated` events and report artifacts. It MUST NOT hold `events:write` for any other kind, `approvals:decide`, `memory:accept`, or any assignment or execution scope. Reading a report grants its reader nothing.

**2. Generated output is non-canonical, and this is enforced by exclusion rather than by labeling alone.** Reports are derived artifacts or explicitly labeled `report.generated` events. **Re:PORT output is excluded from Re:PORT input by default, and from memory extraction evidence sets.** Labeling alone is insufficient: without exclusion, a report cites a prior report, confidence compounds with retelling, and an inference becomes a fact by repetition. Section 10 forbids fabricating consensus; this closes the slower path to the same outcome.

**3. Verified facts and inferences are separated structurally, not rhetorically.** The envelope carries two distinct arrays. Every entry in `verified_facts` MUST carry at least one supporting event id that the audience is authorized to read. Anything not so supported belongs in `inferences` and is labeled. A validator enforces this, so a model cannot satisfy the requirement by hedging its prose.

**4. Each view is an authorization context, not a display filter.** A view is computed under its audience's policy with inaccessible evidence excluded before retrieval, per sections 8 and 9.2. Post-filtering a shared result set is prohibited, because by then the content has already entered the generation path and the model's output may reflect what it saw.

**5. Public view publishes from an explicit allowlist, never a redaction pass.** Only evidence carrying an explicit, per-item publishable marking may appear. Redaction-based publishing fails open: a new field, a new kind, or an unanticipated payload shape becomes public by default. Allowlisting fails closed.

**6. Publication to Public view is a human-gated consequential action** per section 6.3, bound to an action digest over the exact evidence set, with self-approval prohibited and Re:PORT itself unable to approve. This promotes a narrow external-publication capability from section 30 future work, limited to publishing allowlisted project evidence to a project-owned surface. General external connectors remain deferred.

**7. New event kinds are added through the section 5.4 registry, reusing existing kinds wherever they exist.** `decision.*`, `task.*`, `handoff.*`, `artifact.*`, `approval.*`, `checkpoint.created`, and `message.published` are reused unchanged. New: `progress.published`, `risk.raised|retired`, `blocker.raised|cleared`, `test.recorded`, `incident.opened|resolved`, `report.generated`. A parallel reporting taxonomy over the same facts is rejected, because two vocabularies for one fact is how projections begin to disagree.

**8. `progress.published` has typed fields and no free-form body.** This is the structural control against publishing hidden reasoning. Re:PORT can only report what was published as an event; an agent with no free-form field cannot casually paste deliberation into the record. Redaction and secret detection run as defense in depth, never as the primary control.

**9. Reports are auditable, not bit-reproducible, and the product MUST NOT claim otherwise.** The reproducible object is the input set: event ids, artifact digests, `as_of_seq`, audience policy version, generator model and revision. Regeneration may differ in prose. Claiming determinism from a nondeterministic generator would violate section 15's rule against collapsing uncertainty.

**10. Re:PORT shares the retrieval and delivery cores rather than reimplementing them.** Authorization-before-retrieval is shared with Port Context and Port Package; webhook-first delivery with cursor polling recovery is shared with Port Watch. Three implementations of authorization-before-retrieval would be three chances to leak.

**11. Unchanged project state MUST NOT trigger a model invocation**, for the same reason as in Port Watch: it bounds cost and bounds who can cause a generation.

## Alternatives considered

- **Reports as canonical events.** Simpler retrieval, and rejected: it makes the correspondent a source, which is the failure this whole design is organized against.
- **Labeling generated output without excluding it from evidence.** Cheaper, and rejected: labels are respected until a downstream consumer is written by someone who did not read this ADR.
- **One result set with per-view display filtering.** Much simpler, and rejected: the content has already entered generation before the filter runs.
- **Public view by redaction.** The obvious implementation, and rejected because it fails open on every field nobody anticipated.
- **A separate reporting event taxonomy.** Cleaner for Re:PORT in isolation, and rejected because it duplicates facts already carried by decision, task, and handoff kinds.
- **Deferring Public view entirely.** Genuinely viable and the lowest-risk option. Rejected because build-in-public is a stated product goal, but the allowlist plus human gate is what makes it acceptable, and if either control is dropped this alternative should be revisited rather than shipped without them.

## Consequences

- Section 30 gains a narrow promotion for external publication of allowlisted project evidence; other connectors stay deferred.
- Section 5.4 gains registry entries for the new kinds.
- Section 25 gains `apps/report/` and `packages/report/`.
- A publishable marking must exist on evidence, which is a new field with its own authorization: marking something publishable is itself a permission-bearing act and cannot be self-service for untrusted actors.
- Retrieval gains a default exclusion for `report.generated`, which every consumer inherits.
- The collaborator briefing overlaps Port Package deliberately and must not be merged with it; one carries a signed grant and the other carries prose.

## Operational trigger for reconsideration

Reopen if any of the following occur: the allowlist proves unusable and pressure builds to publish by redaction; generated reports are found in an evidence set or memory proposal, indicating decision 2 was not enforced structurally; audience-specific retrieval proves too costly and pressure builds toward shared-result filtering; or a leak test finds cross-audience disclosure in any view, which would mean decision 4 was implemented as a filter after all.

## Security impact

Re:PORT is a read-heavy component whose output is consumed by humans who will reasonably trust it, and one of whose views points at the open internet. The controls carrying that risk are: no authority beyond audience-scoped read and narrow report writing; structural fact and inference separation; exclusion of generated output from evidence; per-audience authorization before retrieval; allowlist-only publication with a human gate and no self-approval; typed progress payloads with no free-form field; and secret detection before generation. Dropping any one of these does not degrade Re:PORT gracefully. Dropping exclusion produces a system that believes its own summaries; dropping the allowlist produces a system that publishes whatever nobody thought to hide.
