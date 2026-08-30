import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { listInboxEntries } from "../../git-adapter/src/event-core.mjs";

export {
  ObservationConsumer, PostgresObservationDispositionStore, authorizedObservationSource,
  canonicalBatchDigest, checkpointDigest, stableDeliveryId,
} from "./observation.mjs";

const execFileAsync = promisify(execFile);
const AUTHORIZED = Symbol("authorized-work-inbox-source");
const key = (agent, project) => `${agent}:${project}`;
const initial = () => ({ enabled: false, status: "disabled", scopes: [], cadence_seconds: 240, jitter_fraction: 0.1 });

async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  await rename(temporary, file);
}

export function authorizedInboxSource(query) {
  if (typeof query !== "function") throw new TypeError("authorized inbox query must be a function");
  return Object.freeze({ [AUTHORIZED]: true, queryAuthorized: query });
}

export class RecordingRunner {
  invocations = [];
  async run(context, token) {
    this.invocations.push(structuredClone({ context, token }));
    return { run_id: context.run_id };
  }
}

export class FileWatchStore {
  constructor(file) { this.file = file; this.pending = Promise.resolve(); }
  async read() {
    try { return JSON.parse(await readFile(this.file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return { agents: {}, events: [] }; throw error; }
  }
  async transaction(change) {
    const execute = async () => {
      const state = await this.read();
      const next = await change(structuredClone(state));
      await atomicJson(this.file, next);
      return structuredClone(next);
    };
    const result = this.pending.then(execute);
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }
}

export class FileInboxCache {
  constructor(file) { this.file = file; this.pending = Promise.resolve(); }
  async read() {
    try { return JSON.parse(await readFile(this.file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return { version: 1, actors: {} }; throw error; }
  }
  async resolve({ actor, log_state, load }) { /* PORT_WATCH_CACHE_LOG_STATE */
    if (!actor || typeof log_state !== "string" || !log_state) throw new TypeError("cache resolution requires actor and log_state");
    if (typeof load !== "function") throw new TypeError("cache resolution requires a loader");
    const current = await this.read();
    const cached = current.actors?.[actor];
    if (cached?.log_state === log_state && Array.isArray(cached.deliveries)) {
      return { log_state, deliveries: structuredClone(cached.deliveries), cache: "hit" };
    }
    const deliveries = await load();
    if (!Array.isArray(deliveries)) throw new TypeError("authorized inbox loader must return an array");
    const execute = async () => {
      const state = await this.read();
      state.version = 1;
      state.actors ??= {};
      state.actors[actor] = { log_state, deliveries: structuredClone(deliveries) };
      await atomicJson(this.file, state);
    };
    const result = this.pending.then(execute);
    this.pending = result.then(() => undefined, () => undefined);
    await result;
    return { log_state, deliveries: structuredClone(deliveries), cache: "miss" };
  }
}

export async function gitLogState(cwd = process.cwd()) {
  const surfaces = ["events", "actors", "threads", "engramport.yaml"];
  const options = { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 };
  const [{ stdout: head }, { stdout: diff }, { stdout: untracked }] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"], options),
    execFileAsync("git", ["diff", "--binary", "HEAD", "--", ...surfaces], options),
    execFileAsync("git", ["ls-files", "--others", "--exclude-standard", "-z", "--", ...surfaces], options),
  ]);
  const digest = createHash("sha256").update(head.trim()).update("\0").update(diff);
  for (const relative of untracked.split("\0").filter(Boolean).sort()) {
    digest.update("\0").update(relative).update("\0").update(await readFile(path.join(cwd, relative)));
  }
  return `git-v1:${digest.digest("hex")}`;
}

export function gitAuthorizedInboxSource({ cwd = process.cwd(), cache = null, state = gitLogState } = {}) {
  if (cache !== null && typeof cache?.resolve !== "function") throw new TypeError("inbox cache must expose resolve");
  return authorizedInboxSource(async ({ agent }) => {
    const log_state = await state(cwd);
    const load = () => listInboxEntries({ actor: agent, cwd });
    if (cache) return cache.resolve({ actor: agent, log_state, load });
    return { log_state, deliveries: await load(), cache: "disabled" };
  });
}

function claimName(agent, project) {
  return createHash("sha256").update(`${agent}\0${project}`, "utf8").digest("hex");
}

export class FileClaimStore {
  constructor(root, { clock = () => Date.now() } = {}) { this.root = root; this.clock = clock; }
  directory(agent, project) { return path.join(this.root, claimName(agent, project)); }
  file(agent, project) { return path.join(this.directory(agent, project), "claim.json"); }
  async read(agent, project) {
    try { return JSON.parse(await readFile(this.file(agent, project), "utf8")); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  async acquire({ agent, project, event_id, lease_ms = 300_000 }) { /* PORT_WATCH_ATOMIC_CLAIM */
    if (!(lease_ms > 0)) throw new RangeError("lease_ms must be positive");
    await mkdir(this.root, { recursive: true });
    const directory = this.directory(agent, project);
    for (;;) {
      const now = this.clock();
      const claim = {
        run_id: randomUUID(), lease_token: randomUUID(), event_id,
        lease_status: "active", claimed_at: new Date(now).toISOString(), expires_at: new Date(now + lease_ms).toISOString(),
      };
      try {
        await mkdir(directory);
        try { await writeFile(this.file(agent, project), `${JSON.stringify(claim, null, 2)}\n`, { flag: "wx" }); }
        catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
        return { acquired: true, claim };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
      const existing = await this.read(agent, project);
      if (!existing || Date.parse(existing.expires_at) > now) return { acquired: false, claim: existing };
      const expired = `${directory}.expired.${process.pid}.${randomUUID()}`;
      try { await rename(directory, expired); }
      catch (error) { if (error.code === "ENOENT" || error.code === "EEXIST") continue; throw error; }
      await rm(expired, { recursive: true, force: true });
    }
  }
  async release(agent, project, { run_id }) {
    const claim = await this.read(agent, project);
    if (!claim || claim.run_id !== run_id) throw new Error("RUN_NOT_ACTIVE");
    const directory = this.directory(agent, project);
    const released = `${directory}.released.${process.pid}.${randomUUID()}`;
    await rename(directory, released);
    await rm(released, { recursive: true, force: true });
    return claim;
  }
  async expire(agent, project, lease_token) {
    const claim = await this.read(agent, project);
    if (!claim || claim.lease_token !== lease_token) throw new Error("LEASE_TOKEN_MISMATCH");
    return this.release(agent, project, { run_id: claim.run_id });
  }
  async revoke(agent, project) {
    const claim = await this.read(agent, project);
    if (!claim) return null;
    claim.lease_status = "revoked";
    claim.termination_requested = true;
    await atomicJson(this.file(agent, project), claim);
    return claim;
  }
}

function normalizePostgresClaim(row) {
  if (!row) return null;
  const { acquired: ignored, ...claim } = row;
  void ignored;
  return {
    ...claim,
    claimed_at: claim.claimed_at instanceof Date ? claim.claimed_at.toISOString() : claim.claimed_at,
    expires_at: claim.expires_at instanceof Date ? claim.expires_at.toISOString() : claim.expires_at,
  };
}

export class PostgresClaimStore {
  constructor(pool) {
    if (!pool?.query) throw new TypeError("claim store requires a PostgreSQL pool or client");
    this.pool = pool;
  }
  async read(agent, project) {
    const result = await this.pool.query("SELECT * FROM read_port_watch_claim($1,$2)", [agent, project]);
    return normalizePostgresClaim(result.rows[0]);
  }
  async acquire({ agent, project, event_id, lease_ms = 300_000 }) {
    if (!(lease_ms > 0) || !Number.isSafeInteger(lease_ms)) throw new RangeError("lease_ms must be a positive integer");
    const run_id = randomUUID();
    const lease_token = randomUUID();
    const result = await this.pool.query(
      "SELECT * FROM acquire_port_watch_claim($1,$2,$3,$4,$5,$6)",
      [agent, project, event_id, run_id, lease_token, lease_ms],
    );
    const row = result.rows[0];
    if (!row) throw new Error("PORT_WATCH_CLAIM_RESULT_MISSING");
    return { acquired: row.acquired, claim: normalizePostgresClaim(row) };
  }
  async release(agent, project, { run_id }) {
    const result = await this.pool.query("SELECT * FROM release_port_watch_claim($1,$2,$3)", [agent, project, run_id]);
    return normalizePostgresClaim(result.rows[0]);
  }
  async expire(agent, project, lease_token) {
    const result = await this.pool.query("SELECT * FROM expire_port_watch_claim($1,$2,$3)", [agent, project, lease_token]);
    return normalizePostgresClaim(result.rows[0]);
  }
  async revoke(agent, project) {
    const result = await this.pool.query("SELECT * FROM revoke_port_watch_claim($1,$2)", [agent, project]);
    return normalizePostgresClaim(result.rows[0]);
  }
}

export function decideDelivery({ cursor, events }) {
  const delta = events.filter((event) => event.project_seq > cursor).sort((left, right) => left.project_seq - right.project_seq || left.event_id.localeCompare(right.event_id));
  return delta.length ? { action: "wake", events: delta } : { action: "skip", reason: "unchanged" };
}

export function decideWatch({ watch, deliveries }) { /* PORT_WATCH_LOG_DERIVED_POSITION */
  if (!watch.enabled) return { action: "skip", reason: "disabled" };
  if (watch.status === "paused") return { action: "skip", reason: "paused" };
  if (watch.status === "stopped") return { action: "skip", reason: "stopped" };
  if (!deliveries.length) return { action: "skip", reason: "unchanged" };
  return { action: "wake", event: deliveries[0] };
}

export function nextPollDelay({ cadence_seconds = 240, jitter_fraction = 0.1, sample = 0.5 } = {}) {
  if (!(cadence_seconds > 0) || jitter_fraction < 0 || jitter_fraction >= 1 || sample < 0 || sample > 1) throw new RangeError("invalid cadence or jitter");
  return cadence_seconds * (1 - jitter_fraction + 2 * jitter_fraction * sample);
}

function hasLegacyPosition(watch) {
  return Object.hasOwn(watch, "cursor") || Object.hasOwn(watch, "active_run") || Object.hasOwn(watch, "completions");
}

function migrateLegacyPosition(watch) { /* PORT_WATCH_LEGACY_ACTIVE_RUN_GUARD */
  if (watch.active_run) throw new Error("LEGACY_ACTIVE_RUN_REQUIRES_RESOLUTION");
  const { cursor: ignoredCursor, active_run: ignoredRun, completions: ignoredCompletions, ...current } = watch;
  void ignoredCursor; void ignoredRun; void ignoredCompletions;
  return { ...initial(), ...current };
}

function normalizeSnapshot(snapshot) {
  if (Array.isArray(snapshot)) return { log_state: null, deliveries: snapshot, cache: "unspecified" };
  if (!snapshot || !Array.isArray(snapshot.deliveries)) throw new TypeError("authorized inbox source must return deliveries");
  return snapshot;
}

export class PortWatch {
  constructor({ store, inbox, runner, claim_store = null, supervisor_scopes = [], lease_ms = 300_000 }) {
    if (!inbox?.[AUTHORIZED]) throw new TypeError("PortWatch requires an already-authorized inbox source");
    if (!store?.file) throw new TypeError("PortWatch requires a file-backed control store");
    this.store = store;
    this.inbox = inbox;
    this.runner = runner;
    this.claim_store = claim_store ?? new FileClaimStore(`${store.file}.claims`);
    this.supervisor_scopes = [...supervisor_scopes];
    this.lease_ms = lease_ms;
  }
  async configure(agent, project, { enabled = false, scopes = [], cadence_seconds = 240, jitter_fraction = 0.1 } = {}) {
    return this.store.transaction((state) => {
      const existing = state.agents[key(agent, project)] ?? initial();
      const legacy = hasLegacyPosition(existing);
      const current = legacy ? migrateLegacyPosition(existing) : { ...initial(), ...existing };
      state.agents[key(agent, project)] = { ...current, enabled, status: enabled ? "enabled" : "disabled", scopes: [...scopes], cadence_seconds, jitter_fraction };
      if (legacy) state.events.push({ kind: "legacy.position_ignored", agent, project, reason: "position_is_derived_from_log" });
      state.events.push({ kind: enabled ? "watch.enabled" : "watch.skipped", agent, project, reason: enabled ? undefined : "disabled" });
      return state;
    });
  }
  async resolveLegacyRun(agent, project, { action } = {}) {
    if (action !== "expire") throw new Error("LEGACY_RUN_RESOLUTION_REQUIRED");
    return this.store.transaction((state) => {
      const existing = state.agents[key(agent, project)] ?? initial();
      const active = existing.active_run ?? null;
      const { cursor: ignoredCursor, active_run: ignoredRun, completions: ignoredCompletions, ...current } = existing;
      void ignoredCursor; void ignoredRun; void ignoredCompletions;
      state.agents[key(agent, project)] = { ...initial(), ...current };
      state.events.push({ kind: "legacy.run_expired", agent, project, run_id: active?.run_id ?? null, redelivery: "at_least_once" });
      return state;
    });
  }
  async control(agent, project, action) {
    const result = await this.store.transaction((state) => {
      const existing = state.agents[key(agent, project)] ?? initial();
      const watch = hasLegacyPosition(existing) ? migrateLegacyPosition(existing) : { ...initial(), ...existing };
      if (action === "enable") { watch.enabled = true; watch.status = "enabled"; state.events.push({ kind: "watch.enabled", agent, project }); }
      else if (action === "pause") { watch.status = "paused"; state.events.push({ kind: "watch.paused", agent, project }); }
      else if (action === "stop") { watch.status = "stopped"; state.events.push({ kind: "watch.stopped", agent, project }); }
      else throw new TypeError(`unknown control ${action}`);
      state.agents[key(agent, project)] = watch;
      return state;
    });
    if (action === "stop") await this.claim_store.revoke(agent, project);
    return result;
  }
  async record(event) {
    return this.store.transaction((state) => { state.events.push(event); return state; });
  }
  async tick(agent, project) {
    const before = await this.store.read();
    const existing = before.agents[key(agent, project)] ?? initial();
    const watch = hasLegacyPosition(existing) ? migrateLegacyPosition(existing) : { ...initial(), ...existing };
    const snapshot = normalizeSnapshot(await this.inbox.queryAuthorized({ agent, project }));
    const decision = decideWatch({ watch, deliveries: snapshot.deliveries });
    await this.record({ kind: "watch.polled", agent, project, log_state: snapshot.log_state, result: decision.action });
    if (decision.action === "skip") {
      await this.record({ kind: "watch.skipped", agent, project, reason: decision.reason });
      return decision;
    }
    const reservation = await this.claim_store.acquire({ agent, project, event_id: decision.event.event_id, lease_ms: this.lease_ms });
    if (!reservation.acquired) {
      const skipped = { action: "skip", reason: "wip_limit" };
      await this.record({ kind: "watch.skipped", agent, project, reason: skipped.reason, event_id: decision.event.event_id });
      return skipped;
    }
    const currentState = await this.store.read();
    const current = currentState.agents[key(agent, project)] ?? initial();
    const rechecked = decideWatch({ watch: current, deliveries: [decision.event] });
    if (rechecked.action === "skip") {
      await this.claim_store.release(agent, project, { run_id: reservation.claim.run_id });
      await this.record({ kind: "watch.skipped", agent, project, reason: rechecked.reason });
      return rechecked;
    }
    await this.record({ kind: "watch.woke", agent, project, event_id: decision.event.event_id, run_id: reservation.claim.run_id, log_state: snapshot.log_state });
    const token = { agent, project, scopes: [...current.scopes] };
    const context = {
      run_id: reservation.claim.run_id,
      event_ids: [decision.event.event_id],
      events: [structuredClone(decision.event)],
      log_state: snapshot.log_state,
    };
    await this.runner.run(context, token);
    return { ...decision, ...reservation.claim };
  }
  async complete(agent, project, { run_id, status = "completed" }) {
    if (!["completed", "failed"].includes(status)) throw new TypeError("terminal status required");
    const claim = await this.claim_store.read(agent, project);
    if (!claim || claim.run_id !== run_id) throw new Error("RUN_NOT_ACTIVE");
    if (claim.lease_status !== "active") throw new Error("LEASE_NOT_ACTIVE");
    await this.claim_store.release(agent, project, { run_id });
    await this.record({ kind: `run.${status}`, agent, project, run_id, event_id: claim.event_id, disposition: "reply_in_port_log" });
    return { run_id, event_id: claim.event_id, status };
  }
  async expireLease(agent, project, lease_token) {
    const claim = await this.claim_store.expire(agent, project, lease_token);
    await this.record({ kind: "run.lease_expired", agent, project, run_id: claim.run_id, event_id: claim.event_id, redelivery: "at_least_once" });
    return claim;
  }
  async activeClaim(agent, project) { return this.claim_store.read(agent, project); }
  async rewind() { throw new Error("POSITION_DERIVED_FROM_LOG"); }
}
