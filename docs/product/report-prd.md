# PRD: Re:PORT, the project correspondent

Status: proposed
Owner: agent-a (architecture)
Date: 2026-08-14
Related: `docs/adr/0013-report-correspondent.md`, `docs/architecture/port-family.md`, `docs/security/report-authorization-and-redaction.md`, `docs/security/report-threat-cases.md`, `docs/plan/report-plan.md`

> **Your agents build. Re:PORT tells the story.**

## 1. Problem

When agents work continuously and humans are not in the loop for every turn, the project becomes real and simultaneously becomes invisible. The log holds everything and is unreadable at human pace. The alternative in practice is a human reading raw events, or worse, trusting a chat summary with no provenance and no way to tell what was verified from what was guessed.

Teams need a correspondent: something that reads only what it is authorized to read, tells the truth about what happened, says plainly which parts are established and which are inference, and never quietly becomes the source of the facts it reports.

## 2. What Re:PORT is

A **read-only, provenance-backed project correspondent**. It transforms accepted EngramPort events into a live construction narrative for humans, in several audience-shaped views.

It has **no write, assignment, approval, or execution authority** over project facts. Its only writes are records of its own generation activity, and those are labeled generated and are excluded from evidence by default.

## 3. What Re:PORT must never expose

Private model reasoning, hidden chain-of-thought, secrets, credentials, and raw internal deliberation.

The control is structural rather than a filter. **Re:PORT can only read accepted events.** Reasoning that was never published cannot be reported. This moves the burden to the right place: agents publish *intentional, structured* progress updates, and the progress payload is a set of typed fields rather than a free-form dump, so an agent cannot casually paste deliberation into the record and have it surface in a briefing.

A redaction pass runs as defense in depth, and secret detection runs before any generation or external model call per specification sections 10 and 23.3. Neither is the primary control, because filtering after the fact fails open.

## 4. Users and views

| View | Audience | Shape |
|---|---|---|
| **Live feed** | The working team | Chronological, continuously updated construction-site narrative |
| **Terminal ticker** | Agents and humans in Claude Code, Codex CLI, other terminals | Compact, one to three lines per update, plain text |
| **Daily briefing** | The team and its lead | Bounded summary: accomplishments, decisions, failures, costs, next work |
| **Executive view** | Sponsors | Outcomes, milestones, risks, approvals, budgets, delivery confidence |
| **Technical view** | Engineers | Commits, schemas, migrations, tests, artifacts, incidents, ADRs |
| **Public view** | External | Deliberately sanitized build-in-public feed, explicitly publishable evidence only |
| **Collaborator briefing** | An invited human or agent | Project introduction: current state, active decisions, open work, provenance, and the participant's first handoff |

Views are **separate authorization contexts, not display filters over one result set.** A view is computed for a specific audience under that audience's policy, and evidence the audience cannot access is excluded before retrieval, never after. See `docs/security/report-authorization-and-redaction.md`.

The collaborator briefing deliberately overlaps Port Package. Port Package carries the signed grant and is authority; the collaborator briefing is the human-readable narrative of the same arrival and carries none. They must not be merged, because one is a credential and the other is prose.

## 5. Every story's obligations

Every generated report MUST:

1. Identify its supporting event ids.
2. Link relevant artifacts, tests, decisions, and commits.
3. Distinguish verified facts from generated inference, structurally rather than by wording.
4. Identify the responsible human or agent.
5. Explain what happened and why it matters.
6. State current status, risks, blockers, and next expected action.
7. Display confidence and uncertainty where relevant.
8. Be clearly labeled as generated.
9. Respect tenant, project, visibility, and sensitivity policy.
10. Exclude inaccessible evidence before retrieval and before summarization.
11. Carry no write, assignment, approval, or execution authority.

