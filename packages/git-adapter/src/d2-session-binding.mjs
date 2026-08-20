export class SessionBindingError extends Error {
  constructor(code) { super(code); this.code = code; }
}

/** Binds a verified synthetic authentication result to one privileged PG transaction. */
export class PrincipalSessionBinding {
  #pool; #connectionString;
  constructor({ connectionString, pool } = {}) {
    this.#pool = pool; this.#connectionString = connectionString;
  }

  async #getPool() { if (!this.#pool) { const { Pool } = await import("pg"); this.#pool = new Pool({ connectionString: this.#connectionString, options: "-c search_path=public" }); } return this.#pool; }

  async mint(request, session) {
    if (!session?.verified || typeof session.principalId !== "string") throw new SessionBindingError("SESSION_UNBOUND");
    const client = await (await this.#getPool()).connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.principal_id', $1, true)", [session.principalId]);
      const result = await client.query(
        "SELECT mint_custody_reference($1,$2::epr_namespace,$3::custody_model,$4,$5::jsonb) AS reference",
        [request.className, request.namespace, request.model, request.keyLocator ?? null, JSON.stringify(request.metadata ?? {})]
      );
      await client.query("COMMIT");
      return { reference: result.rows[0].reference, principalId: session.principalId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.query("DISCARD ALL");
      client.release();
    }
  }

  async close() { if (this.#pool) await this.#pool.end(); }
}
