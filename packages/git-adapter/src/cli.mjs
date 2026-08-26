import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashBody, hashThreadConfig, parseEvent, parseRecord, verifyLog } from "./verify-log.mjs";
import { verifyWelcome } from "./welcome-verify.mjs";
import { ACTION_PROFILE, PLAN_PROFILE, compileSetupFile } from "./workspace-setup.mjs";
import { executeDryRun } from "./workspace-dry-run.mjs";
import { detectCredential } from "./credential-boundary.mjs";

const ARGUMENT_PROFILES = new Map([
  ["welcome verify", new Set(["package"])],
  ["setup compile", new Set(["file"])],
  ["setup dry-run", new Set(["file", "temp-dir"])],
  ["verify", new Set()],
  ["thread declare", new Set(["thread", "mode", "coordinator"])],
  ["inbox", new Set(["actor"])],
  ["append", new Set(["actor", "thread", "type", "body", "reply", "next", "artifacts"])]
]);

function argumentRefused(flag) {
  const error = new Error(`ARGUMENT_REFUSED: unrecognized flag --${flag}`);
  error.code = "ARGUMENT_REFUSED";
  throw error;
}

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  const profile = ARGUMENT_PROFILES.get(out._.slice(0, 2).join(" ")) ?? ARGUMENT_PROFILES.get(out._[0]);
  if (profile) for (const flag of Object.keys(out).filter((key) => key !== "_")) if (!profile.has(flag)) argumentRefused(flag);
  return out;
}

