import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { discoverEventFiles, parseEvent, verifyLog } from "./verify-log.mjs";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const CLAIM_KINDS = new Set(["success", "failure", "correction", "reversal"]);
const FAILURE_KINDS = new Set(["failure", "correction", "reversal"]);
const FINDING_STATUSES = new Set(["fixed", "disclosed", "unfixed"]); /* REPORT_DISCLOSED_STATUS_SUPPORT */

export class ReportCorrespondentError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "ReportCorrespondentError";
    this.code = code;
  }
}

function refuse(code, message) { throw new ReportCorrespondentError(code, message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

function exactKeys(value, allowed, label) {
  if (!value || Array.isArray(value) || typeof value !== "object") refuse("DRAFT_INPUT_INVALID", `${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) refuse("DRAFT_INPUT_INVALID", `${label}.${key} is not allowed`);
}

function validateFindingRegistry(registry) {
  exactKeys(registry, new Set(["schema_version", "maintainer", "findings"]), "finding registry");
  if (registry.schema_version !== 1 || registry.maintainer !== "agent-a") refuse("FINDING_REGISTRY_INVALID", "expected schema_version 1 maintained by agent-a");
  if (!registry.findings || Array.isArray(registry.findings) || typeof registry.findings !== "object") refuse("FINDING_REGISTRY_INVALID", "findings must be an object");
  for (const [id, record] of Object.entries(registry.findings)) {
    if (!/^F[1-9][0-9]*$/.test(id)) refuse("FINDING_REGISTRY_INVALID", `invalid finding id ${id}`);
    exactKeys(record, new Set(["status", "updated_by_event_id"]), `findings.${id}`);
    if (!FINDING_STATUSES.has(record.status)) refuse("FINDING_REGISTRY_INVALID", `${id} status must be fixed, disclosed, or unfixed`);
    if (record.updated_by_event_id !== null && !UUID_V7.test(record.updated_by_event_id ?? "")) refuse("FINDING_REGISTRY_INVALID", `${id} updated_by_event_id must be a UUIDv7 or null`);
  }
  return registry;
}

function validateManifest(manifest) {
  exactKeys(manifest, new Set(["schema_version", "title", "dek", "claims"]), "manifest");
  if (manifest.schema_version !== 1) refuse("DRAFT_INPUT_INVALID", "manifest schema_version must be 1");
  for (const field of ["title", "dek"]) if (typeof manifest[field] !== "string" || !manifest[field].trim()) refuse("DRAFT_INPUT_INVALID", `${field} must be non-empty text`);
  if (!Array.isArray(manifest.claims) || manifest.claims.length === 0) refuse("DRAFT_INPUT_INVALID", "claims must be a non-empty array");
  const ids = new Set();
  for (const [index, claim] of manifest.claims.entries()) {
    exactKeys(claim, new Set(["id", "kind", "headline", "statement", "finding_id", "evidence"]), `claims[${index}]`);
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(claim.id ?? "") || ids.has(claim.id)) refuse("DRAFT_INPUT_INVALID", `claim id ${claim.id ?? "missing"} is invalid or duplicated`);
    ids.add(claim.id);
    if (!CLAIM_KINDS.has(claim.kind)) refuse("DRAFT_INPUT_INVALID", `${claim.id} has unsupported kind ${claim.kind}`);
    for (const field of ["headline", "statement"]) if (typeof claim[field] !== "string" || !claim[field].trim()) refuse("DRAFT_INPUT_INVALID", `${claim.id}.${field} must be non-empty text`);
    if (claim.finding_id !== undefined && !/^F[1-9][0-9]*$/.test(claim.finding_id)) refuse("DRAFT_INPUT_INVALID", `${claim.id}.finding_id is invalid`);
    if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) refuse("CLAIM_TRACE_REQUIRED", `${claim.id} has no evidence`);
    for (const [evidenceIndex, evidence] of claim.evidence.entries()) {
      exactKeys(evidence, new Set(["event_id", "artifact_path", "artifact_sha256"]), `${claim.id}.evidence[${evidenceIndex}]`);
      if (!UUID_V7.test(evidence.event_id ?? "") || typeof evidence.artifact_path !== "string" || !evidence.artifact_path || !SHA256.test(evidence.artifact_sha256 ?? "")) refuse("CLAIM_TRACE_REQUIRED", `${claim.id} has malformed evidence`);
    }
  }
  if (!manifest.claims.some((claim) => FAILURE_KINDS.has(claim.kind))) refuse("REPORTING_DEFECT_NO_FAILURES", "a lab report must include a failure, correction, or reversal");
  return manifest;
}

async function canonicalEvents(root) {
  const verification = await verifyLog(root);
  if (!verification.ok) refuse("CANONICAL_LOG_INVALID", verification.errors.join("; "));
  const events = new Map();
  for (const absolute of await discoverEventFiles(path.join(root, "events"))) {
    const parsed = parseEvent(await readFile(absolute, "utf8"), path.relative(root, absolute));
    events.set(parsed.meta.id, parsed.meta);
  }
  return events;
}

function assertClaimsTrace(events, claims) {
  for (const claim of claims) {
    for (const evidence of claim.evidence) {
      const event = events.get(evidence.event_id);
      if (!event) refuse("CLAIM_EVENT_NOT_CANONICAL", `${claim.id} cites absent event ${evidence.event_id}`);
      const reference = `${evidence.artifact_path}#sha256=${evidence.artifact_sha256}`;
      if (!(event.artifacts ?? []).includes(reference)) refuse("CLAIM_ARTIFACT_NOT_CANONICAL", `${claim.id} evidence is not registered by event ${evidence.event_id}`);
    }
  }
}

function assertFindingsCitable(claims, registry, events, securityModel) {
  for (const claim of claims) {
    if (claim.finding_id === undefined) continue;
    const record = registry.findings[claim.finding_id];
    if (!record) refuse("FINDING_STATUS_MISSING", `${claim.finding_id} is not marked by agent-a`);
    if (record.status === "unfixed") refuse("UNFIXED_FINDING_REFUSED", `${claim.id} cites ${claim.finding_id}, which agent-a marks unfixed`); /* REPORT_UNFIXED_FINDING_GUARD */
    if (record.status === "disclosed") {
      if (!new RegExp(`\\b${claim.finding_id}\\b`).test(securityModel)) refuse("DISCLOSED_FINDING_NOT_PUBLIC", `${claim.finding_id} is marked disclosed but is not referenced in SECURITY.md`); /* REPORT_DISCLOSED_SECURITY_REFERENCE */
      continue;
    }
    const disposition = events.get(record.updated_by_event_id);
    if (!disposition || disposition.from !== "agent-a") refuse("FIXED_FINDING_DISPOSITION_INVALID", `${claim.finding_id} fixed status is not backed by a canonical agent-a event`); /* REPORT_FIXED_DISPOSITION_GUARD */
  }
}

function renderClaim(claim) {
  const label = claim.kind[0].toUpperCase() + claim.kind.slice(1);
  const sources = claim.evidence.map((item) => `- Canonical event \`${item.event_id}\`; artifact \`${item.artifact_path}#sha256=${item.artifact_sha256}\``).join("\n");
  return `### ${label}: ${claim.headline}\n\n${claim.statement}\n\nEvidence:\n\n${sources}`;
}

function renderDraft(manifest) {
  const setbacks = manifest.claims.filter((claim) => FAILURE_KINDS.has(claim.kind));
  const successes = manifest.claims.filter((claim) => claim.kind === "success");
  return [
    "<!-- REPORT_DRAFT_INERT: publication requires a separate digest-bound human approval -->",
    "# DRAFT — NOT PUBLISHED",
    "",
    `# ${manifest.title}`,
    "",
    manifest.dek,
    "",
    "## Corrections, reversals, and failures",
    "",
    ...setbacks.flatMap((claim) => [renderClaim(claim), ""]),
    "## What worked",
    "",
    ...(successes.length ? successes.flatMap((claim) => [renderClaim(claim), ""]) : ["No success claim was supplied for this reporting interval.", ""]),
    "---",
    "",
    "This is an inert correspondent draft. It has no implementation, assignment, approval, memory, architecture, or project-fact authority. Publication requires a separate human approval bound to the final draft digest.",
    ""
  ].join("\n");
}

export async function generateReportDraft({ root = process.cwd(), manifest, findingRegistry }) {
  validateManifest(manifest);
  validateFindingRegistry(findingRegistry);
  const events = await canonicalEvents(root);
  const securityModel = await readFile(path.join(root, "SECURITY.md"), "utf8");
  assertFindingsCitable(manifest.claims, findingRegistry, events, securityModel);
  assertClaimsTrace(events, manifest.claims);
  const markdown = renderDraft(manifest);
  return Object.freeze({
    profile: "engramport-report-draft-v1",
    generated: true,
    published: false,
    markdown,
    draft_sha256: sha256(markdown),
    source_event_ids: Object.freeze([...new Set(manifest.claims.flatMap((claim) => claim.evidence.map((item) => item.event_id)))]),
    evidence_digests: Object.freeze([...new Set(manifest.claims.flatMap((claim) => claim.evidence.map((item) => item.artifact_sha256)))])
  });
}

export function prepareReportPublication(draft, approval) {
  if (!approval) refuse("PUBLICATION_APPROVAL_REQUIRED", "a digest-bound human approval is required");
  exactKeys(approval, new Set(["approval_event_id", "approved_by", "draft_sha256"]), "approval");
  if (!UUID_V7.test(approval.approval_event_id ?? "") || approval.approved_by !== "DeVere") refuse("PUBLICATION_APPROVAL_INVALID", "approval must identify DeVere and a canonical decision event");
  if (!draft || draft.published !== false || !SHA256.test(draft.draft_sha256 ?? "") || sha256(draft.markdown ?? "") !== draft.draft_sha256) refuse("DRAFT_IDENTITY_INVALID", "draft content does not match its digest");
  if (approval.draft_sha256 !== draft.draft_sha256) refuse("PUBLICATION_APPROVAL_DIGEST_MISMATCH", "approval does not bind this draft");
  return Object.freeze({ profile: "engramport-report-publication-candidate-v1", approved: true, published: false, draft_sha256: draft.draft_sha256, approval_event_id: approval.approval_event_id, approved_by: approval.approved_by });
}

export async function loadReportDraftInputs(root = process.cwd(), options = {}) {
  const manifestPath = path.resolve(root, options.manifest ?? "docs/report/correspondent-draft-source.json");
  const findingsPath = path.resolve(root, options.findings ?? "docs/report/findings-status.json");
  return {
    manifest: JSON.parse(await readFile(manifestPath, "utf8")),
    findingRegistry: JSON.parse(await readFile(findingsPath, "utf8"))
  };
}
