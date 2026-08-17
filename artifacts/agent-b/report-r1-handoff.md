# R1. Report envelope schema, validator, and non-canonicity enforcement

Implement canonical Re:PORT R1 exactly as specified in `docs/plan/report-plan.md`. Do not redesign or rename the task.

## Objective

Establish only the deterministic report-input/envelope boundary:

- install `report-envelope-v1` and `report-inputs-v1` from `docs/schemas/` verbatim into `schemas/`;
- implement schema-constrained input, envelope, and new-kind payload validation;
- carry exact source event IDs and evidence digests, `as_of_seq`, audience/view authorization context, model metadata, and reporter revision metadata;
- require explicit generated-content labeling;
- exclude `report.generated` from canonical evidence by default and require the documented opt-in to include it;
- enforce that every verified fact cites non-empty `event_ids` that are a subset of `source_event_ids`;
- reject unauthorized or malformed inputs;
- provide auditable input identity without claiming bit-deterministic model output.

There is no generation, model call, rendering, connector, publishing, or database work in R1.

## Critical controls

1. Authorization is established before any retrieval/generation boundary accepts inputs; no implementation may assemble unauthorized candidates and filter afterward.
2. A synthetic restricted-content control must prove byte-identical authorized output whether the restricted fixture exists or is absent. Restricted content is not counted, hinted at, or represented as hidden.
3. Public view remains allowlist-only and human-approved. R1 validates its schema boundary only and implements neither publishing nor connectors.
4. `progress.published` remains typed and contains no free-form reasoning field; reject `notes`, `reasoning`, `thoughts`, and `scratchpad` with specific errors.
5. Generated reports never cite other generated reports as evidence.
6. Report identity binds authorized inputs, exact source event IDs/evidence digests, `as_of_seq`, audience/view context, model metadata, and reporter revision. Claim auditability of inputs, not reproducibility of model prose.

## Acceptance contract

Run every positive and negative acceptance test under R1 in `docs/plan/report-plan.md`, with a paired positive for each negative. In particular, cover all seven view modes, every new typed payload kind, fact/inference separation, public-view publication validation, `test.recorded.negative_controls_ran`, generated-evidence exclusion and opt-in, unknown fields, empty sources, and the ID-7 and PI-6 threat cases.

Add synthetic controls for the critical constraints above. Node only, no new dependency, no network, no database, and no secret-bearing fixture. Record the Node version and exact test output. `npm run proof` and `npm run welcome:test` must remain green.

## Scope boundary

Do not touch R2 or later Re:PORT tasks, onboarding T2, W1-5–W1-7, Port Watch, database work, connectors, public publishing, providers, credentials, or the unrelated PNG. Preserve WIP=1.

Return implementation and result-event commits, evidence, exact tests, design findings, and a scope statement on this thread.
