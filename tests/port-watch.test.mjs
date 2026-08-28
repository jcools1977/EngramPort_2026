import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
const portWatchSpecifier = process.env.PORT_WATCH_MODULE ?? pathToFileURL(path.resolve(import.meta.dirname, "../packages/port-watch/src/index.mjs")).href;
const {
  FileClaimStore, FileInboxCache, FileWatchStore, PortWatch, RecordingRunner,
  ObservationConsumer, authorizedInboxSource, authorizedObservationSource,
  canonicalBatchDigest, checkpointDigest, decideWatch, nextPollDelay, stableDeliveryId,
} = await import(portWatchSpecifier);

const observationSubscription = Object.freeze({
  tenant_id: "10000000-0000-0000-0000-000000000001",
  subscription_id: "91000000-0000-0000-0000-000000000001",
  subscriber_id: "11000000-0000-0000-0000-000000000001",
  selector_revision: "a".repeat(64),
});
const observed = [
  { position: "events/agent-a/001.md", event_id: "event-a", canonical_bytes: Buffer.from("alpha\n") },
  { position: "events/agent-a/002.md", event_id: "event-b", canonical_bytes: Buffer.from("beta\n") },
];

function observationFixture({ events = observed, sink = { async deliver() { return { accepted: true }; } } } = {}) {
  const rows = [];
  const source = authorizedObservationSource({
    query: async ({ after }) => events.filter((entry) => after === null || entry.position > after),
    readRange: async ({ from, to }) => events.filter((entry) => entry.position >= from && entry.position <= to),
  });
  const store = {
    rows,
    async list() { return structuredClone(rows); },
    async append(checkpoint) {
      const existing = rows.find((row) => row.delivery_id === checkpoint.delivery_id);
      if (existing) return structuredClone(existing);
      rows.push(structuredClone(checkpoint));
      return structuredClone(checkpoint);
    },
  };
  return { rows, source, store, consumer: new ObservationConsumer({ source, store, sink }) };
}

test("observation delivery cannot obtain a turn through the real consumer call site", async () => {
  const f = observationFixture({ sink: { async deliver({ capability }) {
    assert.deepEqual(capability, { kind: "observation", can_grant_turn: false, scopes: [] });
    return { claim_turn: true };
  } } });
  await assert.rejects(f.consumer.poll(observationSubscription), /OBSERVATION_AUTHORITY_REFUSED/);
  assert.equal(f.rows.length, 0);
});

test("checkpoint range digest is recomputed from canonical bytes and poisoned state is rejected", async () => {
  const f = observationFixture();
  await f.consumer.poll(observationSubscription);
  const poisoned = [{ ...observed[0], canonical_bytes: Buffer.from("poison\n") }, observed[1]];
  const restarted = observationFixture({ events: poisoned });
  restarted.store.rows.push(...structuredClone(f.rows));
  await assert.rejects(restarted.consumer.poll(observationSubscription), /OBSERVATION_CANONICAL_RANGE_INVALID/);
});

test("checkpoint chain binds the prior checkpoint body digest", async () => {
  const f = observationFixture();
  await f.consumer.poll(observationSubscription);
  f.rows[0].prior_checkpoint_digest = "f".repeat(64);
  await assert.rejects(f.consumer.poll(observationSubscription), /OBSERVATION_PRIOR_DIGEST_INVALID/);
});

test("stable delivery id deduplicates the same canonical batch", async () => {
  const f = observationFixture();
  const batch_digest = canonicalBatchDigest(observed);
  const common = {
    ...observationSubscription, covered_from: observed[0].position, covered_to: observed.at(-1).position,
    event_count: observed.length, batch_digest, prior_checkpoint_digest: null,
  };
  common.delivery_id = stableDeliveryId(common);
  common.checkpoint_digest = checkpointDigest(common);
  await f.store.append({ ...common, checkpoint_id: "92000000-0000-0000-0000-000000000001" });
  await f.store.append({ ...common, checkpoint_id: "92000000-0000-0000-0000-000000000002" });
  assert.equal(f.rows.length, 1);
});

