import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9._-]{0,127}$/;
export const EVENT_TYPES = Object.freeze(["message", "handoff", "reply", "completion", "artifact", "decision", "task", "acknowledgment"]);
const TYPES = new Set(EVENT_TYPES);
const KEYS = new Set(["schema_version", "id", "thread", "from", "type", "occurred_at", "in_reply_to", "next", "content_sha256", "thread_config_sha256", "artifacts"]);
const THREAD_MODES = new Set(["strict_relay", "free_form", "coordinator_led"]);

export function assertAcceptedEventTypes(types, surface = "event-type surface") {
  for (const type of types) if (!TYPES.has(type)) throw new Error(`${surface}: unknown event type ${type}`);
  return true;
}

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

export function hashThreadConfig(config) {
  return createHash("sha256")
    .update(JSON.stringify({ schema_version: 0, thread: config.thread, mode: config.mode, coordinator: config.coordinator ?? null }), "utf8")
    .digest("hex");
}

export function parseRecord(source, file) {
  const record = {};
  for (const [index, line] of source.replace(/\r\n/g, "\n").split("\n").entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon < 1) throw new Error(`${file}: invalid line ${index + 1}`);
    const key = line.slice(0, colon).trim();
    if (Object.hasOwn(record, key)) throw new Error(`${file}: duplicate field ${key}`);
    record[key] = scalar(line.slice(colon + 1));
  }
  return record;
}

async function readProjectConfig(root, errors) {
  try {
    const config = parseRecord(await readFile(path.join(root, "engramport.yaml"), "utf8"), "engramport.yaml");
    const legacyMode = config.mode;
    const defaultMode = config.default_thread_mode ?? legacyMode;
    if (!THREAD_MODES.has(legacyMode)) errors.push(`engramport.yaml: unknown project mode ${legacyMode}`);
    if (!THREAD_MODES.has(defaultMode)) errors.push(`engramport.yaml: unknown default_thread_mode ${defaultMode}`);
    return { legacyMode, defaultMode };
  } catch (error) {
    errors.push(error.message);
    return { legacyMode: null, defaultMode: null };
  }
}

