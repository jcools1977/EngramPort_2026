import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
const correspondentSpecifier = process.env.REPORT_CORRESPONDENT_MODULE
  ?? new URL("../packages/git-adapter/src/report-correspondent.mjs", import.meta.url).href;
const { generateReportDraft, loadReportDraftInputs, prepareReportPublication } = await import(correspondentSpecifier);

const root = path.resolve(import.meta.dirname, "..");

async function fixture() {
  const inputs = await loadReportDraftInputs(root);
  return structuredClone(inputs);
}

test("the checked-in claim manifest generates an inert, balanced lab-report draft", async () => {
  const draft = await generateReportDraft({ root, ...await fixture() });
  assert.equal(draft.published, false);
  assert.match(draft.markdown, /DRAFT — NOT PUBLISHED/);
  assert.ok(draft.markdown.indexOf("## Corrections") < draft.markdown.indexOf("## What worked"));
  assert.match(draft.markdown, /01a0355e-6da4-7507-a60f-50c2cac0b790/);
  assert.match(draft.markdown, /4c7a08042d2e37bd7081b7516762a4c1706ef6a3bf3a65e2bc4232ffe73f1099/);
});

test("a disclosed finding referenced in SECURITY.md is citable", async () => {
  const input = await fixture();
  input.manifest.claims[0].finding_id = "F108";
  input.findingRegistry.findings.F108.status = "disclosed";
  await assert.doesNotReject(generateReportDraft({ root, ...input }));
});

test("a disclosed finding absent from SECURITY.md is refused by finding id", async () => {
  const input = await fixture();
  input.manifest.claims[0].finding_id = "F106";
  input.findingRegistry.findings.F106.status = "disclosed";
  await assert.rejects(generateReportDraft({ root, ...input }), /DISCLOSED_FINDING_NOT_PUBLIC.*F106.*SECURITY\.md/);
});

test("an unfixed finding is refused and fixed status requires a canonical agent-a disposition", async () => {
  const input = await fixture();
  input.manifest.claims[0].finding_id = "F111";
  await assert.rejects(generateReportDraft({ root, ...input }), /UNFIXED_FINDING_REFUSED.*F111/);
  input.findingRegistry.findings.F111.status = "fixed";
  const disposition = input.findingRegistry.findings.F111.updated_by_event_id;
  input.findingRegistry.findings.F111.updated_by_event_id = null;
  await assert.rejects(generateReportDraft({ root, ...input }), /FIXED_FINDING_DISPOSITION_INVALID.*F111/);
  input.findingRegistry.findings.F111.updated_by_event_id = disposition;
  await assert.doesNotReject(generateReportDraft({ root, ...input }));
});

test("an untraceable event or artifact is refused", async () => {
  const absentEvent = await fixture();
  absentEvent.manifest.claims[0].evidence[0].event_id = "01a00000-0000-7000-8000-000000000001";
  await assert.rejects(generateReportDraft({ root, ...absentEvent }), /CLAIM_EVENT_NOT_CANONICAL/);

  const wrongArtifact = await fixture();
  wrongArtifact.manifest.claims[0].evidence[0].artifact_sha256 = "00".repeat(32);
  await assert.rejects(generateReportDraft({ root, ...wrongArtifact }), /CLAIM_ARTIFACT_NOT_CANONICAL/);
});

test("a triumph-only report is a reporting defect", async () => {
  const input = await fixture();
  input.manifest.claims = input.manifest.claims.filter((claim) => claim.kind === "success");
  await assert.rejects(generateReportDraft({ root, ...input }), /REPORTING_DEFECT_NO_FAILURES/);
});

test("reviewer circulation is outside the manifest boundary", async () => {
  const input = await fixture();
  input.manifest.reviewer = "agent-c";
  await assert.rejects(generateReportDraft({ root, ...input }), /reviewer is not allowed/);
});

test("publication preparation observes refusal without explicit digest-bound approval", async () => {
  const draft = await generateReportDraft({ root, ...await fixture() });
  assert.throws(() => prepareReportPublication(draft, null), /PUBLICATION_APPROVAL_REQUIRED/);
  assert.throws(() => prepareReportPublication(draft, {
    approval_event_id: "01a00000-0000-7000-8000-000000000001",
    approved_by: "DeVere",
    draft_sha256: "00".repeat(32)
  }), /PUBLICATION_APPROVAL_DIGEST_MISMATCH/);
  assert.equal(draft.published, false);
});
