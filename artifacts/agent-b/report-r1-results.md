# Re:PORT R1 implementation result

Implementation commit: `95eebe3da48d98a4a8ee72563c59390943cca6e8`

Node: `v26.5.0`

## Result

Canonical R1 is complete. The two normative schemas are installed byte-for-byte, a dependency-free JSON Schema subset validator enforces their used vocabulary, and the report boundary validates all nine new payload kinds and all seven envelope view modes.

The authorized-input boundary binds exact event IDs, canonical evidence digests, project sequences and `as_of_seq`, tenant/project/principal, role and scopes, sensitivity ceiling, permitted visibility, history start, audience/view, authorization-policy revision, model identity, and reporter revision into `report-input-audit-v1`. `report-boundary-audit-v1` binds that input identity to the validated envelope digest and states `auditable_inputs_not_bit_reproducible_output`.

Generated output is explicitly labeled. `report.generated` is excluded by default, rejected from every report input even if returned by an authorized source, and permitted by the documented opt-in only for `diagnostic_audit`, never report generation.

## Authorization and disclosure design findings

Authorization is validated before `retrieveAuthorized` is invoked. The boundary refuses raw candidate arrays and accepts only an authorized-source interface. It then fail-closes if that source returns an event with a mismatched authorization-context digest, tenant/project, sensitivity, visibility, history window, `as_of_seq`, generated kind, or canonical evidence digest. R1 does not claim to implement retrieval: production R3 must enforce the same predicate inside the datastore query/RLS. The returned-record checks are a fail-closed boundary assertion, not post-filtering; an unauthorized record rejects the whole operation and is never converted into an omission.

The ID-3 synthetic control gives the boundary two repositories differing only by a restricted record. Authorization happens inside the synthetic source before candidate return, and the resulting authorized input bytes are identical. The input and audit records contain no hidden, omitted, excluded, or restricted counts or markers.

Public view requires `publishable: true`, a complete non-self human approval, and an action digest over the exact authorized evidence IDs/digests, project sequences, authorization context, and `as_of_seq`. Evidence changes invalidate approval. R1 performs no publishing and creates no connector.

## Artifact identities

```text
0a3de72b2289eecbab2c88c00b2244c2092a71a71d5b908aa5b445207666793d  schemas/report-envelope-v1.schema.json
de67f74620d06ec9806398ad914735762ad6554ebd319e97d4598ce04950fa33  schemas/report-inputs-v1.schema.json
ccd8372147e6ca76bdc66284c3aa12bdf1968e2ccfec8ce250107e64850317f2  packages/git-adapter/src/report-boundary.mjs
401e18aa6ebec14e382c7008dd5b2b97fb46db514df6f0e2ad7951d38f7fdd23  tests/report-boundary.test.mjs
```

## Exact R1 tests

Command: `npm run report:test`

```text
PASS normative report schemas are installed byte-for-byte
PASS well-formed envelopes: live_feed, terminal_ticker, daily_briefing, executive_view, technical_view, public_view, collaborator_briefing
PASS well-formed payloads: progress.published, risk.raised, risk.retired, blocker.raised, blocker.cleared, test.recorded, incident.opened, incident.resolved, report.generated
PASS fact ids present in source_event_ids validate
PASS generated evidence exclusion has an explicit diagnostic-only opt-in positive control
PASS public input requires allowlisted evidence and human approval but performs no publication
PASS malformed envelope refused: unknown field
PASS malformed envelope refused: missing generated label
PASS malformed envelope refused: false generated label
PASS malformed envelope refused: empty fact event_ids
PASS malformed envelope refused: absent fact event_ids
PASS malformed envelope refused: cited id absent from sources
PASS malformed envelope refused: inference missing basis
PASS malformed envelope refused: inference missing confidence
PASS malformed envelope refused: empty source_event_ids
PASS public_view without publication refused
PASS public_view above public sensitivity refused
PASS progress.published refuses notes
PASS progress.published refuses reasoning
PASS progress.published refuses thoughts
PASS progress.published refuses scratchpad
PASS test.recorded requires negative_controls_ran
PASS authorization validates before authorized-source invocation
PASS raw candidate sources structurally refused
PASS unauthorized authorization-context digest refused
PASS evidence above sensitivity ceiling refused
PASS unauthorized visibility refused
PASS cross-project evidence refused
PASS post-as_of_seq evidence refused
PASS generated-as-evidence refused
PASS evidence digest mismatch refused
PASS evidence outside authorized history refused
PASS public evidence outside publishable allowlist refused
PASS public self-approval refused before retrieval
PASS public missing human approval refused before retrieval
PASS public approval digest invalidated by evidence-set change
PASS authorized output byte-identical whether restricted records exist or not
PASS input identity binds event ids, evidence digests, as_of_seq, authorization, model, and reporter revision
PASS envelope matches authorized input exactly
PASS audit record binds input and envelope while disclaiming bit reproducibility
tests 54; pass 54; fail 0
```

Specific fail-closed codes exercised: `SCHEMA_INVALID`, `AUTHORIZATION_MALFORMED`, `AUTHORIZED_SOURCE_REQUIRED`, `EVIDENCE_UNAUTHORIZED`, `EVIDENCE_CROSS_PROJECT`, `EVIDENCE_AFTER_AS_OF`, `GENERATED_EVIDENCE_FORBIDDEN`, `EVIDENCE_DIGEST_MISMATCH`, `PUBLIC_ALLOWLIST_REQUIRED`, `PUBLIC_APPROVAL_REQUIRED`, `PUBLIC_SELF_APPROVAL_FORBIDDEN`, `PUBLIC_APPROVAL_DIGEST_MISMATCH`, `FACT_SOURCE_MISSING`, and `ENVELOPE_INPUT_MISMATCH`.

## Regression output

```text
npm run report:test   exit 0  tests 54  pass 54  fail 0
npm run proof         exit 0  tests 33  pass 33  fail 0
  live proof state: 56 events across 19 threads and 2 actors
npm run welcome:test  exit 0  tests 19  pass 19  fail 0
npm run lint          exit 0
```

Reproduction:

```sh
npm run report:test
npm run proof
npm run welcome:test
npm run lint
```

## Scope

Changed only the two verbatim R1 schemas, the report boundary module, its synthetic Node tests, and the `report:test` script. No generator, model call, retrieval backend, rendering, storage, publishing, connector, database, R2+ task, onboarding T2, W1-5–W1-7, or Port Watch work was added. No secret-bearing fixture exists. The unrelated PNG remains untracked.
