import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  assembleAuthorizedReportInput, auditReportBoundary, authorizationContextDigest, canonicalJson,
  evidenceDigest, publicationActionDigest, selectEvidenceCandidates, validateReportEnvelope, validateReportPayload
} from "../packages/git-adapter/src/report-boundary.mjs";

const root = path.resolve(import.meta.dirname, "..");
const tenant = "10000000-0000-4000-8000-000000000001";
const project = "10000000-0000-4000-8000-000000000002";
const principal = "10000000-0000-4000-8000-000000000003";
const actor = "10000000-0000-4000-8000-000000000004";
const approver = "10000000-0000-4000-8000-000000000005";
const event1 = "10000000-0000-4000-8000-000000000011";
const event2 = "10000000-0000-4000-8000-000000000012";
const reportId = "01a10000-0000-7000-8000-000000000021";
const digest = "ab".repeat(32);

function authorization(overrides = {}) {
  return {
    principal_id: principal, tenant_id: tenant, project_id: project, audience: "team", view_mode: "live_feed",
    role: "contributor", scopes: ["events:read"], sensitivity_ceiling: "internal", allowed_visibilities: ["project"],
    history_start_seq: 0, policy_revision: "report-auth-v1", publication_approval: null, ...overrides
  };
}

function request(auth = authorization(), overrides = {}) {
  return { authorization: auth, as_of_seq: 20, model_identity: "synthetic/model-v1", reporter_revision: "reporter-r1", ...overrides };
}

function evidence(auth, overrides = {}) {
  const record = {
    event_id: event1, tenant_id: tenant, project_id: project, project_seq: 10, kind: "progress.published",
    sensitivity: "internal", visibility: "project", payload: { summary: "Implemented boundary", publishable: true }, content_sha256: "", authorization_context_sha256: authorizationContextDigest(auth),
    ...overrides
  };
  record.content_sha256 = evidenceDigest(record);
  return record;
}

function source(records, calls = []) {
  return { async retrieveAuthorized(query) { calls.push(query); return records; } };
}

function publicFixture({ publishable = true } = {}) {
  const auth = authorization({ audience: "public", view_mode: "public_view", sensitivity_ceiling: "public", allowed_visibilities: ["public"], publication_approval: { approval_event_id: event2, action_digest: digest, approved_by_principal_id: approver } });
  const record = evidence(auth, { sensitivity: "public", visibility: "public", payload: { summary: "Public fact", ...(publishable ? { publishable: true } : {}) } });
  auth.publication_approval.action_digest = publicationActionDigest(auth, 20, [record]);
  record.authorization_context_sha256 = authorizationContextDigest(auth);
  return { auth, record };
}

async function inputFor(auth = authorization(), records = null, overrides = {}) {
  const items = records ?? [evidence(auth)];
  return assembleAuthorizedReportInput(request(auth, overrides), source(items));
}

function envelope(viewMode = "live_feed", overrides = {}) {
  const isPublic = viewMode === "public_view";
  return {
    schema_version: 1, report_id: reportId, tenant_id: tenant, project_id: project,
    audience: isPublic ? "public" : "team", view_mode: viewMode, headline: "Boundary verified",
    narrative: "Generated synthesis.", why_it_matters: "Inputs are auditable.",
    responsible_actors: [{ actor_id: actor, display_name: "Reporter", kind: "agent" }],
    verified_facts: [{ statement: "Boundary implemented", event_ids: [event1] }], inferences: [],
    status: "delivered", blockers: [], risks: [], next_expected_action: { description: "Review evidence" },
    source_event_ids: [event1], confidence: { level: "high", rationale: "Synthetic controls passed" },
    sensitivity: isPublic ? "public" : "internal", visibility: isPublic ? "public" : "project",
    generated_at: "2026-08-17T13:00:00Z", generator: { model: "synthetic/model-v1", revision: "reporter-r1" },
    as_of_seq: 20, generated: true,
    ...(isPublic ? { publication: { approval_event_id: event2, action_digest: digest, approved_by_principal_id: principal } } : {}),
    ...overrides
  };
}

