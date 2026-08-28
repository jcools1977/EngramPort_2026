import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectCredential } from "./credential-boundary.mjs";
import { discoverEventFiles, hashBody, hashThreadConfig, parseEvent, parseRecord, verifyLog } from "./verify-log.mjs";

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
function line(key, value) { return `${key}: ${value === null ? "null" : Array.isArray(value) ? `[${value.join(", ")}]` : value}`; }

async function readThreadDeclaration(cwd, thread) {
  try {
    const file = path.join(cwd, "threads", `${thread}.yaml`);
    return parseRecord(await readFile(file, "utf8"), path.relative(cwd, file));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function validateAppendInputs({ body, artifacts = [], cwd = process.cwd() }) {
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
}

export async function appendEvent(input, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  for (const required of ["actor", "thread", "type", "body"]) if (!input[required]) throw new Error(`append requires --${required}`);
  const artifacts = input.artifacts?.filter(Boolean) ?? [];
  await validateAppendInputs({ body: input.body, artifacts, cwd });

  const now = options.now ?? Date.now();
  const occurredAt = new Date(now).toISOString().replace(/\.\d{3}Z$/, "Z");
  const id = options.id ?? uuidv7(now);
  const meta = [
    line("schema_version", 0), line("id", id), line("thread", input.thread), line("from", input.actor),
    line("type", input.type), line("occurred_at", occurredAt), line("in_reply_to", input.reply ?? null),
    line("next", input.next ?? null), line("content_sha256", hashBody(input.body)),
  ];
  if (!input.reply) {
    const declaration = await readThreadDeclaration(cwd, input.thread);
    if (declaration) meta.push(line("thread_config_sha256", hashThreadConfig(declaration)));
  }
  if (artifacts.length) meta.push(line("artifacts", artifacts));

  const relative = path.join("events", input.actor, `${compact(occurredAt)}_${id}.md`);
  const file = path.join(cwd, relative);
  const source = `---\n${meta.join("\n")}\n---\n${input.body.trimEnd()}\n`;
  const candidate = await verifyLog(cwd, { candidateEvent: { relative, source } });
  if (!candidate.ok) return { ok: false, errors: candidate.errors, relative };

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, source, { flag: "wx" });
  const written = await verifyLog(cwd);
  if (!written.ok) {
    await rm(file, { force: true });
    return { ok: false, errors: written.errors, relative };
  }
  return { ok: true, errors: [], relative };
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