async function readThreadConfigs(root, actors, errors) {
  const configs = new Map();
  const directory = path.join(root, "threads");
  let names = [];
  try { names = await readdir(directory); }
  catch (error) {
    if (error.code === "ENOENT") return configs;
    errors.push(`threads: ${error.message}`);
    return configs;
  }
  for (const name of names.filter((item) => item.endsWith(".yaml"))) {
    const relative = path.join("threads", name);
    try {
      const config = parseRecord(await readFile(path.join(directory, name), "utf8"), relative);
      const allowed = new Set(["schema_version", "thread", "mode", "coordinator"]);
      for (const key of Object.keys(config)) if (!allowed.has(key)) errors.push(`${relative}: unknown field ${key}`);
      if (config.schema_version !== 0) errors.push(`${relative}: schema_version must be 0`);
      if (!SLUG.test(config.thread ?? "")) errors.push(`${relative}: invalid thread slug`);
      if (name !== `${config.thread}.yaml`) errors.push(`${relative}: filename must match thread ${config.thread}`);
      if (!THREAD_MODES.has(config.mode)) errors.push(`${relative}: unknown thread mode ${config.mode}`);
      if (config.mode === "coordinator_led") {
        if (!config.coordinator) errors.push(`${relative}: coordinator_led mode requires a coordinator`);
        else if (!actors.has(config.coordinator)) errors.push(`${relative}: coordinator_led mode has unknown coordinator ${config.coordinator}`);
      } else if (config.coordinator !== null) {
        errors.push(`${relative}: ${config.mode} mode requires coordinator: null`);
      }
      if (configs.has(config.thread)) errors.push(`${relative}: duplicate thread declaration for ${config.thread}`);
      else configs.set(config.thread, { ...config, relative, digest: hashThreadConfig(config) });
    } catch (error) { errors.push(error.message); }
  }
  return configs;
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

async function discoverEventFiles(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await discoverEventFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}

async function findUnregisteredEventFiles(root, actors) {
  const registeredDirectories = [...actors.values()].map((actor) => path.resolve(root, actor.eventDirectory));
  const eventFiles = await discoverEventFiles(path.join(root, "events"));
  return eventFiles
    .filter((file) => !registeredDirectories.some((directory) => file.startsWith(`${directory}${path.sep}`)))
    .map((file) => path.relative(root, file));
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
  if (m.thread_config_sha256 !== undefined && !SHA256.test(m.thread_config_sha256)) errors.push(`${relative}: invalid thread_config_sha256`);
  if (m.artifacts !== undefined && (!Array.isArray(m.artifacts) || m.artifacts.some((item) => typeof item !== "string"))) errors.push(`${relative}: artifacts must be an array of strings`);
}

export async function verifyLog(root, options = {}) {
  const errors = [];
  const actors = await readActors(root);
  for (const relative of await findUnregisteredEventFiles(root, actors)) { /* EVENT_DIRECTORY_COMPLETENESS */
    errors.push(`${relative}: event file is outside every registered actor event_directory`);
  }
  const projectConfig = await readProjectConfig(root, errors);
  const threadConfigs = await readThreadConfigs(root, actors, errors);
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

  const eventsByThread = new Map();
  for (const event of events) {
    const list = eventsByThread.get(event.meta.thread) ?? [];
    list.push(event);
    eventsByThread.set(event.meta.thread, list);
  }

  const roots = new Map();
  for (const [thread, threadEvents] of eventsByThread) {
    const threadRoots = threadEvents.filter((event) => event.meta.in_reply_to === null);
    if (threadRoots.length > 1) errors.push(`thread ${thread}: mode ${threadConfigs.get(thread)?.mode ?? projectConfig.defaultMode} violation; thread already has a root`);
    if (threadRoots.length === 1) roots.set(thread, threadRoots[0]);
    const declaration = threadConfigs.get(thread);
    const root = threadRoots[0];
    if (declaration && root?.meta.thread_config_sha256 !== declaration.digest) {
      errors.push(`${declaration.relative}: mode immutability violation; declaration for non-empty thread ${thread} does not match its first-event binding`);
    }
    if (!declaration && root?.meta.thread_config_sha256 !== undefined) {
      errors.push(`${root.relative}: thread config binding has no declaration for ${thread}`);
    }
    for (const event of threadEvents) {
      if (event !== root && event.meta.thread_config_sha256 !== undefined) errors.push(`${event.relative}: thread_config_sha256 is permitted only on the first event`);
    }
  }

  const replies = new Map();
  for (const event of events) {
    const parentId = event.meta.in_reply_to;
    if (parentId === null) continue;
    const parent = byId.get(parentId);
    const declaration = threadConfigs.get(event.meta.thread);
    const mode = declaration?.mode ?? projectConfig.defaultMode;
    if (!parent) { errors.push(`${event.relative}: mode ${mode} violation; unknown reply target ${parentId}`); continue; }
    if (parent.meta.thread !== event.meta.thread) { errors.push(`${event.relative}: reply crosses threads`); continue; }
    if (!THREAD_MODES.has(mode)) {
      errors.push(`${event.relative}: unknown thread mode ${mode}`);
    } else if (mode === "strict_relay") {
      if (parent.meta.next !== event.meta.from) errors.push(`${event.relative}: mode strict_relay violation; expected next actor ${parent.meta.next}`);
      if (parent.meta.from === event.meta.from) errors.push(`${event.relative}: mode strict_relay violation; an actor may not reply to itself`);
    } else if (mode === "coordinator_led") {
      const coordinator = declaration?.coordinator;
      if (event.meta.from !== coordinator && parent.meta.from !== coordinator) {
        errors.push(`${event.relative}: mode coordinator_led violation; worker ${event.meta.from} must reply to coordinator ${coordinator}`);
      }
    }
    replies.set(parentId, (replies.get(parentId) ?? 0) + 1);
  }
  for (const [parentId, count] of replies) {
    const parent = byId.get(parentId);
    const mode = threadConfigs.get(parent?.meta.thread)?.mode ?? projectConfig.defaultMode;
    if (mode === "strict_relay" && count > 1) errors.push(`${parent?.relative}: mode strict_relay violation; parent has ${count} replies`);
  }

  for (const [thread, threadEvents] of eventsByThread) {
    const declaration = threadConfigs.get(thread);
    const mode = declaration?.mode ?? projectConfig.defaultMode;
    if (!THREAD_MODES.has(mode)) errors.push(`thread ${thread}: unknown thread mode ${mode}`);
    if (mode === "coordinator_led") {
      for (const event of threadEvents.filter((item) => item.meta.in_reply_to === null && item.meta.from !== declaration?.coordinator)) {
        errors.push(`${event.relative}: mode coordinator_led violation; root must be authored by coordinator ${declaration?.coordinator}`);
      }
    }
  }

  for (const event of events) {
    const seen = new Set();
    let cursor = event;
    while (cursor?.meta.in_reply_to) {
      if (seen.has(cursor.meta.id)) {
        const mode = threadConfigs.get(event.meta.thread)?.mode ?? projectConfig.defaultMode;
        errors.push(`${event.relative}: mode ${mode} violation; reply cycle detected`);
        break;
      }
      seen.add(cursor.meta.id);
      cursor = byId.get(cursor.meta.in_reply_to);
    }
  }

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

  const result = { ok: errors.length === 0, errors, events: events.length, actors: actors.size, threads: eventsByThread.size };
  if (!result.ok && options.throwOnError) throw new Error(errors.join("\n"));
  return result;
}
