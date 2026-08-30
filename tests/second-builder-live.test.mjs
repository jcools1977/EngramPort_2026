import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

const sdk = await import(process.env.ENGRAMPORT_SDK_MODULE ?? "@engramport/sdk");
const { Pool } = pg;

const appUrl = process.env.SECOND_BUILDER_DATABASE_URL ?? "postgres://engram_app:local-only-app@127.0.0.1:5432/engramport";
const maintenanceUrl = process.env.SECOND_BUILDER_MAINTENANCE_DATABASE_URL ?? "postgres://engram_maintenance:local-only-maintenance@127.0.0.1:5432/engramport";
const adminUrl = process.env.SECOND_BUILDER_POSTGRES_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/engramport";

const ids = Object.freeze({
  tenant: "10000000-0000-0000-0000-000000000001",
  identity: "61000000-0000-0000-0000-000000000001",
  authorization: "61000000-0000-0000-0000-000000000002",
  principal: "61000000-0000-0000-0000-000000000003",
  binding: "61000000-0000-0000-0000-000000000004",
});
const issuer = "https://second-builder.synthetic.invalid";
const subject = "builder-two";

async function cleanupEnrollment(admin) {
  await admin.query("DELETE FROM founder_tenant_bindings WHERE binding_id=$1", [ids.binding]);
  await admin.query("DELETE FROM founding_authorizations WHERE authorization_id=$1", [ids.authorization]);
  await admin.query("DELETE FROM founder_external_identities WHERE identity_id=$1", [ids.identity]);
  await admin.query("DELETE FROM principals WHERE id=$1", [ids.principal]);
}

test("synthetic second builder uses the existing issuer and bootstrap operator role", async (t) => {
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  const maintenance = new Pool({ connectionString: maintenanceUrl, max: 1 });
  t.after(async () => {
    await cleanupEnrollment(admin);
    await Promise.all([admin.end(), maintenance.end()]);
  });
  await cleanupEnrollment(admin);

  // Schema-only synthetic identity seed: the repository has no package or CLI
  // that performs this step for a newcomer.
  await admin.query(
    "INSERT INTO founder_external_identities(identity_id,issuer,subject) VALUES($1,$2,$3)",
    [ids.identity, issuer, subject],
  );

  await admin.query("BEGIN");
  try {
    await admin.query("SET LOCAL ROLE engram_bootstrap_operator");
    const issued = await admin.query(
      "SELECT issue_founding_authorization($1,$2,$3,$4,clock_timestamp()+interval '1 hour') AS authorization_id",
      [ids.authorization, ids.identity, ids.principal, ids.tenant],
    );
    assert.equal(issued.rows[0].authorization_id, ids.authorization);
    await admin.query("COMMIT");
  } catch (error) {
    await admin.query("ROLLBACK");
    throw error;
  }

  const resolved = await maintenance.query(
    "SELECT principal_id FROM resolve_founder_principal($1,$2,NULL,$3,NULL,NULL)",
    [issuer, subject, ids.authorization],
  );
  assert.equal(resolved.rows[0].principal_id, ids.principal);

  // The binding step is also schema-only today; this makes the limitation of
  // the successful synthetic exercise explicit instead of inventing enrollment.
  await admin.query(
    "INSERT INTO principals(id,tenant_id,kind,external_issuer,external_subject,display_name) VALUES($1,$2,'human',$3,$4,'Synthetic Builder Two')",
    [ids.principal, ids.tenant, issuer, subject],
  );
  await admin.query(
    "INSERT INTO founder_tenant_bindings(binding_id,identity_id,tenant_id,principal_id) VALUES($1,$2,$3,$4)",
    [ids.binding, ids.identity, ids.tenant, ids.principal],
  );
  const persistent = await maintenance.query(
    "SELECT principal_id FROM resolve_founder_principal($1,$2,$3,NULL,NULL,NULL)",
    [issuer, subject, ids.binding],
  );
  const controls = await admin.query(`SELECT
    has_function_privilege('engram_bootstrap_operator','issue_founding_authorization(uuid,uuid,uuid,uuid,timestamptz)','EXECUTE') AS operator_can_issue,
    has_function_privilege('engram_app','issue_founding_authorization(uuid,uuid,uuid,uuid,timestamptz)','EXECUTE') AS app_can_issue,
    (SELECT consumed_at IS NOT NULL FROM founding_authorizations WHERE authorization_id=$1) AS consumed`, [ids.authorization]);
  assert.deepEqual({
    persistent: persistent.rows[0].principal_id,
    operatorCanIssue: controls.rows[0].operator_can_issue,
    appCanIssue: controls.rows[0].app_can_issue,
    consumed: controls.rows[0].consumed,
  }, {
    persistent: ids.principal,
    operatorCanIssue: true,
    appCanIssue: false,
    consumed: true,
  });
  console.log("SECOND_BUILDER_ENROLLMENT identity=schema-seeded issuer=bootstrap-operator authorization=consumed binding=schema-established package_path=absent");
});

test("second builder can read and revoke builder one's PostgreSQL claim state", async (t) => {
  const builderOnePool = new Pool({ connectionString: appUrl, max: 1 });
  const builderTwoPool = new Pool({ connectionString: appUrl, max: 1 });
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  t.after(async () => {
    await admin.query("DELETE FROM port_watch_claims WHERE agent=$1 AND project=$2", ["builder-one", "second-builder"]);
    await Promise.all([builderOnePool.end(), builderTwoPool.end(), admin.end()]);
  });
  await admin.query("DELETE FROM port_watch_claims WHERE agent=$1 AND project=$2", ["builder-one", "second-builder"]);

  const builderOneClaims = new sdk.PostgresClaimStore(builderOnePool);
  const builderTwoClaims = new sdk.PostgresClaimStore(builderTwoPool);
  const acquired = await builderOneClaims.acquire({
    agent: "builder-one", project: "second-builder", event_id: "builder-one-handoff", lease_ms: 30_000,
  });
  assert.equal(acquired.acquired, true);
  const readAcrossBuilder = await builderTwoClaims.read("builder-one", "second-builder");
  assert.equal(readAcrossBuilder.run_id, acquired.claim.run_id);
  const revokedAcrossBuilder = await builderTwoClaims.revoke("builder-one", "second-builder");
  assert.equal(revokedAcrossBuilder.lease_status, "revoked");
  assert.equal(revokedAcrossBuilder.termination_requested, true);
  console.log("SECOND_BUILDER_POSTGRES_CLAIM read=accepted revoke=accepted subject_binding=absent");
});
