import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";

const moduleUrl = process.env.D2_BINDING_MODULE
  ? pathToFileURL(process.env.D2_BINDING_MODULE).href
  : new URL("../packages/git-adapter/src/d2-session-binding.mjs", import.meta.url).href;
const { PrincipalSessionBinding } = await import(moduleUrl);

const maintenanceUrl = process.env.D2_DATABASE_URL ?? "postgres://engram_maintenance@127.0.0.1:5432/engramport";
const appUrl = process.env.D2_APP_DATABASE_URL ?? "postgres://engram_app@127.0.0.1:5432/engramport";
const postgresUrl = process.env.D2_POSTGRES_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/engramport";
const principalY = "11000000-0000-0000-0000-000000000001";
const principalX = "22000000-0000-0000-0000-000000000002";
const custodySession = "15000000-0000-0000-0000-000000000008";
const foreignCustodySession = "25000000-0000-0000-0000-000000000008";
const tenantY = "10000000-0000-0000-0000-000000000001";
const selectedCase = process.env.D2_CASE ?? "";
const enabled = (name) => selectedCase === "" || selectedCase === name;

const request = (keyLocator, extra = {}) => ({ className: "3.3", namespace: "credential", model: "B", keyLocator, metadata: {}, ...extra });
const sessionY = { verified: true, principalId: principalY, sessionId: custodySession };

async function reset(admin) {
  await admin.query("TRUNCATE custody_audit,minted_references,custody_rows");
}

async function checkoutPrincipal(pool) {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT pg_backend_pid() AS pid, coalesce(current_setting('app.principal_id', true), '') AS principal");
    return result.rows[0];
  } finally { client.release(); }
}

