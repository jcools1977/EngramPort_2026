import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { decideDelivery } from "../../port-watch/src/index.mjs";
import { detectCredential } from "./credential-boundary.mjs";

const envelopeSchema = JSON.parse(await readFile(new URL("../../../schemas/report-envelope-v1.schema.json", import.meta.url), "utf8"));
const inputsSchema = JSON.parse(await readFile(new URL("../../../schemas/report-inputs-v1.schema.json", import.meta.url), "utf8"));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const AUDIENCES = new Set(["team", "executive", "technical", "public", "collaborator", "agent"]);
const VIEWS = new Set(["live_feed", "terminal_ticker", "daily_briefing", "executive_view", "technical_view", "public_view", "collaborator_briefing"]);
const SENSITIVITY = new Set(["public", "internal", "confidential", "restricted"]);
const VISIBILITY = new Set(["private", "thread", "project", "public"]);
const SENSITIVITY_RANK = new Map([["public", 0], ["internal", 1], ["confidential", 2], ["restricted", 3]]);

export class ReportBoundaryError extends Error {
  constructor(code, message, path = "$") {
    super(`${code} at ${path}: ${message}`);
    this.name = "ReportBoundaryError";
    this.code = code;
    this.path = path;
  }
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value), "utf8").digest("hex");
}