const payloads = {
  "progress.published": { summary: "Done", what_changed: ["Boundary"], why_it_matters: "Safety", status: "delivered", next: "Review", confidence: "high" },
  "risk.raised": { risk_key: "R", statement: "Risk", severity: "high", likelihood: "medium" },
  "risk.retired": { risk_key: "R", reason: "Closed", supersedes_event_id: event1 },
  "blocker.raised": { blocker_key: "B", statement: "Blocked", blocking: ["R1"] },
  "blocker.cleared": { blocker_key: "B", resolution: "Cleared", supersedes_event_id: event1 },
  "test.recorded": { suite: "report", passed: 1, failed: 0, negative_controls_ran: true, command: "npm run report:test" },
  "incident.opened": { incident_key: "I", summary: "Incident", severity: "low", detected_at: "2026-08-17T13:00:00Z" },
  "incident.resolved": { incident_key: "I", resolution: "Resolved", supersedes_event_id: event1 },
  "report.generated": { report_id: reportId, generated: true, view_mode: "live_feed", audience: "team", envelope_sha256: digest, as_of_seq: 20, generator: { model: "synthetic/model-v1", revision: "reporter-r1" } }
};

test("normative report schemas are installed byte-for-byte", async () => {
  for (const name of ["report-envelope-v1.schema.json", "report-inputs-v1.schema.json"]) {
    assert.deepEqual(await readFile(path.join(root, "schemas", name)), await readFile(path.join(root, "docs", "schemas", name)));
  }
});

for (const view of ["live_feed", "terminal_ticker", "daily_briefing", "executive_view", "technical_view", "public_view", "collaborator_briefing"]) {
  test(`well-formed ${view} envelope validates`, () => assert.equal(validateReportEnvelope(envelope(view)).view_mode, view));
}

for (const [kind, payload] of Object.entries(payloads)) {
  test(`well-formed ${kind} payload validates`, () => assert.deepEqual(validateReportPayload(kind, payload), payload));
}

test("fact ids present in source_event_ids validate", () => assert.doesNotThrow(() => validateReportEnvelope(envelope())));
test("generated evidence exclusion has an explicit opt-in positive control", () => {
  const candidates = [{ kind: "progress.published" }, { kind: "report.generated" }];
  assert.deepEqual(selectEvidenceCandidates(candidates), [candidates[0]]);
  assert.throws(() => selectEvidenceCandidates(candidates, { includeGenerated: true }), /GENERATED_EVIDENCE_FORBIDDEN/);
  assert.deepEqual(selectEvidenceCandidates(candidates, { includeGenerated: true, purpose: "diagnostic_audit" }), candidates);
});

test("public input requires allowlisted evidence and human approval but performs no publication", async () => {
  const { auth, record } = publicFixture();
  const input = await inputFor(auth, [record]);
  assert.equal(input.view_mode, "public_view");
  assert.equal(Object.hasOwn(input, "published"), false);
});

const malformedEnvelopeCases = [
  ["unknown envelope field", (value) => { value.surprise = true; }, /SCHEMA_INVALID.*surprise is not allowed/],
  ["missing generated label", (value) => { delete value.generated; }, /generated is required/],
  ["false generated label", (value) => { value.generated = false; }, /generated must equal true/],
  ["empty fact event ids", (value) => { value.verified_facts[0].event_ids = []; }, /must contain at least 1 item/],
  ["absent fact event ids", (value) => { delete value.verified_facts[0].event_ids; }, /event_ids is required/],
  ["fact id absent from sources", (value) => { value.verified_facts[0].event_ids = [event2]; }, /FACT_SOURCE_MISSING/],
  ["inference missing basis", (value) => { value.inferences = [{ statement: "Maybe", confidence: "low" }]; }, /basis is required/],
  ["inference missing confidence", (value) => { value.inferences = [{ statement: "Maybe", basis: "Evidence" }]; }, /confidence is required/],
  ["empty source event ids", (value) => { value.source_event_ids = []; value.verified_facts = []; }, /must contain at least 1 item/]
];

