import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const TYPES = new Set(["message", "handoff", "reply", "completion", "artifact", "decision", "task", "acknowledgment"]);
const KEYS = new Set(["schema_version", "id", "thread", "from", "type", "occurred_at", "in_reply_to", "next", "content_sha256", "artifacts"]);

function scalar(raw) {
  const value = raw.trim();
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(",").map((part) => scalar(part)) : [];
  }
  return value.replace(/^("|')|("|')$/g, "");
}

export function parseEvent(source, file = "event") {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new Error(`${file}: missing opening frontmatter delimiter`);
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${file}: missing closing frontmatter delimiter`);
  const meta = {};
  for (const [index, line] of normalized.slice(4, end).split("\n").entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon < 1) throw new Error(`${file}: invalid frontmatter line ${index + 2}`);
    const key = line.slice(0, colon).trim();
    if (Object.hasOwn(meta, key)) throw new Error(`${file}: duplicate field ${key}`);
    meta[key] = scalar(line.slice(colon + 1));
  }
  const body = normalized.slice(end + 5).trimEnd() + "\n";
  return { meta, body };
}

export function hashBody(body) {
  return createHash("sha256").update(body.replace(/\r\n/g, "\n").trimEnd() + "\n", "utf8").digest("hex");
}

async function readActors(root) {
  const actorDir = path.join(root, "actors");
  const actors = new Map();
  for (const name of await readdir(actorDir)) {
    if (!name.endsWith(".yaml")) continue;
    const text = await readFile(path.join(actorDir, name), "utf8");
    const slug = text.match(/^slug:\s*([^\s]+)\s*$/m)?.[1];
    const eventDirectory = text.match(/^event_directory:\s*([^\s]+)\s*$/m)?.[1];
    const artifactPrefix = text.match(/^artifact_prefix:\s*([^\s]+)\s*$/m)?.[1];
    if (!slug || !eventDirectory || !artifactPrefix) throw new Error(`actors/${name}: incomplete actor record`);
    if (actors.has(slug)) throw new Error(`actors/${name}: duplicate actor slug ${slug}`);
    actors.set(slug, { slug, eventDirectory, artifactPrefix });
  }
  return actors;
}

function validateShape(event, relative, errors) {
  const m = event.meta;
  for (const key of ["schema_version", "id", "thread", "from", "type", "occurred_at", "in_reply_to", "next", "content_sha256"]) {
    if (!Object.hasOwn(m, key)) errors.push(`${relative}: missing required field ${key}`);
  }
  for (const key of Object.keys(m)) if (!KEYS.has(key)) errors.push(`${relative}: unknown field ${key}`);
  if (m.schema_version !== 0) errors.push(`${relative}: schema_version must be 0`);
  if (!UUID_V7.test(m.id ?? "")) errors.push(`${relative}: id must be a lowercase UUIDv7`);
  if (!SLUG.test(m.thread ?? "")) errors.push(`${relative}: invalid thread slug`);
  if (!SLUG.test(m.from ?? "")) errors.push(`${relative}: invalid from actor`);
  if (!TYPES.has(m.type)) errors.push(`${relative}: unknown event type ${m.type}`);
  if (!Number.isFinite(Date.parse(m.occurred_at))) errors.push(`${relative}: occurred_at must be an ISO date-time`);
  if (m.in_reply_to !== null && !UUID_V7.test(m.in_reply_to ?? "")) errors.push(`${relative}: invalid in_reply_to`);
  if (m.next !== null && !SLUG.test(m.next ?? "")) errors.push(`${relative}: invalid next actor`);
  if (!SHA256.test(m.content_sha256 ?? "")) errors.push(`${relative}: invalid content_sha256`);
  if (m.artifacts !== undefined && (!Array.isArray(m.artifacts) || m.artifacts.some((item) => typeof item !== "string"))) errors.push(`${relative}: artifacts must be an array of strings`);
}

export async function verifyLog(root, options = {}) {
  const errors = [];
  const actors = await readActors(root);
  const events = [];
  for (const actor of actors.values()) {
    const directory = path.join(root, actor.eventDirectory);
    let names = [];
    try { names = await readdir(directory); } catch { errors.push(`${actor.eventDirectory}: missing actor event directory`); continue; }
    for (const name of names.filter((item) => item.endsWith(".md"))) {
      const absolute = path.join(directory, name);
      const relative = path.relative(root, absolute);
      try {
        const parsed = parseEvent(await readFile(absolute, "utf8"), relative);
        validateShape(parsed, relative, errors);
        const compact = String(parsed.meta.occurred_at ?? "").replace(/[-:]/g, "").replace(".000", "");
        const expectedPrefix = compact.replace("Z", "Z_");
        if (!name.startsWith(expectedPrefix)) errors.push(`${relative}: filename timestamp does not match occurred_at`);
        if (!name.endsWith(`_${parsed.meta.id}.md`)) errors.push(`${relative}: filename UUID does not match event id`);
        if (parsed.meta.from !== actor.slug) errors.push(`${relative}: actor-directory ownership violation`);
        if (hashBody(parsed.body) !== parsed.meta.content_sha256) errors.push(`${relative}: content hash mismatch`);
        events.push({ ...parsed, relative });
      } catch (error) { errors.push(error.message); }
    }
  }

  const byId = new Map();
  for (const event of events) {
    if (byId.has(event.meta.id)) errors.push(`${event.relative}: duplicate event id ${event.meta.id}`);
    else byId.set(event.meta.id, event);
    if (!actors.has(event.meta.next) && event.meta.next !== null) errors.push(`${event.relative}: unknown next actor ${event.meta.next}`);
  }

  const replies = new Map();
  for (const event of events) {
    const parentId = event.meta.in_reply_to;
    if (parentId === null) continue;
    const parent = byId.get(parentId);
    if (!parent) { errors.push(`${event.relative}: unknown reply target ${parentId}`); continue; }
    if (parent.meta.thread !== event.meta.thread) errors.push(`${event.relative}: reply crosses threads`);
    if (parent.meta.next !== event.meta.from) errors.push(`${event.relative}: strict-relay violation; expected ${parent.meta.next}`);
    replies.set(parentId, (replies.get(parentId) ?? 0) + 1);
  }
  for (const [parentId, count] of replies) if (count > 1) errors.push(`${byId.get(parentId)?.relative}: strict-relay branch has ${count} replies`);

  for (const event of events) {
    const seen = new Set();
    let cursor = event;
    while (cursor?.meta.in_reply_to) {
      if (seen.has(cursor.meta.id)) { errors.push(`${event.relative}: reply cycle detected`); break; }
      seen.add(cursor.meta.id);
      cursor = byId.get(cursor.meta.in_reply_to);
    }
  }

  const rootsByThread = new Map();
  for (const event of events.filter((item) => item.meta.in_reply_to === null)) rootsByThread.set(event.meta.thread, (rootsByThread.get(event.meta.thread) ?? 0) + 1);
  for (const [thread, count] of rootsByThread) if (count > 1) errors.push(`thread ${thread}: expected one root event, found ${count}`);

  for (const event of events) {
    for (const reference of event.meta.artifacts ?? []) {
      const match = reference.match(/^([^#]+)#sha256=([0-9a-f]{64})$/);
      if (!match) { errors.push(`${event.relative}: invalid artifact reference ${reference}`); continue; }
      const artifactPath = path.resolve(root, match[1]);
      const authorPrefix = path.resolve(root, actors.get(event.meta.from)?.artifactPrefix ?? "");
      if (!artifactPath.startsWith(authorPrefix + path.sep)) { errors.push(`${event.relative}: artifact-prefix ownership violation for ${match[1]}`); continue; }
      try {
        if (!(await stat(artifactPath)).isFile()) throw new Error("not a file");
        const digest = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
        if (digest !== match[2]) errors.push(`${event.relative}: artifact hash mismatch for ${match[1]}`);
      } catch { errors.push(`${event.relative}: missing artifact ${match[1]}`); }
    }
  }

  const result = { ok: errors.length === 0, errors, events: events.length, actors: actors.size, threads: new Set(events.map((event) => event.meta.thread)).size };
  if (!result.ok && options.throwOnError) throw new Error(errors.join("\n"));
  return result;
}