Obligation 3 is the one that decides whether the product is trustworthy. A `verified_fact` MUST carry at least one supporting event id and MUST be a restatement of what that event says. An `inference` is anything else, MUST be labeled, and MUST NOT be promoted into facts by a later report. The envelope enforces this by shape, not by asking a model to be careful.

## 6. Structured inputs

Re:PORT reads existing event kinds where they exist and adds kinds only where the specification genuinely lacks them. Reusing `decision.*`, `task.*`, `handoff.*`, `artifact.*`, and `approval.*` from section 5.4 rather than inventing a parallel taxonomy is deliberate: two vocabularies for the same facts is how projections start disagreeing.

Existing, reused unchanged: `decision.proposed|recorded|superseded|retracted`, `task.created|assigned|started|blocked|completed|cancelled`, `handoff.created|claimed|completed|declined`, `artifact.registered|revised|verified|withdrawn`, `approval.requested|granted|denied|expired|consumed`, `checkpoint.created`, `message.published`.

New kinds, each requiring a schema registry entry per section 5.4:

- `progress.published` — an intentional structured update from a working agent
- `risk.raised`, `risk.retired`
- `blocker.raised`, `blocker.cleared` — distinct from `task.blocked`, which is one task's state; a blocker may span tasks and have no task at all
- `test.recorded` — suite, result counts, failures, and whether negative controls ran
- `incident.opened`, `incident.resolved`
- `report.generated` — Re:PORT's own output record, non-canonical by construction

`progress.published` is where the chain-of-thought risk concentrates, so its payload is typed fields: `summary`, `what_changed`, `why_it_matters`, `status`, `next`, `evidence_event_ids`, `artifact_refs`, `commit_refs`, `confidence`. There is no free-form `notes` field, and that absence is the design.

## 7. Reproducibility, honestly

Reports MUST be auditable. They MUST NOT be claimed to be bit-reproducible.

What is reproducible is the **input set**: given a `report_id`, the exact event ids, artifact digests, `as_of_seq`, audience policy version, generator model and revision are all recorded, so any reviewer can reconstruct precisely what evidence produced a report. Regenerating from identical inputs may yield different prose, because language models are not deterministic, and claiming otherwise would violate the honesty rule of section 15.

The consequence to design around: the audit question is "was this report supported by its evidence", not "does regeneration match".

## 8. Non-canonicity

Generated reports are stored as derived artifacts, or as `report.generated` events explicitly labeled generated. They MUST NOT become canonical project facts merely because Re:PORT stated them.

The enforcement that matters: **Re:PORT output is excluded from Re:PORT input by default, and from memory extraction evidence.** Without this the system cites its own summaries as sources, and confidence compounds with each retelling until an inference has become a fact by repetition. Section 10 already forbids fabricating consensus; this is the same failure with a longer fuse.

## 9. Delivery

Webhook-first with cursor-based polling recovery, sharing the delivery core with Port Watch rather than reimplementing it. **Unchanged project state MUST NOT trigger a model invocation.** As in Port Watch, this is a cost control and a blast-radius bound at once: a party who cannot change authorized project state cannot cause a generation.

## 10. Success criteria

1. Every published report passes envelope validation, and every verified fact resolves to an event the audience may read.
2. A reviewer can reconstruct the exact evidence set of any report from its `report_id`.
3. No report has ever surfaced content the reading audience was not authorized to see, proven by tenant and sensitivity leak tests across all seven views.
4. Public view has published only explicitly allowlisted evidence, and publication was human-approved.
5. Zero model invocations occurred while project state was unchanged.
6. No generated report has ever entered an evidence set or a memory proposal.
7. Terminal ticker is usable in Claude Code and Codex CLI without a browser.

## 11. Non-goals

- Not a chat interface and not a query assistant.
- Not an approval or assignment surface. Reading a report never grants the reader an action.
- Not a metrics dashboard; section 19 observability is separate.
- Not a replacement for Port Context. Humans read Re:PORT; models read Port Context.
- Not a system of record. It is a correspondent, and correspondents do not get to make the news.
