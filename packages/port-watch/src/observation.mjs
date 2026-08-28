import { createHash, randomUUID } from "node:crypto";

const AUTHORIZED_OBSERVATIONS = Symbol("authorized-observation-source");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const field = (value) => {
  const bytes = Buffer.from(String(value), "utf8");
  return Buffer.concat([Buffer.from(`${bytes.length}:`, "ascii"), bytes]);
};

function digestFields(values) {
  const hash = createHash("sha256");
  for (const value of values) hash.update(field(value ?? ""));
  return hash.digest("hex");
}

export function authorizedObservationSource({ query, readRange }) {
  if (typeof query !== "function" || typeof readRange !== "function") throw new TypeError("observation source requires query and readRange");
  return Object.freeze({ [AUTHORIZED_OBSERVATIONS]: true, queryAuthorized: query, readCanonicalRange: readRange });
}

export function canonicalBatchDigest(observations) { /* OBSERVATION_CANONICAL_RANGE_DIGEST */
  const hash = createHash("sha256");
  for (const observation of observations) {
    if (!observation.position || !observation.event_id || observation.canonical_bytes === undefined) throw new TypeError("canonical observation is incomplete");
    const bytes = Buffer.isBuffer(observation.canonical_bytes) ? observation.canonical_bytes : Buffer.from(observation.canonical_bytes);
    hash.update(field(observation.position));
    hash.update(field(observation.event_id));
    hash.update(field(bytes.length));
    hash.update(bytes);
  }
  return hash.digest("hex");
}

export function checkpointDigest(checkpoint) { /* OBSERVATION_PRIOR_BODY_DIGEST */
  return digestFields([
    "observation-checkpoint-v1", checkpoint.tenant_id, checkpoint.subscription_id, checkpoint.subscriber_id,
    checkpoint.selector_revision, checkpoint.covered_from, checkpoint.covered_to, checkpoint.event_count,
    checkpoint.batch_digest, checkpoint.prior_checkpoint_digest ?? "", checkpoint.delivery_id,
  ]);
}

export function stableDeliveryId({ tenant_id, subscription_id, subscriber_id, selector_revision, covered_from, covered_to, batch_digest }) {
  return digestFields(["observation-delivery-v1", tenant_id, subscription_id, subscriber_id, selector_revision, covered_from, covered_to, batch_digest]);
}

function normalizeCheckpoint(row) {
  return {
    ...row,
    event_count: Number(row.event_count),
    prior_checkpoint_digest: row.prior_checkpoint_digest ?? null,
  };
}

export class PostgresObservationDispositionStore {
  constructor(pool) {
    if (!pool?.query) throw new TypeError("observation store requires a PostgreSQL pool or client");
    this.pool = pool;
  }
  async list(subscription_id) {
    const result = await this.pool.query("SELECT * FROM list_observation_checkpoints($1)", [subscription_id]);
    return result.rows.map(normalizeCheckpoint);
  }
  async append(checkpoint) { /* OBSERVATION_STABLE_DELIVERY_DEDUP */
    const values = [
      checkpoint.checkpoint_id ?? randomUUID(), checkpoint.tenant_id, checkpoint.subscription_id, checkpoint.subscriber_id,
      checkpoint.selector_revision, checkpoint.covered_from, checkpoint.covered_to, checkpoint.event_count,
      checkpoint.batch_digest, checkpoint.prior_checkpoint_digest ?? null, checkpoint.delivery_id, checkpoint.checkpoint_digest,
    ];
    const result = await this.pool.query("SELECT * FROM append_observation_checkpoint($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", values);
    return normalizeCheckpoint(result.rows[0]);
  }
  async get(checkpoint_id) {
    const result = await this.pool.query("SELECT * FROM get_observation_checkpoint($1)", [checkpoint_id]);
    return result.rows.length ? normalizeCheckpoint(result.rows[0]) : null;
  }
}

export class ObservationConsumer {
  constructor({ source, store, sink, batch_size = 100 }) {
    if (!source?.[AUTHORIZED_OBSERVATIONS]) throw new TypeError("ObservationConsumer requires an already-authorized observation source");
    if (!store?.list || !store?.append) throw new TypeError("ObservationConsumer requires a durable disposition store");
    if (!sink?.deliver) throw new TypeError("ObservationConsumer requires an observation sink");
    this.source = source;
    this.store = store;
    this.sink = sink;
    this.batch_size = batch_size;
  }

  async verifyHistory(subscription) { /* OBSERVATION_LOG_WINS_OVER_CHECKPOINT */
    const checkpoints = await this.store.list(subscription.subscription_id);
    let previous = null;
    for (const checkpoint of checkpoints) {
      if (checkpoint.tenant_id !== subscription.tenant_id || checkpoint.subscriber_id !== subscription.subscriber_id || checkpoint.selector_revision !== subscription.selector_revision) throw new Error("OBSERVATION_CHECKPOINT_SUBJECT_MISMATCH");
      if ((checkpoint.prior_checkpoint_digest ?? null) !== (previous?.checkpoint_digest ?? null)) throw new Error("OBSERVATION_PRIOR_DIGEST_INVALID");
      if (checkpointDigest(checkpoint) !== checkpoint.checkpoint_digest) throw new Error("OBSERVATION_CHECKPOINT_BODY_INVALID");
      const canonical = await this.source.readCanonicalRange({ ...subscription, from: checkpoint.covered_from, to: checkpoint.covered_to });
      if (canonical.length !== checkpoint.event_count || canonicalBatchDigest(canonical) !== checkpoint.batch_digest) throw new Error("OBSERVATION_CANONICAL_RANGE_INVALID");
      previous = checkpoint;
    }
    return previous;
  }

  async poll(subscription) {
    const previous = await this.verifyHistory(subscription);
    const observations = await this.source.queryAuthorized({ ...subscription, after: previous?.covered_to ?? null, limit: this.batch_size });
    if (!observations.length) return { action: "skip", reason: "unchanged", position: previous?.covered_to ?? null };
    const batch_digest = canonicalBatchDigest(observations);
    const covered_from = observations[0].position;
    const covered_to = observations.at(-1).position;
    const delivery_id = stableDeliveryId({ ...subscription, covered_from, covered_to, batch_digest });
    const capability = Object.freeze({ kind: "observation", can_grant_turn: false, scopes: Object.freeze([]) });
    const outcome = await this.sink.deliver({ delivery_id, observations: structuredClone(observations), capability });
    if (outcome?.claim_turn || outcome?.grant_authority || outcome?.scopes?.length) throw new Error("OBSERVATION_AUTHORITY_REFUSED"); /* OBSERVATION_NO_TURN_AUTHORITY */
    const checkpoint = {
      checkpoint_id: randomUUID(), ...subscription, covered_from, covered_to, event_count: observations.length,
      batch_digest, prior_checkpoint_digest: previous?.checkpoint_digest ?? null, delivery_id,
    };
    checkpoint.checkpoint_digest = checkpointDigest(checkpoint);
    return { action: "delivered", checkpoint: await this.store.append(checkpoint), sink: outcome ?? null };
  }
}

export const observationInternals = Object.freeze({ sha256 });
