import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectCredential } from "./credential-boundary.mjs";
import { discoverEventFiles, hashAppendIntent, hashBody, hashThreadConfig, parseEvent, parseRecord, verifyLog } from "./verify-log.mjs";

function uuidv7(now = Date.now()) {
  const bytes = randomBytes(16);
  let value = BigInt(now);
  for (let index = 5; index >= 0; index -= 1) { bytes[index] = Number(value & 255n); value >>= 8n; }
  bytes[6] = 0x70 | (bytes[6] & 0x0f);
  bytes[8] = 0x80 | (bytes[8] & 0x3f);
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function compact(iso) { return iso.replace(/[-:]/g, "").replace(".000", ""); }
function line(key, value) {
  const rendered = value === null ? "null"
    : Array.isArray(value) && value.every((item) => typeof item === "string") ? `[${value.join(", ")}]`
      : Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : value;
  return `${key}: ${rendered}`;
}

function occurredAtForId(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
    const error = new Error("APPEND_ID_INVALID: retry identity must be a lowercase UUIDv7");
    error.code = "APPEND_ID_INVALID";
    throw error;
  }
  const milliseconds = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16);
  return new Date(milliseconds).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function appendError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  return error;
}

async function readThreadDeclaration(cwd, thread) {
  try {
    const file = path.join(cwd, "threads", `${thread}.yaml`);
    return parseRecord(await readFile(file, "utf8"), path.relative(cwd, file));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function validateAppendInputs({ body, artifacts = [], envelope = null, cwd = process.cwd() }) {
  const bodyFinding = detectCredential(body);
  if (bodyFinding.hit) {
    const error = new Error("CREDENTIAL_INPUT_REFUSED: event body refused");
    error.code = "CREDENTIAL_INPUT_REFUSED";
    throw error;
  }
  for (const reference of artifacts.filter(Boolean)) {
    const artifactPath = reference.split("#", 1)[0];
    const artifact = await readFile(path.resolve(cwd, artifactPath), "utf8");
    if (detectCredential(artifact).hit) {
      const error = new Error("CREDENTIAL_INPUT_REFUSED: artifact refused");
      error.code = "CREDENTIAL_INPUT_REFUSED";
      throw error;
    }
  }
  if (envelope && detectCredential(JSON.stringify(envelope)).hit) throw appendError("CREDENTIAL_INPUT_REFUSED", "event envelope refused");
}

async function findEventById(cwd, id) {
  for (const file of await discoverEventFiles(path.join(cwd, "events"))) {
    const relative = path.relative(cwd, file);
    const event = parseEvent(await readFile(file, "utf8"), relative);
    if (event.meta.id === id) return { relative, event };
  }
  return null;
}

function resultFor(relative, id, reused) { return { ok: true, errors: [], relative, event_id: id, reused }; }

export async function appendEvent(input, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  for (const required of ["actor", "thread", "type", "body"]) if (!input[required]) throw new Error(`append requires --${required}`);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw appendError("EVENT_VERSION_REFUSED", "live append accepts schema_version 1 only"); /* V1_WRITER_CUTOVER */
  const artifacts = input.artifacts?.filter(Boolean) ?? [];
  const boundedContext = input.boundedContext;
  const completionCriteria = input.completionCriteria;
  const criteriaResults = input.criteriaResults;
  if (input.type === "handoff" && (!Array.isArray(boundedContext) || !Array.isArray(completionCriteria))) {
    throw appendError("V1_HANDOFF_ENVELOPE_REQUIRED", "handoff requires boundedContext and completionCriteria");
  }
  await validateAppendInputs({ body: input.body, artifacts, envelope: { boundedContext, completionCriteria, criteriaResults }, cwd });

  const now = options.now ?? Date.now();
  const id = options.id ?? uuidv7(now);
  const occurredAt = occurredAtForId(id);
  const contentSha256 = hashBody(input.body);
  const intentSha256 = hashAppendIntent({
    actor: input.actor,
    thread: input.thread,
    type: input.type,
    reply: input.reply ?? null,
    next: input.next ?? null,
    content_sha256: contentSha256,
    artifacts,
    bounded_context: boundedContext ?? null,
    completion_criteria: completionCriteria ?? null,
    criteria_results: criteriaResults ?? null,
  });

  await verifyLog(cwd, { throwOnError: true });
  const existing = await findEventById(cwd, id);
  if (existing) {
    if (existing.event.meta.schema_version === 1 && existing.event.meta.intent_sha256 === intentSha256) return resultFor(existing.relative, id, true); /* V1_RETRY_INTENT_MATCH */
    throw appendError("APPEND_INTENT_COLLISION", `event identity ${id} already binds a different canonical intent`); /* V1_RETRY_COLLISION */
  }

  const meta = [
    line("schema_version", 1), line("id", id), line("thread", input.thread), line("from", input.actor),
    line("type", input.type), line("occurred_at", occurredAt), line("in_reply_to", input.reply ?? null),
    line("next", input.next ?? null), line("content_sha256", contentSha256), line("intent_sha256", intentSha256),
  ];
  if (!input.reply) {
    const declaration = await readThreadDeclaration(cwd, input.thread);
    if (declaration) meta.push(line("thread_config_sha256", hashThreadConfig(declaration)));
  }
  if (artifacts.length) meta.push(line("artifacts", artifacts));
  if (boundedContext !== undefined) meta.push(line("bounded_context", boundedContext));
  if (completionCriteria !== undefined) meta.push(line("completion_criteria", completionCriteria));
  if (criteriaResults !== undefined) meta.push(line("criteria_results", criteriaResults));

  const relative = path.join("events", input.actor, `${compact(occurredAt)}_${id}.md`);
  const file = path.join(cwd, relative);
  const source = `---\n${meta.join("\n")}\n---\n${input.body.trimEnd()}\n`;
  const candidate = await verifyLog(cwd, { candidateEvent: { relative, source } });
  if (!candidate.ok) return { ok: false, errors: candidate.errors, relative };

  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, source, { flag: "wx" }); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    await verifyLog(cwd, { throwOnError: true });
    const raced = await findEventById(cwd, id);
    if (raced?.event.meta.schema_version === 1 && raced.event.meta.intent_sha256 === intentSha256) return resultFor(raced.relative, id, true);
    throw appendError("APPEND_INTENT_COLLISION", `event identity ${id} was occupied by a different canonical intent`);
  }
  const written = await verifyLog(cwd);
  if (!written.ok) {
    await rm(file, { force: true });
    return { ok: false, errors: written.errors, relative };
  }
  return resultFor(relative, id, false);
}