for (const [name, mutation, pattern] of malformedEnvelopeCases) {
  test(`malformed envelope refused: ${name}`, () => { const value = structuredClone(envelope()); mutation(value); assert.throws(() => validateReportEnvelope(value), pattern); });
}

test("public_view without publication is refused", () => { const value = envelope("public_view"); delete value.publication; assert.throws(() => validateReportEnvelope(value), /publication is required/); });
test("public_view above public sensitivity is refused", () => { const value = envelope("public_view", { sensitivity: "internal" }); assert.throws(() => validateReportEnvelope(value), /sensitivity must equal "public"/); });

for (const field of ["notes", "reasoning", "thoughts", "scratchpad"]) {
  test(`progress.published refuses free-form ${field}`, () => assert.throws(() => validateReportPayload("progress.published", { ...payloads["progress.published"], [field]: "private reasoning" }), new RegExp(`${field} is not allowed`)));
}

test("test.recorded requires negative_controls_ran", () => {
  const value = { ...payloads["test.recorded"] }; delete value.negative_controls_ran;
  assert.throws(() => validateReportPayload("test.recorded", value), /negative_controls_ran is required/);
});

test("authorization is validated before the authorized source is called", async () => {
  let calls = 0;
  const bad = request(authorization({ audience: "root" }));
  await assert.rejects(assembleAuthorizedReportInput(bad, { async retrieveAuthorized() { calls++; return []; } }), /AUTHORIZATION_MALFORMED/);
  assert.equal(calls, 0);
  const callsAfterPositive = [];
  await assembleAuthorizedReportInput(request(), source([evidence(authorization())], callsAfterPositive));
  assert.equal(callsAfterPositive.length, 1);
});

test("raw candidate sources are structurally refused", async () => {
  await assert.rejects(assembleAuthorizedReportInput(request(), { events: [evidence(authorization())], async retrieveAuthorized() { return []; } }), /AUTHORIZED_SOURCE_REQUIRED/);
});

for (const [name, mutate, pattern] of [
  ["unauthorized context", (record) => { record.authorization_context_sha256 = "00".repeat(32); }, /EVIDENCE_UNAUTHORIZED/],
  ["above sensitivity ceiling", (record) => { record.sensitivity = "restricted"; record.content_sha256 = evidenceDigest(record); }, /EVIDENCE_UNAUTHORIZED/],
  ["unauthorized visibility", (record) => { record.visibility = "private"; record.content_sha256 = evidenceDigest(record); }, /EVIDENCE_UNAUTHORIZED/],
  ["cross-project", (record) => { record.project_id = "10000000-0000-4000-8000-000000000099"; record.content_sha256 = evidenceDigest(record); }, /EVIDENCE_CROSS_PROJECT/],
  ["post-as_of_seq", (record) => { record.project_seq = 21; record.content_sha256 = evidenceDigest(record); }, /EVIDENCE_AFTER_AS_OF/],
  ["generated-as-evidence", (record) => { record.kind = "report.generated"; record.content_sha256 = evidenceDigest(record); }, /GENERATED_EVIDENCE_FORBIDDEN/],
  ["digest mismatch", (record) => { record.content_sha256 = "00".repeat(32); }, /EVIDENCE_DIGEST_MISMATCH/]
]) {
  test(`${name} input is refused`, async () => { const auth = authorization(); const record = evidence(auth); mutate(record); await assert.rejects(inputFor(auth, [record]), pattern); });
}

test("evidence outside authorized history is refused", async () => {
  const auth = authorization({ history_start_seq: 10 });
  const record = evidence(auth, { project_seq: 9 });
  await assert.rejects(inputFor(auth, [record]), /EVIDENCE_UNAUTHORIZED.*predates authorized history/);
});

test("public_view refuses evidence not on the explicit publishable allowlist", async () => {
  const { auth, record } = publicFixture({ publishable: false });
  await assert.rejects(inputFor(auth, [record]), /PUBLIC_ALLOWLIST_REQUIRED/);
});

