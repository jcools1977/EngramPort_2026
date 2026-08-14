# Re:PORT authorization and redaction rules

Status: proposed
Owner: agent-a (architecture)
Date: 2026-08-14
Normative. Binding on implementation. Related: `docs/adr/0013-report-correspondent.md`, `docs/security/report-threat-cases.md`

## 1. The ordering rule

**Authorization precedes retrieval, and retrieval precedes generation.** Evidence the audience may not read MUST be excluded before candidate selection, per specification sections 8 and 9.2.

Post-filtering is prohibited. By the time a filter runs on a shared result set, the content has already entered the generation path, and a model that has seen restricted content can leak it through paraphrase, framing, or omission patterns without ever quoting it. There is no way to test that away afterwards.

Concretely: there is no code path where a candidate set is assembled once and then narrowed per view. Each view issues its own authorized query.

## 2. Re:PORT's own authority

The Re:PORT actor holds:

- `events:read`, scoped to the audience policy of the report being generated
- `reports:write`, which can produce only `report.generated` events and report artifacts

It MUST NOT hold `events:write` for any other kind, `approvals:decide`, `memory:accept`, `artifacts:write` outside its report prefix, `subscriptions:manage`, `admin:project`, or any assignment or execution scope.

Re:PORT MUST NOT be able to approve its own publication. Self-approval is prohibited for data-export and external-communication actions per specification section 6.3, and Public view is both.

**Reading a report grants the reader nothing.** A report naming an expected next actor does not assign work; `next_expected_action` is a statement, not an instruction, and no consumer may treat it as one.

## 3. Four authorization dimensions

Every candidate event is filtered on all four before it can enter a report. Failing any one excludes it.

1. **Tenant.** `tenant_id` must match the report's tenant. Enforced by forced RLS, not by application logic alone.
2. **Project.** The audience principal must hold membership, or a server-validated share grant.
3. **Visibility.** `private` is excluded from all reports. `thread` is included only for reports scoped to that thread and only for audiences with access to it. `project` is available to project audiences. `public` is necessary but not sufficient for Public view; see section 5.
4. **Sensitivity.** Each audience carries a maximum sensitivity ceiling. Content above the ceiling is excluded before retrieval.

| Audience | Max sensitivity | Notes |
|---|---|---|
| technical | confidential | No `restricted` without an explicit per-report grant |
| team | confidential | |
| executive | confidential | |
| agent (terminal ticker) | internal | An agent terminal is frequently shoulder-surfable and often logged |
| collaborator | internal | Guests default to `untrusted_agent`; see the onboarding design |
| public | public | Necessary, not sufficient |

`restricted` content requires an explicit, audited per-report grant and never appears by default in any view.

## 4. Redaction is defense in depth, never the primary control

The primary control against exposing reasoning, secrets, and deliberation is **structural**: Re:PORT can read only accepted events, and `progress.published` has typed fields with no free-form body. Content that was never published cannot be reported.

Redaction runs anyway, before generation and before any external model call:

- Secret and credential detection per specification sections 10 and 23.3. A detected secret quarantines the event from the evidence set entirely; it is not masked in place, because a masked secret still tells a reader that a secret exists at that location and still may be partially reconstructable.
- Detected secrets raise an auditable event. A secret reaching an event body is an incident, not a redaction success story.
- Redaction failures fail closed: if the detector errors, the event is excluded.

Nothing in this section is permitted to be the reason a piece of content is safe. If the only thing keeping something out of a report is a regex, the design is wrong.

## 5. Public view: allowlist only

Public view MUST publish only evidence carrying an explicit `publishable: true` marking on the event payload.

- Absent or false means not publishable. There is no inference from `sensitivity: public`, from visibility, from age, or from anything else.
- Marking evidence publishable is a permission-bearing act requiring `contributor` or above; it is never self-service for `untrusted_agent` actors, and a guest cannot mark their own content publishable.
- Every publication is a consequential action bound to an `action_digest` over the exact evidence set, human-approved, with self-approval prohibited. A change to the evidence set invalidates the approval.
- Publication records `publication.approval_event_id`, `action_digest`, and `approved_by_principal_id` in the envelope, so an auditor can answer who authorized this going out.

Redaction-based publishing is prohibited. It fails open on every field, kind, and payload shape nobody anticipated, and the failure is invisible until it is public.

## 6. Generated output exclusion

`report.generated` events and report artifacts are excluded by default from:

- Re:PORT evidence sets
- memory extraction candidate sets
- hybrid, lexical, and semantic retrieval used to build context packages

Inclusion requires an explicit opt-in flag at the call site, and any call site setting it must document why. This exists because without it, reports cite reports, inference is restated as fact, and confidence compounds with each retelling until nobody can find the original claim.

## 7. Fact and inference separation

- Every `verified_facts` entry MUST carry at least one `event_ids` entry, and every one of those events MUST be present in `source_event_ids` and MUST have passed all four authorization dimensions for this audience.
- A fact whose supporting event is not authorized for this audience is not downgraded to an inference. It is **removed entirely**, along with any inference that reveals it. Downgrading leaks the existence of the content.
- `inferences` entries carry a `basis` and a `confidence` and are labeled in every rendering, including the terminal ticker, where space pressure makes dropping the label tempting.
- A validator enforces both rules. A model cannot satisfy them by hedging its prose.

## 8. Cross-audience consistency

Two reports over the same period for different audiences will legitimately differ in content. They MUST NOT contradict each other on facts both are authorized to state. Where an audience cannot see the evidence for a fact, the report omits the fact rather than stating a vaguer version of it, because a vaguer version is still a disclosure and is also less honest.

## 9. What must be audited

Per specification section 14.9, every generation records the exact evidence set supplied. Additionally: the audience policy version, the sensitivity ceiling applied, the count of candidates excluded by each of the four dimensions, any redaction quarantine, the generator model and revision, and `as_of_seq`.

The exclusion counts matter. A view that suddenly excludes nothing is either a policy change or a bug, and without the count nobody will notice which.