const work = (id = "event-1") => ({
  relative: `events/agent-a/${id}.md`, event_id: id, thread: "work", from: "agent-a",
  type: "handoff", occurred_at: "2026-08-28T00:00:00Z", in_reply_to: null,
  next: "agent", content_sha256: "0".repeat(64), artifacts: [], body: "work\n",
});

async function fixture(deliveries = []) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "port-watch-"));
  const store = new FileWatchStore(path.join(dir, "watch.json"));
  const claim_store = new FileClaimStore(path.join(dir, "claims"));
  const runner = new RecordingRunner();
  let snapshot = { log_state: "state-1", deliveries: [...deliveries], cache: "disabled" };
  const inbox = authorizedInboxSource(async () => structuredClone(snapshot));
  const watch = new PortWatch({ store, claim_store, inbox, runner, supervisor_scopes: ["admin:project", "events:write"] });
  return {
    dir, store, claim_store, runner, inbox, watch,
    setDeliveries(value, log_state = snapshot.log_state) { snapshot = { log_state, deliveries: [...value], cache: "disabled" }; },
  };
}

async function cleanup(value) { await rm(value.dir, { recursive: true, force: true }); }

test("unchanged authorized work set invokes runner exactly zero times across many ticks", async () => {
  const f = await fixture();
  try {
    await f.watch.configure("agent", "project", { enabled: true, scopes: ["events:write"] });
    for (let index = 0; index < 100; index += 1) assert.deepEqual(await f.watch.tick("agent", "project"), { action: "skip", reason: "unchanged" });
    assert.equal(f.runner.invocations.length, 0);
    assert.equal((await f.store.read()).events.filter((event) => event.kind === "watch.polled").length, 100);
  } finally { await cleanup(f); }
});

test("authorized addressed work wakes without project sequence or implementation-authority fields", async () => {
  const f = await fixture([{ ...work(), type: "task" }]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const result = await f.watch.tick("agent", "project");
    assert.equal(result.action, "wake");
    assert.equal(f.runner.invocations.length, 1);
    assert.equal(Object.hasOwn(result.event, "project_seq"), false);
    assert.equal(Object.hasOwn(result.event, "implementation_authority"), false);
  } finally { await cleanup(f); }
});

test("waking grants exactly actor scopes and never supervisor scopes", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true, scopes: ["events:write"] });
    await f.watch.tick("agent", "project");
    assert.deepEqual(f.runner.invocations[0].token.scopes, ["events:write"]);
    assert.equal(f.runner.invocations[0].token.scopes.includes("admin:project"), false);
    assert.deepEqual(f.runner.invocations[0].context.event_ids, ["event-1"]);
  } finally { await cleanup(f); }
});

test("completion stores no position and an unanswered work item remains eligible at least once", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const first = await f.watch.tick("agent", "project");
    await f.watch.complete("agent", "project", { run_id: first.run_id });
    const state = await f.store.read();
    assert.equal(Object.hasOwn(state.agents["agent:project"], "cursor"), false);
    assert.equal(Object.hasOwn(state.agents["agent:project"], "completions"), false);
    assert.equal((await f.watch.tick("agent", "project")).action, "wake", "only a Port Log reply disposes work");
  } finally { await cleanup(f); }
});

test("reply-derived removal changes the set without a cursor mutation", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const first = await f.watch.tick("agent", "project");
    await f.watch.complete("agent", "project", { run_id: first.run_id });
    f.setDeliveries([], "state-with-reply");
    assert.deepEqual(await f.watch.tick("agent", "project"), { action: "skip", reason: "unchanged" });
    assert.equal(f.runner.invocations.length, 1);
  } finally { await cleanup(f); }
});

