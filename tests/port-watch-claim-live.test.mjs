import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import pg from "pg";

const moduleUrl = process.env.PORT_WATCH_CLAIM_MODULE ?? pathToFileURL(path.resolve(import.meta.dirname, "../packages/port-watch/src/index.mjs")).href;
const { FileWatchStore, PortWatch, PostgresClaimStore, authorizedInboxSource } = await import(moduleUrl);
const { Pool } = pg;
const baseUrl = process.env.PORT_WATCH_CLAIM_DATABASE_URL ?? "postgres://engram_app:local-only-app@127.0.0.1:5432/engramport";
const adminUrl = process.env.PORT_WATCH_CLAIM_POSTGRES_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/engramport";

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "port-watch-pg-claim-"));
  const poolA = new Pool({ connectionString: baseUrl, max: 1 });
  const poolB = new Pool({ connectionString: baseUrl, max: 1 });
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  t.after(async () => {
    await admin.query("DELETE FROM port_watch_claims WHERE agent=$1 AND project=$2", ["agent-b", "portable-claim"]);
    await Promise.all([poolA.end(), poolB.end(), admin.end()]);
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, poolA, poolB, admin };
}

test("PostgreSQL claim store excludes duplicate invocation across independent connections", async (t) => {
  const f = await fixture(t);
  const invocations = [];
  const runner = { async run(context) { invocations.push(context.run_id); } };
  const inbox = authorizedInboxSource(async () => ({ log_state: "same-log", deliveries: [{ event_id: "handoff-1", project_seq: 1 }] }));
  const watches = [f.poolA, f.poolB].map((pool, index) => new PortWatch({
    store: new FileWatchStore(path.join(f.directory, `watch-${index}.json`)),
    claim_store: new PostgresClaimStore(pool), inbox, runner, lease_ms: 30_000,
  }));
  await Promise.all(watches.map((watch) => watch.configure("agent-b", "portable-claim", { enabled: true })));
  const outcomes = await Promise.all(watches.map((watch) => watch.tick("agent-b", "portable-claim")));
  assert.equal(invocations.length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.action === "wake").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.reason === "wip_limit").length, 1);
  console.log(`PORT_WATCH_POSTGRES_CLAIM connections=2 invocations=${invocations.length} wakes=${outcomes.filter((outcome) => outcome.action === "wake").length}`);
});

test("PostgreSQL claim store reclaims an expired lease while an active lease blocks", async (t) => {
  const f = await fixture(t);
  const firstStore = new PostgresClaimStore(f.poolA);
  const secondStore = new PostgresClaimStore(f.poolB);
  const abandoned = await firstStore.acquire({ agent: "agent-b", project: "portable-claim", event_id: "handoff-expired", lease_ms: 25 });
  assert.equal(abandoned.acquired, true);
  await f.admin.query("SELECT pg_sleep(0.05)");
  const reclaimed = await secondStore.acquire({ agent: "agent-b", project: "portable-claim", event_id: "handoff-reclaimed", lease_ms: 30_000 });
  assert.equal(reclaimed.acquired, true);
  assert.notEqual(reclaimed.claim.run_id, abandoned.claim.run_id);
  const blocked = await firstStore.acquire({ agent: "agent-b", project: "portable-claim", event_id: "handoff-blocked", lease_ms: 30_000 });
  assert.equal(blocked.acquired, false);
  assert.equal(blocked.claim.run_id, reclaimed.claim.run_id);
  console.log("PORT_WATCH_POSTGRES_LEASE expired=reclaimed active=blocked");
});