export function resolveWorkInbox({ actor, entries }) { /* PORT_WATCH_SHARED_ELIGIBILITY */
  if (!actor) throw new Error("inbox requires --actor");
  if (!Array.isArray(entries)) throw new TypeError("inbox entries must be an array");
  const answered = new Set(entries.map(({ event }) => event.meta.in_reply_to).filter(Boolean));
  return entries
    .filter(({ event }) => event.meta.next === actor && !answered.has(event.meta.id))
    .map(({ file, event }) => Object.freeze({
      relative: file,
      event_id: event.meta.id,
      thread: event.meta.thread,
      from: event.meta.from,
      type: event.meta.type,
      occurred_at: event.meta.occurred_at,
      in_reply_to: event.meta.in_reply_to,
      next: event.meta.next,
      content_sha256: event.meta.content_sha256,
      artifacts: Object.freeze([...(event.meta.artifacts ?? [])]),
      body: event.body,
    }));
}

export async function listInboxEntries({ actor, cwd = process.cwd() }) {
  if (!actor) throw new Error("inbox requires --actor");
  await verifyLog(cwd, { throwOnError: true });
  const files = await discoverEventFiles(path.join(cwd, "events"));
  const entries = await Promise.all(files.sort().map(async (file) => {
    const relative = path.relative(cwd, file);
    return { file: relative, event: parseEvent(await readFile(file, "utf8"), relative) };
  }));
  return resolveWorkInbox({ actor, entries });
}

export async function listInbox({ actor, cwd = process.cwd() }) {
  return (await listInboxEntries({ actor, cwd })).map(({ relative }) => relative);
}