test("disposable cache is keyed to log state and deletion changes load count, never the set", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "port-watch-cache-"));
  const file = path.join(dir, "cache.json");
  const cache = new FileInboxCache(file);
  let loads = 0;
  const load = async () => { loads += 1; return [work()]; };
  try {
    const first = await cache.resolve({ actor: "agent", log_state: "head-a", load });
    const second = await cache.resolve({ actor: "agent", log_state: "head-a", load });
    const third = await cache.resolve({ actor: "agent", log_state: "head-b", load });
    assert.deepEqual(first.deliveries, second.deliveries);
    assert.deepEqual(second.deliveries, third.deliveries);
    assert.deepEqual([first.cache, second.cache, third.cache], ["miss", "hit", "miss"]);
    assert.equal(loads, 2);
    await rm(file);
    const rebuilt = await cache.resolve({ actor: "agent", log_state: "head-b", load });
    assert.deepEqual(rebuilt.deliveries, first.deliveries);
    assert.equal(rebuilt.cache, "miss");
    assert.equal(loads, 3);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("changed log state cannot reuse a stale cached work set", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "port-watch-cache-state-"));
  const cache = new FileInboxCache(path.join(dir, "cache.json"));
  try {
    await cache.resolve({ actor: "agent", log_state: "before-reply", load: async () => [work()] });
    const after = await cache.resolve({ actor: "agent", log_state: "after-reply", load: async () => [] });
    assert.deepEqual(after.deliveries, []);
    assert.equal(after.cache, "miss");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("concurrent ticks reserve one invocation slot before either runner call", async () => { /* PORT_WATCH_DUPLICATE_INVOCATION_CONTROL */
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const decisions = await Promise.all([f.watch.tick("agent", "project"), f.watch.tick("agent", "project")]);
    assert.deepEqual(decisions.map((decision) => decision.action).sort(), ["skip", "wake"]);
    assert.equal(decisions.find((decision) => decision.action === "skip").reason, "wip_limit");
    assert.equal(f.runner.invocations.length, 1);
  } finally { await cleanup(f); }
});

test("separate PortWatch and store instances sharing a claim root still invoke once", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const second = new PortWatch({
      store: new FileWatchStore(f.store.file), claim_store: new FileClaimStore(f.claim_store.root), inbox: f.inbox, runner: f.runner,
    });
    const decisions = await Promise.all([f.watch.tick("agent", "project"), second.tick("agent", "project")]);
    assert.deepEqual(decisions.map((decision) => decision.action).sort(), ["skip", "wake"]);
    assert.equal(f.runner.invocations.length, 1);
  } finally { await cleanup(f); }
});

test("lease expiry permits explicit at-least-once redelivery", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const first = await f.watch.tick("agent", "project");
    assert.equal((await f.watch.tick("agent", "project")).reason, "wip_limit");
    await f.watch.expireLease("agent", "project", first.lease_token);
    assert.equal((await f.watch.tick("agent", "project")).action, "wake");
    assert.deepEqual(f.runner.invocations.map((entry) => entry.context.event_ids[0]), ["event-1", "event-1"]);
  } finally { await cleanup(f); }
});

test("legacy active run requires explicit expiry before log-derived migration", async () => {
  const f = await fixture([work()]);
  try {
    await writeFile(f.store.file, `${JSON.stringify({ agents: { "agent:project": { enabled: true, status: "enabled", cursor: 7, scopes: [], active_run: { run_id: "legacy-run" }, completions: [] } }, events: [] })}\n`);
    await assert.rejects(() => f.watch.configure("agent", "project", { enabled: true }), /LEGACY_ACTIVE_RUN_REQUIRES_RESOLUTION/);
    await f.watch.resolveLegacyRun("agent", "project", { action: "expire" });
    await f.watch.configure("agent", "project", { enabled: true });
    assert.equal((await f.watch.tick("agent", "project")).action, "wake");
    assert.equal((await f.store.read()).events.some((event) => event.kind === "legacy.run_expired" && event.redelivery === "at_least_once"), true);
  } finally { await cleanup(f); }
});