function resolveReference(reference, root) {
  if (!reference.startsWith("#/")) throw new ReportBoundaryError("SCHEMA_REFERENCE_UNSUPPORTED", reference);
  return reference.slice(2).split("/").reduce((value, segment) => value?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function collectSchemaErrors(value, schema, root, path, errors) {
  if (schema.$ref) return collectSchemaErrors(value, resolveReference(schema.$ref, root), root, path, errors);
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} must be one of ${schema.enum.join(", ")}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${path} must be ${types.join(" or ")}`);
      return;
    }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required ?? []) if (!Object.hasOwn(value, required)) errors.push(`${path}.${required} is required`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties ?? {}, key)) errors.push(`${path}.${key} is not allowed`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) collectSchemaErrors(value[key], child, root, `${path}.${key}`, errors);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map(canonicalJson)).size !== value.length) errors.push(`${path} must contain unique items`);
    if (schema.items) value.forEach((item, index) => collectSchemaErrors(item, schema.items, root, `${path}[${index}]`, errors));
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} must contain at least ${schema.minLength} character(s)`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path} must contain no more than ${schema.maxLength} character(s)`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} does not match ${schema.pattern}`);
    if (schema.format === "uuid" && !UUID.test(value)) errors.push(`${path} must be a UUID`);
    if (schema.format === "date-time" && !Number.isFinite(Date.parse(value))) errors.push(`${path} must be an ISO date-time`);
  }
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}`);
  for (const clause of schema.allOf ?? []) {
    if (!clause.if) collectSchemaErrors(value, clause, root, path, errors);
    else {
      const conditionalErrors = [];
      collectSchemaErrors(value, clause.if, root, path, conditionalErrors);
      if (conditionalErrors.length === 0 && clause.then) collectSchemaErrors(value, clause.then, root, path, errors);
    }
  }
}

export function validateSchema(value, schema, root = schema, label = "value") {
  const errors = [];
  collectSchemaErrors(value, schema, root, "$", errors);
  if (errors.length) throw new ReportBoundaryError("SCHEMA_INVALID", `${label}: ${errors.join("; ")}`);
  return value;
}

export function validateReportPayload(kind, payload) {
  const schema = inputsSchema.properties?.[kind];
  if (!schema) throw new ReportBoundaryError("REPORT_KIND_UNKNOWN", `unsupported report payload kind ${kind}`);
  return validateSchema(payload, schema, inputsSchema, kind);
}

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ReportBoundaryError("INPUT_MALFORMED", `${label} must be an object`, `$.${label}`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ReportBoundaryError("INPUT_MALFORMED", `${label}.${key} is not allowed`, `$.${label}.${key}`);
}

export function validateAuthorizationContext(context) {
  exactKeys(context, new Set(["principal_id", "tenant_id", "project_id", "role", "scopes", "audience", "view_mode", "sensitivity_ceiling", "allowed_visibilities", "history_start_seq", "policy_revision", "publication_approval"]), "authorization");
  for (const key of ["principal_id", "tenant_id", "project_id"]) if (!UUID.test(context[key] ?? "")) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", `${key} must be a UUID`, `$.authorization.${key}`);
  if (!AUDIENCES.has(context.audience)) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", `unknown audience ${context.audience}`, "$.authorization.audience");
  if (!VIEWS.has(context.view_mode)) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", `unknown view ${context.view_mode}`, "$.authorization.view_mode");
  if (!SENSITIVITY.has(context.sensitivity_ceiling)) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", `unknown sensitivity ceiling ${context.sensitivity_ceiling}`, "$.authorization.sensitivity_ceiling");
  if (typeof context.role !== "string" || !context.role) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", "role is required", "$.authorization.role");
  if (!Array.isArray(context.scopes) || !context.scopes.includes("events:read") || context.scopes.some((scope) => typeof scope !== "string")) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", "scopes must include events:read", "$.authorization.scopes");
  if (!Array.isArray(context.allowed_visibilities) || context.allowed_visibilities.length === 0 || context.allowed_visibilities.some((visibility) => !VISIBILITY.has(visibility))) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", "allowed_visibilities must contain known visibility values", "$.authorization.allowed_visibilities");
  if (!Number.isInteger(context.history_start_seq) || context.history_start_seq < 0) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", "history_start_seq must be a non-negative integer", "$.authorization.history_start_seq");
  if (typeof context.policy_revision !== "string" || !context.policy_revision) throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", "policy_revision is required", "$.authorization.policy_revision");
  if (context.view_mode === "public_view") {
    if (!context.publication_approval || typeof context.publication_approval !== "object" || Array.isArray(context.publication_approval)) throw new ReportBoundaryError("PUBLIC_APPROVAL_REQUIRED", "public_view requires a human publication approval", "$.authorization.publication_approval");
    exactKeys(context.publication_approval, new Set(["approval_event_id", "action_digest", "approved_by_principal_id"]), "publication_approval");
    if (!UUID.test(context.publication_approval.approval_event_id ?? "") || !UUID.test(context.publication_approval.approved_by_principal_id ?? "") || !SHA256.test(context.publication_approval.action_digest ?? "")) {
      throw new ReportBoundaryError("PUBLIC_APPROVAL_REQUIRED", "public_view requires a complete human approval bound to an action digest", "$.authorization.publication_approval");
    }
    if (context.publication_approval.approved_by_principal_id === context.principal_id) throw new ReportBoundaryError("PUBLIC_SELF_APPROVAL_FORBIDDEN", "public_view publication cannot be self-approved", "$.authorization.publication_approval.approved_by_principal_id");
  } else if (context.publication_approval !== null) {
    throw new ReportBoundaryError("AUTHORIZATION_MALFORMED", "publication_approval is allowed only for public_view", "$.authorization.publication_approval");
  }
  return context;
}

export function authorizationContextDigest(context) {
  return sha256(validateAuthorizationContext(context));
}

export function evidenceDigest(record) {
  return sha256({ event_id: record.event_id, tenant_id: record.tenant_id, project_id: record.project_id, project_seq: record.project_seq, kind: record.kind, sensitivity: record.sensitivity, visibility: record.visibility, payload: record.payload });
}

export function publicationActionDigest(authorization, asOfSeq, records) {
  return sha256({
    profile: "report-publication-action-v1",
    tenant_id: authorization.tenant_id,
    project_id: authorization.project_id,
    principal_id: authorization.principal_id,
    audience: authorization.audience,
    view_mode: authorization.view_mode,
    policy_revision: authorization.policy_revision,
    approval_event_id: authorization.publication_approval?.approval_event_id,
    approved_by_principal_id: authorization.publication_approval?.approved_by_principal_id,
    as_of_seq: asOfSeq,
    source_events: [...records]
      .sort((left, right) => left.project_seq - right.project_seq || left.event_id.localeCompare(right.event_id))
      .map(({ event_id, content_sha256, project_seq }) => ({ event_id, content_sha256, project_seq }))
  });
}

export function selectEvidenceCandidates(records, { includeGenerated = false, purpose = "report_generation" } = {}) {
  if (!Array.isArray(records)) throw new ReportBoundaryError("INPUT_MALFORMED", "evidence candidates must be an array");
  if (includeGenerated && purpose !== "diagnostic_audit") throw new ReportBoundaryError("GENERATED_EVIDENCE_FORBIDDEN", "generated output opt-in is restricted to diagnostic_audit and cannot feed report generation");
  return records.filter((record) => includeGenerated || record.kind !== "report.generated");
}

function validateEvidenceRecord(record, authorization, asOfSeq) {
  if (detectCredential(record).hit) throw new ReportBoundaryError("CREDENTIAL_INPUT_REFUSED", "credential-bearing report evidence refused", "$.evidence");
  exactKeys(record, new Set(["event_id", "tenant_id", "project_id", "project_seq", "kind", "sensitivity", "visibility", "payload", "content_sha256", "authorization_context_sha256"]), "evidence");
  if (!UUID.test(record.event_id ?? "")) throw new ReportBoundaryError("EVIDENCE_MALFORMED", "event_id must be a UUID", "$.evidence.event_id");
  if (record.tenant_id !== authorization.tenant_id || record.project_id !== authorization.project_id) throw new ReportBoundaryError("EVIDENCE_CROSS_PROJECT", `event ${record.event_id} is outside the authorized tenant/project`);
  if (!Number.isInteger(record.project_seq) || record.project_seq < 0) throw new ReportBoundaryError("EVIDENCE_MALFORMED", `event ${record.event_id} has invalid project_seq`);
  if (record.project_seq > asOfSeq) throw new ReportBoundaryError("EVIDENCE_AFTER_AS_OF", `event ${record.event_id} sequence ${record.project_seq} exceeds as_of_seq ${asOfSeq}`);
  if (record.authorization_context_sha256 !== authorizationContextDigest(authorization)) throw new ReportBoundaryError("EVIDENCE_UNAUTHORIZED", `event ${record.event_id} is not authorized for this audience/view context`);
  if (!SENSITIVITY.has(record.sensitivity) || SENSITIVITY_RANK.get(record.sensitivity) > SENSITIVITY_RANK.get(authorization.sensitivity_ceiling)) throw new ReportBoundaryError("EVIDENCE_UNAUTHORIZED", `event ${record.event_id} exceeds the authorized sensitivity ceiling`);
  if (!VISIBILITY.has(record.visibility) || !authorization.allowed_visibilities.includes(record.visibility)) throw new ReportBoundaryError("EVIDENCE_UNAUTHORIZED", `event ${record.event_id} has unauthorized visibility ${record.visibility}`);
  if (record.project_seq < authorization.history_start_seq) throw new ReportBoundaryError("EVIDENCE_UNAUTHORIZED", `event ${record.event_id} predates authorized history`);
  if (record.kind === "report.generated") throw new ReportBoundaryError("GENERATED_EVIDENCE_FORBIDDEN", `event ${record.event_id} is generated output and cannot be report evidence`);
  if (record.content_sha256 !== evidenceDigest(record)) throw new ReportBoundaryError("EVIDENCE_DIGEST_MISMATCH", `event ${record.event_id} digest does not match its canonical evidence bytes`);
  if (authorization.view_mode === "public_view" && record.payload?.publishable !== true) throw new ReportBoundaryError("PUBLIC_ALLOWLIST_REQUIRED", `event ${record.event_id} is not explicitly publishable`);
}

export async function assembleAuthorizedReportInput(request, source) {
  exactKeys(request, new Set(["authorization", "as_of_seq", "model_identity", "reporter_revision"]), "request");
  const authorization = validateAuthorizationContext(request.authorization);
  const deriveAsOfSeq = request.as_of_seq === null;
  if (!deriveAsOfSeq && (!Number.isInteger(request.as_of_seq) || request.as_of_seq < 0)) throw new ReportBoundaryError("INPUT_MALFORMED", "as_of_seq must be a non-negative integer or null for authorized-state derivation", "$.request.as_of_seq");
  if (typeof request.model_identity !== "string" || !request.model_identity) throw new ReportBoundaryError("INPUT_MALFORMED", "model_identity is required", "$.request.model_identity");
  if (typeof request.reporter_revision !== "string" || !request.reporter_revision) throw new ReportBoundaryError("INPUT_MALFORMED", "reporter_revision is required", "$.request.reporter_revision");
  if (!source || typeof source !== "object" || Array.isArray(source) || Object.keys(source).some((key) => key !== "retrieveAuthorized") || typeof source.retrieveAuthorized !== "function") throw new ReportBoundaryError("AUTHORIZED_SOURCE_REQUIRED", "source must expose retrieveAuthorized only");

  const authorization_context_sha256 = authorizationContextDigest(authorization);
  const retrieved = await source.retrieveAuthorized(Object.freeze({ ...authorization, as_of_seq: request.as_of_seq, authorization_context_sha256 }));
  if (!Array.isArray(retrieved)) throw new ReportBoundaryError("AUTHORIZED_SOURCE_INVALID", "retrieveAuthorized must return an array");
  const asOfSeq = deriveAsOfSeq ? retrieved.reduce((maximum, record) => Math.max(maximum, Number.isInteger(record?.project_seq) ? record.project_seq : 0), 0) : request.as_of_seq;
  for (const record of retrieved) validateEvidenceRecord(record, authorization, asOfSeq);
  const ordered = [...retrieved].sort((left, right) => left.project_seq - right.project_seq || left.event_id.localeCompare(right.event_id));
  if (new Set(ordered.map((record) => record.event_id)).size !== ordered.length) throw new ReportBoundaryError("EVIDENCE_DUPLICATE", "source returned a duplicate event id");
  if (authorization.view_mode === "public_view" && authorization.publication_approval.action_digest !== publicationActionDigest(authorization, asOfSeq, ordered)) {
    throw new ReportBoundaryError("PUBLIC_APPROVAL_DIGEST_MISMATCH", "public_view approval is not bound to the exact authorized evidence set and as_of_seq");
  }

  const input = {
    profile: "report-input-audit-v1",
    tenant_id: authorization.tenant_id,
    project_id: authorization.project_id,
    principal_id: authorization.principal_id,
    role: authorization.role,
    scopes: [...authorization.scopes],
    audience: authorization.audience,
    view_mode: authorization.view_mode,
    sensitivity_ceiling: authorization.sensitivity_ceiling,
    allowed_visibilities: [...authorization.allowed_visibilities],
    history_start_seq: authorization.history_start_seq,
    policy_revision: authorization.policy_revision,
    authorization_context_sha256,
    as_of_seq: asOfSeq,
    model_identity: request.model_identity,
    reporter_revision: request.reporter_revision,
    publication_approval: authorization.publication_approval,
    source_events: ordered.map(({ event_id, project_seq, kind, content_sha256 }) => ({ event_id, project_seq, kind, content_sha256 })),
    source_event_ids: ordered.map((record) => record.event_id),
    evidence_digests: ordered.map((record) => record.content_sha256)
  };
  return Object.freeze({ ...input, input_identity_sha256: sha256(input) });
}

export async function assembleDeterministicEvidence(request, source) {
  exactKeys(request, new Set(["authorization", "model_identity", "reporter_revision"]), "request");
  return assembleAuthorizedReportInput({ ...request, as_of_seq: null }, source);
}

export async function runReportIfChanged({ request, source, previous_as_of_seq, generator, incidentSink = null }) {
  if (!Number.isInteger(previous_as_of_seq) || previous_as_of_seq < 0) throw new ReportBoundaryError("INPUT_MALFORMED", "previous_as_of_seq must be a non-negative integer", "$.previous_as_of_seq");
  if (typeof generator !== "function") throw new ReportBoundaryError("INPUT_MALFORMED", "generator must be a function", "$.generator");
  if (incidentSink !== null && typeof incidentSink !== "function") throw new ReportBoundaryError("INPUT_MALFORMED", "incidentSink must be a function", "$.incidentSink");
  let input;
  try {
    input = await assembleDeterministicEvidence(request, source);
  } catch (error) {
    if (error?.code === "CREDENTIAL_INPUT_REFUSED" && incidentSink) {
      const incident = Object.freeze({
        kind: "incident.opened",
        incident_key: "report-credential-input-refused",
        summary: "Re:PORT credential-bearing evidence refused",
        severity: "high",
        detected_at: new Date().toISOString(),
        refusal_code: error.code,
        tenant_id: request?.authorization?.tenant_id ?? null,
        project_id: request?.authorization?.project_id ?? null,
        evidence_path: error.path
      });
      await incidentSink(incident);
    }
    throw error;
  }
  const decision = decideDelivery({ cursor: previous_as_of_seq, events: input.source_events });
  if (decision.action === "skip") return Object.freeze({ ...decision, input });
  return Object.freeze({ ...decision, input, generated: await generator(input) });
}

function citedEventIds(envelope) {
  return [
    ...envelope.verified_facts.flatMap((item) => item.event_ids),
    ...envelope.inferences.flatMap((item) => item.event_ids ?? []),
    ...envelope.blockers.flatMap((item) => item.event_ids),
    ...envelope.risks.flatMap((item) => item.event_ids),
    ...(envelope.test_refs ?? []).map((item) => item.event_id),
    ...(envelope.decision_refs ?? []).map((item) => item.event_id)
  ];
}

export function validateReportEnvelope(envelope, input = null) {
  validateSchema(envelope, envelopeSchema, envelopeSchema, "report envelope");
  const sources = new Set(envelope.source_event_ids);
  for (const eventId of citedEventIds(envelope)) if (!sources.has(eventId)) throw new ReportBoundaryError("FACT_SOURCE_MISSING", `cited event ${eventId} is absent from source_event_ids`);
  if (input) {
    const comparisons = [
      ["tenant_id", input.tenant_id], ["project_id", input.project_id], ["audience", input.audience],
      ["view_mode", input.view_mode], ["as_of_seq", input.as_of_seq]
    ];
    for (const [field, expected] of comparisons) if (envelope[field] !== expected) throw new ReportBoundaryError("ENVELOPE_INPUT_MISMATCH", `${field} does not match the authorized input`);
    if (canonicalJson(envelope.source_event_ids) !== canonicalJson(input.source_event_ids)) throw new ReportBoundaryError("ENVELOPE_INPUT_MISMATCH", "source_event_ids do not exactly match the authorized input");
    if (envelope.generator.model !== input.model_identity || envelope.generator.revision !== input.reporter_revision) throw new ReportBoundaryError("ENVELOPE_INPUT_MISMATCH", "generator model/revision do not match the authorized input identity");
    if (input.view_mode === "public_view" && canonicalJson(envelope.publication) !== canonicalJson(input.publication_approval)) throw new ReportBoundaryError("ENVELOPE_INPUT_MISMATCH", "publication approval does not match the authorized input identity");
  }
  return envelope;
}

export function auditReportBoundary(envelope, input) {
  validateReportEnvelope(envelope, input);
  return Object.freeze({
    profile: "report-boundary-audit-v1",
    report_id: envelope.report_id,
    input_identity_sha256: input.input_identity_sha256,
    envelope_sha256: sha256(envelope),
    source_event_ids: [...input.source_event_ids],
    evidence_digests: [...input.evidence_digests],
    as_of_seq: input.as_of_seq,
    authorization_context_sha256: input.authorization_context_sha256,
    model_identity: input.model_identity,
    reporter_revision: input.reporter_revision,
    generated: true,
    reproducibility_claim: "auditable_inputs_not_bit_reproducible_output"
  });
}