function uuidv7(now = Date.now()) {
  const bytes = randomBytes(16);
  let value = BigInt(now);
  for (let i = 5; i >= 0; i--) { bytes[i] = Number(value & 255n); value >>= 8n; }
  bytes[6] = 0x70 | (bytes[6] & 0x0f);
  bytes[8] = 0x80 | (bytes[8] & 0x3f);
  const hex = bytes.toString("hex");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function compact(iso) { return iso.replace(/[-:]/g, "").replace(".000", ""); }
function line(key, value) { return `${key}: ${value === null ? "null" : Array.isArray(value) ? `[${value.join(", ")}]` : value}`; }

export async function validateAppendInputs({ body, artifacts = [], cwd = process.cwd() }) {
  const bodyFinding = detectCredential(body);
  if (bodyFinding.hit) { const error = new Error("CREDENTIAL_INPUT_REFUSED: event body refused"); error.code = "CREDENTIAL_INPUT_REFUSED"; throw error; }
  for (const reference of artifacts.filter(Boolean)) {
    const artifactPath = reference.split("#", 1)[0];
    const artifact = await readFile(path.resolve(cwd, artifactPath), "utf8");
    if (detectCredential(artifact).hit) { const error = new Error("CREDENTIAL_INPUT_REFUSED: artifact refused"); error.code = "CREDENTIAL_INPUT_REFUSED"; throw error; }
  }
}

const THREAD_MODES = new Set(["strict_relay", "free_form", "coordinator_led"]);

async function threadHasEvents(cwd, thread) {
  const actorDirectories = await readdir(path.join(cwd, "events"));
  for (const actor of actorDirectories) {
    for (const name of await readdir(path.join(cwd, "events", actor))) {
      if (!name.endsWith(".md")) continue;
      const event = parseEvent(await readFile(path.join(cwd, "events", actor, name), "utf8"), name);
      if (event.meta.thread === thread) return true;
    }
  }
  return false;
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

export async function run(argv, cwd = process.cwd()) {
  const options = args(argv);
  const command = options._[0];
  if (command === "welcome" && options._[1] === "verify") {
    if (!options.package) throw new Error("welcome verify requires --package");
    const result = await verifyWelcome(path.resolve(cwd, options.package), { root: cwd });
    for (const error of result.errors) console.error(`✗ ${error}`);
    if (!result.ok) return 1;
    console.log(`✓ welcome package verified`);
    console.log(`grant (${result.profile}): ${JSON.stringify(result.grant)}`);
    return 0;
  }
  if (command === "setup" && options._[1] === "compile") {
    if (!options.file) throw new Error("setup compile requires --file");
    const steps = await compileSetupFile(path.resolve(cwd, options.file));
    console.log(JSON.stringify({ profile: ACTION_PROFILE, plan_profile: PLAN_PROFILE, plan_digest: steps.plan_digest, steps }, null, 2));
    return 0;
  }
  if (command === "setup" && options._[1] === "dry-run") {
    if (!options.file) throw new Error("setup dry-run requires --file");
    if (!options["temp-dir"]) throw new Error("setup dry-run requires --temp-dir");
    const steps = await compileSetupFile(path.resolve(cwd, options.file));
    console.log(JSON.stringify(executeDryRun(steps, { temporary_directory: path.resolve(cwd, options["temp-dir"]) }), null, 2));
    return 0;
  }
  if (command === "verify") {
    const result = await verifyLog(cwd);
    if (!result.ok) { console.error(result.errors.map((error) => `✗ ${error}`).join("\n")); return 1; }
    console.log(`✓ verified ${result.events} events across ${result.threads} thread(s) and ${result.actors} actors`); return 0;
  }
  if (command === "thread" && options._[1] === "declare") {
    for (const required of ["thread", "mode"]) if (!options[required]) throw new Error(`thread declare requires --${required}`);
    if (!THREAD_MODES.has(options.mode)) throw new Error(`thread declare refuses unknown mode ${options.mode}`);
    if (options.mode === "coordinator_led" && !options.coordinator) throw new Error("thread declare requires --coordinator for coordinator_led mode");
    if (options.mode !== "coordinator_led" && options.coordinator) throw new Error(`thread declare refuses --coordinator for ${options.mode} mode`);
    if (await threadHasEvents(cwd, options.thread)) throw new Error(`mode immutability violation; thread ${options.thread} already has events`);
    const coordinator = options.coordinator ?? null;
    if (coordinator) {
      try { await readFile(path.join(cwd, "actors", `${coordinator}.yaml`), "utf8"); }
      catch { throw new Error(`thread declare refuses unknown coordinator ${coordinator}`); }
    }
    const directory = path.join(cwd, "threads");
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, `${options.thread}.yaml`);
    const source = `${line("schema_version", 0)}\n${line("thread", options.thread)}\n${line("mode", options.mode)}\n${line("coordinator", coordinator)}\n`;
    await writeFile(file, source, { flag: "wx" });
    const result = await verifyLog(cwd);
    if (!result.ok) throw new Error(`thread declaration invalid:\n${result.errors.join("\n")}`);
    console.log(path.relative(cwd, file));
    return 0;
  }
  if (command === "inbox") {
    if (!options.actor) throw new Error("inbox requires --actor");
    const result = await verifyLog(cwd, { throwOnError: true });
    const { readdir } = await import("node:fs/promises");
    const files = [];
    for (const actor of await readdir(path.join(cwd, "events"))) for (const name of await readdir(path.join(cwd, "events", actor))) if (name.endsWith(".md")) files.push(path.join(cwd, "events", actor, name));
    const parsed = await Promise.all(files.sort().map(async (file) => ({ file, event: parseEvent(await readFile(file, "utf8"), path.relative(cwd, file)) })));
    const answered = new Set(parsed.map(({ event }) => event.meta.in_reply_to).filter(Boolean));
    let found = 0;
    for (const { file, event } of parsed) if (event.meta.next === options.actor && !answered.has(event.meta.id)) { console.log(path.relative(cwd, file)); found++; }
    if (!found) console.log(`No open events addressed to ${options.actor}.`);
    return result.ok ? 0 : 1;
  }
  if (command === "append") {
    for (const required of ["actor", "thread", "type", "body"]) if (!options[required]) throw new Error(`append requires --${required}`);
    const body = await readFile(path.resolve(cwd, options.body), "utf8");
    const artifacts = options.artifacts ? options.artifacts.split(",").filter(Boolean) : [];
    await validateAppendInputs({ body, artifacts, cwd });
    const occurredAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = uuidv7();
    const meta = [line("schema_version", 0), line("id", id), line("thread", options.thread), line("from", options.actor), line("type", options.type), line("occurred_at", occurredAt), line("in_reply_to", options.reply ?? null), line("next", options.next ?? null), line("content_sha256", hashBody(body))];
    if (!options.reply) {
      const declaration = await readThreadDeclaration(cwd, options.thread);
      if (declaration) meta.push(line("thread_config_sha256", hashThreadConfig(declaration)));
    }
    if (artifacts.length) meta.push(line("artifacts", artifacts));
    const directory = path.join(cwd, "events", options.actor);
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, `${compact(occurredAt)}_${id}.md`);
    await writeFile(file, `---\n${meta.join("\n")}\n---\n${body.trimEnd()}\n`, { flag: "wx" });
    const result = await verifyLog(cwd);
    if (!result.ok) { console.error(`Event written but log is invalid:\n${result.errors.join("\n")}`); return 1; }
    console.log(path.relative(cwd, file)); return 0;
  }
  console.log("EngramPort Git v0\n\nCommands:\n  verify\n  inbox --actor SLUG\n  thread declare --thread SLUG --mode MODE [--coordinator SLUG]\n  append --actor SLUG --thread SLUG --type TYPE --body FILE [--reply UUID] [--next SLUG] [--artifacts REF,...]");
  return command ? 1 : 0;
}