test("public_view refuses self-approval before retrieval", async () => {
  let calls = 0;
  const auth = authorization({ audience: "public", view_mode: "public_view", sensitivity_ceiling: "public", publication_approval: { approval_event_id: event2, action_digest: digest, approved_by_principal_id: principal } });
  await assert.rejects(assembleAuthorizedReportInput(request(auth), { async retrieveAuthorized() { calls++; return []; } }), /PUBLIC_SELF_APPROVAL_FORBIDDEN/);
  assert.equal(calls, 0);
});

test("public_view refuses missing human approval before retrieval", async () => {
  let calls = 0;
  const auth = authorization({ audience: "public", view_mode: "public_view", sensitivity_ceiling: "public", allowed_visibilities: ["public"], publication_approval: null });
  await assert.rejects(assembleAuthorizedReportInput(request(auth), { async retrieveAuthorized() { calls++; return []; } }), /PUBLIC_APPROVAL_REQUIRED/);
  assert.equal(calls, 0);
});

test("public approval digest is invalidated by an evidence-set change", async () => {
  const { auth, record } = publicFixture();
  const added = evidence(auth, { event_id: "10000000-0000-4000-8000-000000000013", project_seq: 11, sensitivity: "public", visibility: "public", payload: { summary: "Added", publishable: true } });
  await assert.rejects(inputFor(auth, [record, added]), /PUBLIC_APPROVAL_DIGEST_MISMATCH/);
});

test("authorized output is byte-identical whether restricted records exist or not", async () => {
  const auth = authorization();
  const allowed = evidence(auth);
  const restricted = evidence(auth, { event_id: event2, project_seq: 11, sensitivity: "restricted", payload: { summary: "Restricted fact" } }); restricted.content_sha256 = evidenceDigest(restricted);
  const authorizedSource = (repository) => ({ async retrieveAuthorized(query) { return repository.filter((record) => record.project_id === query.project_id && record.sensitivity !== "restricted"); } });
  const withoutRestricted = await assembleAuthorizedReportInput(request(auth), authorizedSource([allowed]));
  const withRestricted = await assembleAuthorizedReportInput(request(auth), authorizedSource([allowed, restricted]));
  assert.equal(canonicalJson(withRestricted), canonicalJson(withoutRestricted));
  assert.doesNotMatch(canonicalJson(withRestricted), /hidden|omitted|excluded|restricted/i);
});

test("auditable input identity binds ids, digests, sequence, authorization, model, and reporter revision", async () => {
  const auth = authorization();
  const baseline = await inputFor(auth);
  assert.deepEqual(baseline.source_event_ids, [event1]);
  assert.deepEqual(baseline.evidence_digests, [evidence(auth).content_sha256]);
  const variants = [
    await inputFor(auth, [evidence(auth, { event_id: event2 })]),
    await inputFor(auth, null, { as_of_seq: 21 }),
    await inputFor(authorization({ audience: "executive" }), null),
    await inputFor(auth, null, { model_identity: "synthetic/model-v2" }),
    await inputFor(auth, null, { reporter_revision: "reporter-r2" })
  ];
  for (const variant of variants) assert.notEqual(variant.input_identity_sha256, baseline.input_identity_sha256);
});

test("envelope must match the authorized input exactly", async () => {
  const input = await inputFor();
  assert.doesNotThrow(() => validateReportEnvelope(envelope(), input));
  assert.throws(() => validateReportEnvelope(envelope("live_feed", { as_of_seq: 19 }), input), /ENVELOPE_INPUT_MISMATCH/);
});

test("audit record binds inputs and labels output without reproducibility claim", async () => {
  const input = await inputFor();
  const audit = auditReportBoundary(envelope(), input);
  assert.equal(audit.generated, true);
  assert.equal(audit.input_identity_sha256, input.input_identity_sha256);
  assert.deepEqual(audit.source_event_ids, [event1]);
  assert.deepEqual(audit.evidence_digests, input.evidence_digests);
  assert.equal(audit.reproducibility_claim, "auditable_inputs_not_bit_reproducible_output");
});