function scrubFaultPool(pool, observedPids) {
  return {
    async connect() {
      const client = await pool.connect();
      const pid = Number((await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
      observedPids.push(pid);
      return {
        query(sql, params) {
          if (sql === "DISCARD ALL") return client.query("DISCARD ALLXX");
          return client.query(sql, params);
        },
        release(error) { client.release(error); }
      };
    },
    end() { return pool.end(); }
  };
}

test("D2 live behavioral controls", async (t) => {
  const admin = new Pool({ connectionString: postgresUrl, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
  try {
    const authority = await admin.query("SELECT principal_id FROM founder_authorities WHERE principal_id=ANY($1::uuid[]) ORDER BY principal_id", [[principalY, principalX]]);
    assert.deepEqual(authority.rows.map((row) => row.principal_id), [principalY, principalX]);

    if (enabled("substitution")) await t.test("caller substitution cannot replace verified principal or derived tenant", async () => {
      await reset(admin);
      const binding = new PrincipalSessionBinding({ connectionString: maintenanceUrl });
      try {
        const result = await binding.mint(request("d2-substitution", { principalId: principalX, sessionId: foreignCustodySession }), sessionY);
        const stored = await admin.query("SELECT minted_by_principal_id,tenant_id FROM custody_rows WHERE key_locator='d2-substitution'");
        console.log(`D2_SUBSTITUTION minted_by=${stored.rows[0]?.minted_by_principal_id} tenant=${stored.rows[0]?.tenant_id}`);
        assert.equal(result.principalId, principalY);
        assert.deepEqual(stored.rows, [{ minted_by_principal_id: principalY, tenant_id: tenantY }]);
      } finally { await binding.close(); }
    });

    if (enabled("joint")) await t.test("transaction-local binding and DISCARD are independent defenses against joint leakage", async () => {
      await reset(admin);
      const pool = new Pool({ connectionString: maintenanceUrl, max: 1, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
      try {
        const binding = new PrincipalSessionBinding({ pool });
        await binding.mint(request("d2-joint-baseline"), sessionY);
        const moduleCheckout = (await checkoutPrincipal(pool)).principal;

        let client = await pool.connect();
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.principal_id',$1,true)", [principalY]);
        await client.query("COMMIT");
        client.release();
        const localOnly = (await checkoutPrincipal(pool)).principal;

        client = await pool.connect();
        await client.query("SELECT set_config('app.principal_id',$1,false)", [principalY]);
        await client.query("DISCARD ALL");
        client.release();
        const scrubOnly = (await checkoutPrincipal(pool)).principal;

        client = await pool.connect();
        await client.query("SELECT set_config('app.principal_id',$1,false)", [principalY]);
        client.release();
        const jointMissing = (await checkoutPrincipal(pool)).principal;
        client = await pool.connect(); await client.query("DISCARD ALL"); client.release();

        console.log(`D2_JOINT_LEAK module_checkout=${JSON.stringify(moduleCheckout)} local_only=${JSON.stringify(localOnly)} scrub_only=${JSON.stringify(scrubOnly)} both_missing=${jointMissing}`);
        assert.equal(moduleCheckout, "");
        assert.equal(localOnly, "");
        assert.equal(scrubOnly, "");
        assert.equal(jointMissing, principalY);
      } finally { await pool.end(); }
    });

    if (enabled("role")) await t.test("maintenance is accepted while app and postgres roles are rejected and released", async () => {
      await reset(admin);
      const maintenance = new PrincipalSessionBinding({ connectionString: maintenanceUrl });
      try { await maintenance.mint(request("d2-role-maintenance"), sessionY); } finally { await maintenance.close(); }
      await reset(admin);
      const outcomes = {};
      for (const [name, connectionString] of [["postgres", postgresUrl], ["engram_app", appUrl]]) {
        const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
        const binding = new PrincipalSessionBinding({ pool });
        try {
          try { await binding.mint(request(`d2-role-${name}`), sessionY); outcomes[name] = "accepted"; }
          catch (error) { outcomes[name] = error?.code ?? error?.message; }
          assert.equal((await checkoutPrincipal(pool)).principal, "");
        } finally { await binding.close(); }
      }
      console.log(`D2_ROLE_GUARD maintenance=accepted app=${outcomes.engram_app} postgres=${outcomes.postgres} released=true`);
      assert.equal(outcomes.engram_app, "SESSION_ROLE_INVALID");
      assert.equal(outcomes.postgres, "SESSION_ROLE_INVALID");
    });

    if (enabled("dirty-success")) await t.test("scrub failure after a successful mint destroys the dirty client", async () => {
      await reset(admin);
      const realPool = new Pool({ connectionString: maintenanceUrl, max: 1, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
      const observedPids = [];
      const binding = new PrincipalSessionBinding({ pool: scrubFaultPool(realPool, observedPids) });
      try {
        await binding.mint(request("d2-dirty-success"), sessionY);
        const fresh = await checkoutPrincipal(realPool);
        console.log(`D2_DIRTY_SUCCESS destroyed_pid=${observedPids[0]} fresh_pid=${fresh.pid} principal=${JSON.stringify(fresh.principal)}`);
        assert.notEqual(fresh.pid, observedPids[0]);
        assert.equal(fresh.principal, "");
      } finally { await binding.close(); }
    });

    if (enabled("dirty-failure")) await t.test("scrub failure after a failed mint destroys the dirty client", async () => {
      await reset(admin);
      const realPool = new Pool({ connectionString: maintenanceUrl, max: 1, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
      const observedPids = [];
      const binding = new PrincipalSessionBinding({ pool: scrubFaultPool(realPool, observedPids) });
      try {
        await assert.rejects(() => binding.mint(request("d2-dirty-fail", { namespace: "shape" }), sessionY), (error) => error?.code === "42501" && /NAMESPACE_REFUSED/.test(error.message));
        const fresh = await checkoutPrincipal(realPool);
        console.log(`D2_DIRTY_FAILURE destroyed_pid=${observedPids[0]} fresh_pid=${fresh.pid} principal=${JSON.stringify(fresh.principal)}`);
        assert.notEqual(fresh.pid, observedPids[0]);
        assert.equal(fresh.principal, "");
      } finally { await binding.close(); }
    });

    if (enabled("residue")) await t.test("committed state after the D2 sequence is clean", async () => {
      const residue = await admin.query("SELECT (SELECT count(*)::int FROM custody_rows) AS custody,(SELECT count(*)::int FROM minted_references) AS references,(SELECT count(*)::int FROM custody_audit) AS audit");
      assert.deepEqual(residue.rows[0], { custody: 0, references: 0, audit: 0 });
      const cleanPool = new Pool({ connectionString: maintenanceUrl, max: 1, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
      try { assert.equal((await checkoutPrincipal(cleanPool)).principal, ""); } finally { await cleanPool.end(); }
      console.log("D2_COMMITTED_STATE custody=0 references=0 audit=0 clean_checkout=true implicit_abort_boundary=true");
    });
  } finally {
    await reset(admin).catch(() => {});
    await admin.end();
  }
});
