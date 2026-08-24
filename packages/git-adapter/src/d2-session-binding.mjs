export class SessionBindingError extends Error {
  constructor(code) { super(code); this.code = code; }
}

/** Binds a verified synthetic authentication result to one privileged PG transaction. */
export class PrincipalSessionBinding {
  #pool; #connectionString;
  constructor({ connectionString, pool } = {}) {
    this.#pool = pool; this.#connectionString = connectionString;
  }

  async #getPool() { if (!this.#pool) { const { Pool } = await import("pg"); this.#pool = new Pool({ connectionString: this.#connectionString, options: "-c search_path=public", connectionTimeoutMillis: 3000, statement_timeout: 5000 }); } return this.#pool; }

  async mint(request, session) {
    if (!session?.verified || typeof session.principalId !== "string" || typeof session.sessionId !== "string") throw new SessionBindingError("SESSION_UNBOUND");
    const client = await (await this.#getPool()).connect();
    try {
      const role = await client.query("SELECT session_user");
      if (role.rows[0]?.session_user !== "engram_maintenance") throw new SessionBindingError("SESSION_ROLE_INVALID");
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.principal_id', $1, true)", [session.principalId]);
      await client.query("SELECT set_config('app.session_id', $1, true)", [session.sessionId]);
      const result = await client.query(
        "SELECT mint_custody_reference($1,$2::epr_namespace,$3::custody_model,$4,$5::jsonb) AS reference",
        [request.className, request.namespace, request.model, request.keyLocator ?? null, JSON.stringify(request.metadata ?? {})]
      );
      await client.query("COMMIT");
      return { reference: result.rows[0].reference, principalId: session.principalId };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (rollbackError) { void rollbackError; }
      throw error;
    } finally {
      let scrubError;
      try { await client.query("DISCARD ALL"); } catch (error) { scrubError = error; }
      try { client.release(scrubError); } catch (releaseError) { void releaseError; }
    }
  }

  async resolveCustodyReference(reference, session) {
    if (!session?.verified || typeof session.principalId !== "string") throw new SessionBindingError("SESSION_UNBOUND");
    const client = await (await this.#getPool()).connect();
    try {
      const role = await client.query("SELECT session_user");
      if (role.rows[0]?.session_user !== "engram_maintenance") throw new SessionBindingError("SESSION_ROLE_INVALID");
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.principal_id', $1, true)", [session.principalId]);
      const result = await client.query("SELECT resolve_custody_reference($1) AS custody", [reference]);
      await client.query("COMMIT");
      return result.rows[0].custody;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (rollbackError) { void rollbackError; }
      if (error?.code === "42501" && error?.message === "REFERENCE_UNRESOLVED") return null;
      throw error;
    } finally {
      let scrubError;
      try { await client.query("DISCARD ALL"); } catch (error) { scrubError = error; }
      try { client.release(scrubError); } catch (releaseError) { void releaseError; }
    }
  }

  async revokeCustodyReference(reference, session) {
    if (!session?.verified || typeof session.principalId !== "string") throw new SessionBindingError("SESSION_UNBOUND");
    const client = await (await this.#getPool()).connect();
    try {
      const role = await client.query("SELECT session_user");
      if (role.rows[0]?.session_user !== "engram_maintenance") throw new SessionBindingError("SESSION_ROLE_INVALID");
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.principal_id', $1, true)", [session.principalId]);
      const result = await client.query("SELECT revoke_custody_reference($1) AS revoked_at", [reference]);
      await client.query("COMMIT");
      return { ok: true, revokedAt: result.rows[0].revoked_at };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (rollbackError) { void rollbackError; }
      if (error?.code === "42501" && error?.message === "REFERENCE_UNRESOLVED") return { ok: false, code: "REFERENCE_UNRESOLVED" };
      throw error;
    } finally {
      let scrubError;
      try { await client.query("DISCARD ALL"); } catch (error) { scrubError = error; }
      try { client.release(scrubError); } catch (releaseError) { void releaseError; }
    }
  }

  async evaluateCustodyRetention(reference, session) {
    if (!session?.verified || typeof session.principalId !== "string") throw new SessionBindingError("SESSION_UNBOUND");
    const client = await (await this.#getPool()).connect();
    try {
      const role = await client.query("SELECT session_user");
      if (role.rows[0]?.session_user !== "engram_maintenance") throw new SessionBindingError("SESSION_ROLE_INVALID");
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.principal_id', $1, true)", [session.principalId]);
      const result = await client.query("SELECT evaluate_custody_retention($1) AS retention", [reference]);
      await client.query("COMMIT");
      return result.rows[0].retention;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (rollbackError) { void rollbackError; }
      if (error?.code === "42501" && error?.message === "RETENTION_UNRESOLVED") return null;
      throw error;
    } finally {
      let scrubError;
      try { await client.query("DISCARD ALL"); } catch (error) { scrubError = error; }
      try { client.release(scrubError); } catch (releaseError) { void releaseError; }
    }
  }

  async close() { if (this.#pool) await this.#pool.end(); }
}
