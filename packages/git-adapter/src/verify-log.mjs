import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const CRITERION_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const EVENT_TYPES = Object.freeze(["message", "handoff", "reply", "completion", "artifact", "decision", "task", "acknowledgment"]);
const TYPES = new Set(EVENT_TYPES);
const BASE_KEYS = ["schema_version", "id", "thread", "from", "type", "occurred_at", "in_reply_to", "next", "content_sha256", "thread_config_sha256", "artifacts"];
const V0_KEYS = new Set(BASE_KEYS);
const V1_KEYS = new Set([...BASE_KEYS, "intent_sha256", "bounded_context", "completion_criteria", "criteria_results"]);
const THREAD_MODES = new Set(["strict_relay", "free_form", "coordinator_led"]);
const EVIDENCE_CLASSES = new Set(["event", "artifact"]);
const MAX_CONTEXT_REFS = 32;
const MAX_CONTEXT_BYTES = 8192;
const MAX_CRITERIA = 32;
const MAX_CRITERIA_BYTES = 16384;

export function isMarkdownEventFile(name) { /* EVENT_EXTENSION_CASE_INSENSITIVE */
  return path.extname(name).toLowerCase() === ".md";
}

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
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    try { return JSON.parse(value); }
    catch { /* Historical v0 arrays use the compact YAML form rather than JSON. */ }
  }
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

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashAppendIntent({ actor, thread, type, reply = null, next = null, content_sha256, artifacts = [], bounded_context = null, completion_criteria = null, criteria_results = null }) {
  const intent = {
    actor, artifacts, bounded_context, completion_criteria, content_sha256,
    criteria_results, next, reply, thread, type,
  };
  return createHash("sha256").update(`engramport-append-intent-v1\n${canonicalJson(intent)}\n`, "utf8").digest("hex");
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

function inSurface(candidate, prefix) {
  return candidate === prefix || candidate.startsWith(`${prefix}/`);
}

export function normalizeActorSurfaceIdentity(value) { /* ACTOR_PREFIX_NORMALIZATION */
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

async function actorSurfaceIdentity(root, relative, source) {
  if (path.isAbsolute(relative)) throw new Error(`${source}: actor-owned prefix must be repository-relative`);
  const rootReal = await realpath(root);
  const absolute = path.resolve(root, relative);
  let surfaceReal;
  try { surfaceReal = await realpath(absolute); }
  catch {
    const portable = normalizeActorSurfaceIdentity(relative);
    surfaceReal = await realpath(path.resolve(root, portable));
  }
  const repositoryRelative = path.relative(rootReal, surfaceReal);
  if (repositoryRelative === ".." || repositoryRelative.startsWith(`..${path.sep}`) || path.isAbsolute(repositoryRelative)) {
    throw new Error(`${source}: actor-owned prefix escapes repository root`);
  }
  return normalizeActorSurfaceIdentity(repositoryRelative.split(path.sep).join("/"));
}

function assertActorSurfacesDisjoint(actors, field, label) {
  const records = [...actors.values()];
  for (let index = 0; index < records.length; index += 1) {
    for (let other = index + 1; other < records.length; other += 1) {
      if (inSurface(records[index][field], records[other][field]) || inSurface(records[other][field], records[index][field])) {
        throw new Error(`${label} must be disjoint after realpath, case-folding, and Unicode normalization: ${records[index].slug} overlaps ${records[other].slug}`);
      }
    }
  }
}

export async function readActors(root, actorDir = path.join(root, "actors"), { strictSlugs = true } = {}) {
  const actors = new Map();
  for (const name of await readdir(actorDir)) {
    if (!name.endsWith(".yaml")) continue;
    const text = await readFile(path.join(actorDir, name), "utf8");
    const slug = text.match(/^slug:\s*([^\s]+)\s*$/m)?.[1];
    const eventDirectory = text.match(/^event_directory:\s*([^\s]+)\s*$/m)?.[1];
    const artifactPrefix = text.match(/^artifact_prefix:\s*([^\s]+)\s*$/m)?.[1];
    if (!slug || !eventDirectory || !artifactPrefix) throw new Error(`actors/${name}: incomplete actor record`);
    if (name !== `${slug}.yaml`) throw new Error(`actors/${name}: filename must match declared slug ${slug}`); /* ACTOR_SLUG_FILENAME_BINDING */
    if (strictSlugs && !SLUG.test(slug)) throw new Error(`actors/${name}: invalid actor slug ${slug}`);
    if (eventDirectory !== `events/${slug}`) throw new Error(`actors/${name}: event_directory must match the append path for ${slug}`);
    if (artifactPrefix !== `artifacts/${slug}`) throw new Error(`actors/${name}: artifact_prefix must remain actor-specific`);
    if (actors.has(slug)) throw new Error(`actors/${name}: duplicate actor slug ${slug}`);
    const eventSurfaceIdentity = await actorSurfaceIdentity(root, eventDirectory, `actors/${name}`);
    const artifactSurfaceIdentity = await actorSurfaceIdentity(root, artifactPrefix, `actors/${name}`);
    actors.set(slug, { slug, eventDirectory, artifactPrefix, eventSurfaceIdentity, artifactSurfaceIdentity });
  }
  assertActorSurfacesDisjoint(actors, "eventSurfaceIdentity", "actor event directories");
  assertActorSurfacesDisjoint(actors, "artifactSurfaceIdentity", "actor artifact prefixes");
  return actors;
}

export async function discoverEventFiles(directory) {
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
    else if (entry.isFile() && isMarkdownEventFile(entry.name)) files.push(absolute);
  }
  return files;
}

function encodedBytes(value) { return Buffer.byteLength(canonicalJson(value), "utf8"); }

function validateReference(reference, label, errors) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    errors.push(`${label}: reference must be an object`);
    return;
  }
  const keys = Object.keys(reference);
  if (reference.type === "event") {
    if (keys.length !== 2 || !keys.includes("event_id")) errors.push(`${label}: event reference fields must be type and event_id`);
    if (!UUID_V7.test(reference.event_id ?? "")) errors.push(`${label}: invalid event_id`);
  } else if (reference.type === "artifact") {
    if (keys.length !== 2 || !keys.includes("ref")) errors.push(`${label}: artifact reference fields must be type and ref`);
    if (typeof reference.ref !== "string" || !/^([^#]+)#sha256=([0-9a-f]{64})$/.test(reference.ref)) errors.push(`${label}: invalid artifact ref`);
  } else {
    errors.push(`${label}: reference type must be event or artifact`);
  }
}

function validateV1Envelope(event, relative, errors) {
  const m = event.meta;
  if (!SHA256.test(m.intent_sha256 ?? "")) errors.push(`${relative}: invalid intent_sha256`);

  if (m.type === "handoff") {
    if (!Array.isArray(m.bounded_context) || m.bounded_context.length < 1 || m.bounded_context.length > MAX_CONTEXT_REFS) {
      errors.push(`${relative}: bounded_context must contain 1-${MAX_CONTEXT_REFS} references`);
    } else {
      if (encodedBytes(m.bounded_context) > MAX_CONTEXT_BYTES) errors.push(`${relative}: bounded_context exceeds ${MAX_CONTEXT_BYTES} encoded bytes`);
      m.bounded_context.forEach((reference, index) => validateReference(reference, `${relative}: bounded_context[${index}]`, errors));
    }
    if (!Array.isArray(m.completion_criteria) || m.completion_criteria.length < 1 || m.completion_criteria.length > MAX_CRITERIA) {
      errors.push(`${relative}: completion_criteria must contain 1-${MAX_CRITERIA} criteria`);
    } else {
      if (encodedBytes(m.completion_criteria) > MAX_CRITERIA_BYTES) errors.push(`${relative}: completion_criteria exceeds ${MAX_CRITERIA_BYTES} encoded bytes`);
      const ids = new Set();
      m.completion_criteria.forEach((criterion, index) => {
        const label = `${relative}: completion_criteria[${index}]`;
        if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) { errors.push(`${label}: criterion must be an object`); return; }
        if (Object.keys(criterion).sort().join(",") !== "evidence_classes,id,statement") errors.push(`${label}: fields must be id, statement, and evidence_classes`);
        if (!CRITERION_ID.test(criterion.id ?? "")) errors.push(`${label}: invalid criterion id`);
        else if (ids.has(criterion.id)) errors.push(`${relative}: duplicate criterion id ${criterion.id}`);
        else ids.add(criterion.id);
        if (typeof criterion.statement !== "string" || !criterion.statement.trim() || Buffer.byteLength(criterion.statement, "utf8") > 1024) errors.push(`${label}: statement must contain 1-1024 bytes`);
        if (!Array.isArray(criterion.evidence_classes) || criterion.evidence_classes.length < 1 || criterion.evidence_classes.some((value) => !EVIDENCE_CLASSES.has(value)) || new Set(criterion.evidence_classes).size !== criterion.evidence_classes.length) {
          errors.push(`${label}: evidence_classes must be a unique non-empty subset of event and artifact`);
        }
      });
    }
    if (m.criteria_results !== undefined) errors.push(`${relative}: criteria_results is permitted only on completion events`);
  } else if (m.type === "completion") {
    if (m.bounded_context !== undefined || m.completion_criteria !== undefined) errors.push(`${relative}: bounded_context and completion_criteria are permitted only on handoff events`);
    if (m.criteria_results !== undefined) {
      if (!Array.isArray(m.criteria_results) || m.criteria_results.length > MAX_CRITERIA) errors.push(`${relative}: criteria_results must contain at most ${MAX_CRITERIA} results`);
      else m.criteria_results.forEach((result, index) => {
        const label = `${relative}: criteria_results[${index}]`;
        if (!result || typeof result !== "object" || Array.isArray(result)) { errors.push(`${label}: result must be an object`); return; }
        if (Object.keys(result).sort().join(",") !== "criterion_id,evidence,status") errors.push(`${label}: fields must be criterion_id, status, and evidence`);
        if (!CRITERION_ID.test(result.criterion_id ?? "")) errors.push(`${label}: invalid criterion_id`);
        if (result.status !== "satisfied") errors.push(`${label}: completion status must be satisfied`);
        if (!Array.isArray(result.evidence) || result.evidence.length < 1 || result.evidence.length > MAX_CONTEXT_REFS) errors.push(`${label}: evidence must contain 1-${MAX_CONTEXT_REFS} references`);
        else result.evidence.forEach((reference, evidenceIndex) => validateReference(reference, `${label}.evidence[${evidenceIndex}]`, errors));
      });
    }
  } else if (m.bounded_context !== undefined || m.completion_criteria !== undefined || m.criteria_results !== undefined) {
    errors.push(`${relative}: structured handoff/completion fields are not permitted on ${m.type} events`);
  }
}

function validateShape(event, relative, errors) {
  const m = event.meta;
  for (const key of ["schema_version", "id", "thread", "from", "type", "occurred_at", "in_reply_to", "next", "content_sha256"]) {
    if (!Object.hasOwn(m, key)) errors.push(`${relative}: missing required field ${key}`);
  }
  const keys = m.schema_version === 0 ? V0_KEYS : m.schema_version === 1 ? V1_KEYS : new Set(BASE_KEYS);
  for (const key of Object.keys(m)) if (!keys.has(key)) errors.push(`${relative}: unknown field ${key}`);
  if (m.schema_version !== 0 && m.schema_version !== 1) errors.push(`${relative}: schema_version must be 0 or 1`);
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
  if (m.schema_version === 1) validateV1Envelope(event, relative, errors);
}

export async function verifyLog(root, options = {}) {
  const errors = [];
  const actors = await readActors(root);
  const eventDirectoryActors = new Map();
  for (const actor of actors.values()) {
    const directory = path.resolve(root, actor.eventDirectory);
    try {
      if (!(await stat(directory)).isDirectory()) throw new Error("not a directory");
    } catch {
      errors.push(`${actor.eventDirectory}: missing actor event directory`);
    }
    eventDirectoryActors.set(directory, actor);
  }
  const discoveredEventFiles = await discoverEventFiles(path.resolve(root, "events")); /* EVENT_DIRECTORY_COMPLETENESS */
  const validationPlan = [];
  // Discovery is the sole source for validation: every Markdown file is planned exactly once or fails by path.
  for (const absolute of discoveredEventFiles) {
    const relative = path.relative(root, absolute);
    const actor = eventDirectoryActors.get(path.dirname(absolute));
    if (!actor) errors.push(`${relative}: event file is not directly enumerated by a registered actor event_directory`);
    else validationPlan.push({ absolute, relative, actor });
  }
  if (options.candidateEvent) {
    const relative = options.candidateEvent.relative;
    const absolute = path.resolve(root, relative);
    const actor = eventDirectoryActors.get(path.dirname(absolute));
    if (!absolute.startsWith(path.resolve(root) + path.sep)) errors.push(`${relative}: candidate event escapes repository root`);
    else if (discoveredEventFiles.includes(absolute)) errors.push(`${relative}: candidate event path already exists`);
    else if (!actor) errors.push(`${relative}: event file is not directly enumerated by a registered actor event_directory`);
    else validationPlan.push({ absolute, relative, actor, source: options.candidateEvent.source });
  }
  const projectConfig = await readProjectConfig(root, errors);
  const threadConfigs = await readThreadConfigs(root, actors, errors);
  const events = [];
  for (const { absolute, relative, actor, source } of validationPlan) {
    const name = path.basename(absolute);
    try {
      const parsed = parseEvent(source ?? await readFile(absolute, "utf8"), relative);
      validateShape(parsed, relative, errors);
      const compact = String(parsed.meta.occurred_at ?? "").replace(/[-:]/g, "").replace(".000", "");
      const expectedPrefix = compact.replace("Z", "Z_");
      if (!name.startsWith(expectedPrefix)) errors.push(`${relative}: filename timestamp does not match occurred_at`);
      if (!name.toLowerCase().endsWith(`_${parsed.meta.id}.md`)) errors.push(`${relative}: filename UUID does not match event id`);
      if (parsed.meta.from !== actor.slug) errors.push(`${relative}: actor-directory ownership violation`);
      if (hashBody(parsed.body) !== parsed.meta.content_sha256) errors.push(`${relative}: content hash mismatch`);
      if (parsed.meta.schema_version === 1) {
        const expectedIntent = hashAppendIntent({
          actor: parsed.meta.from,
          thread: parsed.meta.thread,
          type: parsed.meta.type,
          reply: parsed.meta.in_reply_to,
          next: parsed.meta.next,
          content_sha256: parsed.meta.content_sha256,
          artifacts: parsed.meta.artifacts ?? [],
          bounded_context: parsed.meta.bounded_context ?? null,
          completion_criteria: parsed.meta.completion_criteria ?? null,
          criteria_results: parsed.meta.criteria_results ?? null,
        });
        if (parsed.meta.intent_sha256 !== expectedIntent) errors.push(`${relative}: append intent hash mismatch`);
      }
      events.push({ ...parsed, relative });
    } catch (error) { errors.push(error.message); }
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

  const artifactReferences = new Map();
  for (const actor of actors.values()) artifactReferences.set(path.resolve(root, actor.artifactPrefix), actor.slug);
  const resolveBoundReference = async (reference, event, label) => {
    if (reference?.type === "event") {
      if (!byId.has(reference.event_id)) errors.push(`${label}: unknown event reference ${reference.event_id}`);
      else if (reference.event_id === event.meta.id) errors.push(`${label}: an event cannot cite itself as evidence`);
      return;
    }
    if (reference?.type !== "artifact" || typeof reference.ref !== "string") return;
    const match = reference.ref.match(/^([^#]+)#sha256=([0-9a-f]{64})$/);
    if (!match) return;
    const artifactPath = path.resolve(root, match[1]);
    const owner = [...artifactReferences.keys()].find((prefix) => artifactPath.startsWith(`${prefix}${path.sep}`));
    if (!owner) { errors.push(`${label}: artifact reference is outside registered actor prefixes`); return; }
    try {
      if (!(await stat(artifactPath)).isFile()) throw new Error("not a file");
      const digest = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
      if (digest !== match[2]) errors.push(`${label}: artifact hash mismatch for ${match[1]}`);
    } catch { errors.push(`${label}: missing artifact ${match[1]}`); }
  };

  for (const event of events.filter((item) => item.meta.schema_version === 1)) {
    for (const [index, reference] of (event.meta.bounded_context ?? []).entries()) {
      await resolveBoundReference(reference, event, `${event.relative}: bounded_context[${index}]`);
    }
    if (event.meta.type !== "completion") continue;
    const parent = byId.get(event.meta.in_reply_to);
    if (!parent || parent.meta.type !== "handoff") {
      errors.push(`${event.relative}: completion must reply to a handoff`);
      continue;
    }
    if (parent.meta.schema_version === 0) {
      if (event.meta.criteria_results !== undefined) errors.push(`${event.relative}: criteria_results cannot be supplied for a version-0 handoff`);
      continue;
    }
    const criteria = new Map((parent.meta.completion_criteria ?? []).map((criterion) => [criterion.id, criterion]));
    const results = event.meta.criteria_results;
    if (!Array.isArray(results)) {
      errors.push(`${event.relative}: criteria_results is required for a version-1 handoff completion`);
      continue;
    }
    const resultIds = results.map((result) => result?.criterion_id);
    if (new Set(resultIds).size !== resultIds.length) errors.push(`${event.relative}: duplicate criterion result id`);
    const missing = [...criteria.keys()].filter((id) => !resultIds.includes(id));
    const unknown = resultIds.filter((id) => !criteria.has(id));
    if (missing.length) errors.push(`${event.relative}: completion missing criterion ids ${missing.join(", ")}`); /* V1_CRITERIA_EXACT_COVERAGE */
    if (unknown.length) errors.push(`${event.relative}: completion has unknown criterion ids ${unknown.join(", ")}`);
    for (const [resultIndex, result] of results.entries()) {
      const criterion = criteria.get(result?.criterion_id);
      for (const [evidenceIndex, reference] of (result?.evidence ?? []).entries()) {
        if (criterion && !criterion.evidence_classes.includes(reference?.type)) errors.push(`${event.relative}: criterion ${criterion.id} does not permit ${reference?.type} evidence`);
        await resolveBoundReference(reference, event, `${event.relative}: criteria_results[${resultIndex}].evidence[${evidenceIndex}]`);
      }
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
