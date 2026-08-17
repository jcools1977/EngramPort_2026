import { createHash } from "node:crypto";

export class BoundaryError extends Error { constructor(code, message = "refused") { super(`${code}: ${message}`); this.code = code; } }

const SECRET = /(?:^|\b)(?:gh[pousr]_[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_-]?key|client[_-]?secret|password|token|private[_-]?key)\s*[:=]\s*[^\s]{8,})/i;
const REF = /^epr:(installation|credential|shape):[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const CRED_QUERY = /(?:token|secret|password|api[_-]?key|access[_-]?token)=/i;

export function detectCredential(record, { maxBytes = 64 * 1024, maxDepth = 16 } = {}) {
  let bytes; try { bytes = Buffer.byteLength(JSON.stringify(record)); } catch { return { hit: true, code: "DETECTOR_ERROR" }; }
  if (bytes > maxBytes) return { hit: true, code: "RECORD_TOO_LARGE" };
  const walk = (v, depth) => {
    if (depth > maxDepth) return "NESTING_TOO_DEEP";
    if (typeof v === "string") {
      if (SECRET.test(v)) return "CREDENTIAL_DETECTED";
      if (REF.test(v)) return null;
      if (URL_SCHEME.test(v) && (v.includes("://") || /^(?:javascript|data|file|ftp|ssh):/i.test(v))) { try { const u = new URL(v); if (u.protocol !== "https:" || u.username || u.password || CRED_QUERY.test(u.search) || CRED_QUERY.test(u.hash)) return "UNSAFE_URL"; } catch { return "UNSAFE_URL"; } }
      return null;
    }
    if (Array.isArray(v)) for (const x of v) { const hit = walk(x, depth + 1); if (hit) return hit; }
    else if (v && typeof v === "object") for (const x of Object.values(v)) { const hit = walk(x, depth + 1); if (hit) return hit; }
    return null;
  };
  const code = walk(record, 0); return code ? { hit: true, code } : { hit: false };
}

function reject(code) { return { ok: false, code }; }
export async function ingestCredentialBearingRecord(record, context = {}, deps = {}) {
  let detection; try { detection = detectCredential(record); } catch { return reject("DETECTOR_ERROR"); }
  if (detection.hit) return reject(detection.code);
  if (!record || typeof record !== "object" || Array.isArray(record)) return reject("SCHEMA_INVALID");
  if (record.shape_ref !== undefined) return reject("WIRE_SHAPE_REF_FORBIDDEN");
  let shape; try { shape = await deps.registry?.resolve?.(context.integration, record.provider, record.capability, record.protocol_version); } catch { return reject("REGISTRY_ERROR"); }
  if (!shape) return reject("SHAPE_UNKNOWN");
  if (record.provider_shape_ref && record.provider_shape_ref !== shape.shape_ref) return reject("SHAPE_MISMATCH");
  if (deps.registry?.isProviderRegistration && deps.registry.isProviderRegistration(record)) return reject("REGISTRY_WRITE_FORBIDDEN");
  const refs = [];
  const collect = v => { if (typeof v === "string" && REF.test(v)) refs.push(v); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === "object") Object.values(v).forEach(collect); };
  collect(record);
  try { for (const ref of refs) { const row = await deps.custody?.resolve?.(ref, context); if (!row || row.revoked || row.tenant_id !== context.tenant_id || row.project_id !== context.project_id) return reject("REFERENCE_UNRESOLVED"); } } catch { return reject("CUSTODY_RESOLVER_ERROR"); }
  const validated = await deps.registry.validate(shape, record); if (!validated) return reject("SHAPE_INVALID");
  return { ok: true, record: { ...record, shape_ref: shape.shape_ref, shape_revision: shape.revision, invocable: false } };
}

const has = (set, values) => values.every(v => set.has(v));
export async function resolveInvocation(grantDoc, request, deps) {
  const fail = code => ({ ok: false, code });
  if (!grantDoc?.grant_id) return fail("GRANT_NOT_FOUND");
  const g = await deps.store.getGrant(grantDoc.grant_id); if (!g) return fail("GRANT_NOT_FOUND");
  if (JSON.stringify({ ...grantDoc, status: g.status }) !== JSON.stringify({ ...g, status: g.status })) return fail("GRANT_MISMATCH");
  if (request.principal_id !== g.granted_to_principal_id) return fail("PRINCIPAL_MISMATCH");
  if ((g.granted_to_actor_id ?? null) !== (request.actor_id ?? null)) return fail("ACTOR_MISMATCH");
  if (request.tenant_id !== g.tenant_id) return fail("TENANT_MISMATCH");
  if (request.project_id !== g.project_id) return fail("PROJECT_MISMATCH");
  if (request.provider !== g.provider) return fail("PROVIDER_MISMATCH");
  if (request.capability !== g.capability) return fail("CAPABILITY_MISMATCH");
  if (!has(new Set(g.scopes), request.scopes ?? [])) return fail("SCOPE_EXCEEDED");
  if (Date.parse(g.expires_at) <= await deps.store.serverNow()) return fail("GRANT_EXPIRED");
  const fresh = await deps.store.getGrant(g.grant_id); if (!fresh || fresh.status !== "active") return fail("GRANT_REVOKED");
  if (request.session_id && !(await deps.store.sessionLive(request.session_id))) return fail("SESSION_REVOKED");
  for (const ref of [g.installation_ref, g.credential_ref].filter(Boolean)) { const row = await deps.store.getCustody(ref); if (!row || row.revoked) return fail("CUSTODY_REVOKED"); }
  if (!(await deps.store.granterAuthorized(g.granted_by_principal_id, g.scopes))) return fail("GRANTOR_EXCEEDS_AUTHORITY");
  return { ok: true, grant: g, input_identity: createHash("sha256").update(JSON.stringify(request)).digest("hex") };
}

export const referencePattern = REF;