test("inactive legacy cursor is ignored and removed rather than imported", async () => {
  const f = await fixture([work()]);
  try {
    await writeFile(f.store.file, `${JSON.stringify({ agents: { "agent:project": { enabled: true, status: "enabled", cursor: 999, scopes: [], active_run: null, completions: [{ event_id: "old" }] } }, events: [] })}\n`);
    await f.watch.configure("agent", "project", { enabled: true });
    const state = await f.store.read();
    assert.equal(Object.hasOwn(state.agents["agent:project"], "cursor"), false);
    assert.equal(state.events.some((event) => event.kind === "legacy.position_ignored"), true);
    assert.equal((await f.watch.tick("agent", "project")).action, "wake");
  } finally { await cleanup(f); }
});

test("rewind is unavailable because position is derived from the log", async () => {
  const f = await fixture();
  try { await assert.rejects(() => f.watch.rewind("agent", "project", 0), /POSITION_DERIVED_FROM_LOG/); }
  finally { await cleanup(f); }
});

test("off by default, pause, and stop each block new wakes", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project");
    assert.equal((await f.watch.tick("agent", "project")).reason, "disabled");
    await f.watch.control("agent", "project", "enable");
    await f.watch.control("agent", "project", "pause");
    assert.equal((await f.watch.tick("agent", "project")).reason, "paused");
    await f.watch.control("agent", "project", "stop");
    assert.equal((await f.watch.tick("agent", "project")).reason, "stopped");
  } finally { await cleanup(f); }
});

test("stop revokes an active local claim", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    const wake = await f.watch.tick("agent", "project");
    await f.watch.control("agent", "project", "stop");
    const claim = await f.watch.activeClaim("agent", "project");
    assert.equal(claim.termination_requested, true);
    assert.equal(claim.lease_status, "revoked");
    await assert.rejects(() => f.watch.complete("agent", "project", { run_id: wake.run_id }), /LEASE_NOT_ACTIVE/);
  } finally { await cleanup(f); }
});

test("decision function is deterministic and has no cursor input", () => {
  const input = { watch: { enabled: true, status: "enabled" }, deliveries: [work()] };
  assert.deepEqual(decideWatch(input), decideWatch(structuredClone(input)));
  assert.equal(Object.hasOwn(input, "cursor"), false);
});

test("cadence defaults to 240 and bounded jitter never skips tick", () => {
  assert.equal(nextPollDelay(), 240);
  assert.equal(nextPollDelay({ sample: 0 }), 216);
  assert.equal(nextPollDelay({ sample: 1 }), 264);
  assert.equal(nextPollDelay({ cadence_seconds: 60, jitter_fraction: 0.2, sample: 0.5 }), 60);
  assert.ok(nextPollDelay({ cadence_seconds: 1, jitter_fraction: 0.99, sample: 0 }) > 0);
});

test("unbranded broad inbox source is structurally refused", async () => {
  const f = await fixture();
  try {
    assert.throws(() => new PortWatch({ store: f.store, inbox: { queryAuthorized: async () => [] }, runner: f.runner }), /already-authorized inbox source/);
  } finally { await cleanup(f); }
});

test("claim file contains only local WIP state, never a delivery position", async () => {
  const f = await fixture([work()]);
  try {
    await f.watch.configure("agent", "project", { enabled: true });
    await f.watch.tick("agent", "project");
    const claim = JSON.parse(await readFile(f.claim_store.file("agent", "project"), "utf8"));
    assert.equal(Object.hasOwn(claim, "cursor"), false);
    assert.equal(Object.hasOwn(claim, "project_seq"), false);
    assert.equal(claim.event_id, "event-1");
  } finally { await cleanup(f); }
});
