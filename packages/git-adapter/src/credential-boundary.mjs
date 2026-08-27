import { createHash } from "node:crypto";

export class BoundaryError extends Error { constructor(code, message = "refused") { super(`${code}: ${message}`); this.code = code; } }

const KNOWN_CREDENTIAL = /(?:^|\b)(?:gh[pousr]_[A-Za-z0-9_-]{20,}|hvs\.[A-Za-z0-9_-]{20,}|hvb\.[A-Za-z0-9_-]{20,}|s\.[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const CREDENTIAL_ASSIGNMENT = /(?:api[_-]?key|client[_-]?secret|password|token|private[_-]?key)\s*[:=]\s*(?:"[A-Za-z0-9._~+/-]{8,}"|'[A-Za-z0-9._~+/-]{8,}'|(?=[A-Za-z0-9._~+/-]{8,}(?:[\s,;}\]]|$))(?=[A-Za-z0-9._~+/-]*[._~+/-])[A-Za-z0-9._~+/-]+|(?=[A-Za-z0-9]{20,}(?:[\s,;}\]]|$))(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*[0-9])[A-Za-z0-9]+)/i; /* CREDENTIAL_IDENTIFIER_PRECISION */
const SECRET = new RegExp(`(?:${KNOWN_CREDENTIAL.source}|${CREDENTIAL_ASSIGNMENT.source})`, "i");
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
  const code = walk(record, 0);
  if (!code) return { hit: false };
  if (code !== "CREDENTIAL_DETECTED") return { hit: true, code };
  const classify = v => {
    if (typeof v === "string") {
      if (KNOWN_CREDENTIAL.test(v)) return "known-credential-shape";
      if (CREDENTIAL_ASSIGNMENT.test(v)) return "credential-assignment";
      return null;
    }
    if (Array.isArray(v)) for (const x of v) { const pattern = classify(x); if (pattern) return pattern; }
    else if (v && typeof v === "object") for (const x of Object.values(v)) { const pattern = classify(x); if (pattern) return pattern; }
    return null;
  };
  return { hit: true, code, pattern: classify(record) ?? "credential-shape" };
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
function invocationTransaction(client) {
  return {
    async getGrant(grantId) {
      const bound = await client.query("SELECT bind_invocation_grant_context($1::uuid) AS bound", [grantId]);
      if (!bound.rows[0]?.bound) return null;
      const result = await client.query(
        `SELECT grant_id::text,capability,provider,tenant_id::text,project_id::text,
                granted_to_principal_id::text,granted_to_actor_id::text,granted_by_principal_id::text,
                granting_event_id::text,scopes,expires_at,
                CASE WHEN revoked_at IS NULL THEN 'active' ELSE 'revoked' END AS status,
                installation_ref,credential_ref
           FROM invocation_grants WHERE grant_id=$1::uuid`,
        [grantId]
      );
      const row = result.rows[0];
      if (!row) return null;
      await client.query("SELECT set_config('app.principal_id',$1,true)", [row.granted_to_principal_id]);
      return { ...row, expires_at: row.expires_at.toISOString() };
    },
    async serverNow() {
      const result = await client.query("SELECT clock_timestamp() AS server_now");
      return result.rows[0].server_now.getTime();
    },
    async sessionLive(sessionId) {
      const result = await client.query("SELECT EXISTS(SELECT 1 FROM agent_sessions WHERE id=$1::uuid AND ended_at IS NULL AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND project_id=nullif(current_setting('app.project_id',true),'')::uuid) AS live", [sessionId]);
      return result.rows[0].live;
    },
    async getCustody(reference) {
      const result = await client.query(
        `SELECT r.tenant_id::text,r.project_id::text,
                (r.revoked_at IS NOT NULL OR c.revoked_at IS NOT NULL OR c.terminal_at IS NOT NULL OR (c.expires_at IS NOT NULL AND c.expires_at<=clock_timestamp())) AS revoked
           FROM minted_references r JOIN custody_rows c ON c.id=r.custody_row_id
          WHERE r.reference=$1
            AND r.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid
            AND r.project_id=nullif(current_setting('app.project_id',true),'')::uuid`,
        [reference]
      );
      return result.rows[0] ?? null;
    },
    async granterAuthorized(principalId, scopes) {
      const result = await client.query("SELECT invocation_granter_authorized($1::uuid,$2::text[]) AS authorized", [principalId, scopes]);
      return result.rows[0].authorized;
    }
  };
}

export class PostgresInvocationStore {
  #pool; #connectionString;
  constructor({ connectionString, pool } = {}) { this.#connectionString = connectionString; this.#pool = pool; }
  async #getPool() {
    if (!this.#pool) {
      const { Pool } = await import("pg");
      this.#pool = new Pool({ connectionString: this.#connectionString, options: "-c search_path=public", connectionTimeoutMillis: 3000, statement_timeout: 5000 });
    }
    return this.#pool;
  }
  async transaction(work) {
    const client = await (await this.#getPool()).connect();
    let releaseError;
    try {
      const role = await client.query("SELECT session_user");
      if (role.rows[0]?.session_user !== "engram_maintenance") throw new BoundaryError("INVOCATION_ROLE_INVALID");
      await client.query("BEGIN READ ONLY");
      const result = await work(invocationTransaction(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      releaseError = error;
      throw error;
    } finally {
      try { await client.query("DISCARD ALL"); } catch (error) { releaseError ??= error; }
      client.release(releaseError);
    }
  }
  async close() { if (this.#pool) await this.#pool.end(); }
}

export async function resolveInvocation(grantDoc, request, deps) {
  if (typeof deps?.store?.transaction === "function") return deps.store.transaction(store => resolveInvocation(grantDoc, request, { ...deps, store }));
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
