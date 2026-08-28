import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendEvent, listInbox, validateAppendInputs } from "./event-core.mjs";
import { discoverEventFiles, parseEvent, verifyLog } from "./verify-log.mjs";
import { verifyWelcome } from "./welcome-verify.mjs";
import { ACTION_PROFILE, PLAN_PROFILE, compileSetupFile } from "./workspace-setup.mjs";
import { executeDryRun } from "./workspace-dry-run.mjs";

// SDK consumers import event-core.mjs directly; the CLI re-exports these exact
// bindings for compatibility and adapts argv without a second swappable core.
export { appendEvent, listInbox, validateAppendInputs };

const ARGUMENT_PROFILES = new Map([
  ["welcome verify", new Set(["package"])],
  ["setup compile", new Set(["file"])],
  ["setup dry-run", new Set(["file", "temp-dir"])],
  ["verify", new Set()],
  ["thread declare", new Set(["thread", "mode", "coordinator"])],
  ["inbox", new Set(["actor"])],
  ["append", new Set(["actor", "thread", "type", "body", "reply", "next", "artifacts", "id", "schema-version", "bounded-context", "completion-criteria", "criteria-results"])]
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

function line(key, value) { return `${key}: ${value === null ? "null" : Array.isArray(value) ? `[${value.join(", ")}]` : value}`; }

const THREAD_MODES = new Set(["strict_relay", "free_form", "coordinator_led"]);

async function threadHasEvents(cwd, thread) {
  for (const file of await discoverEventFiles(path.join(cwd, "events"))) {
    const event = parseEvent(await readFile(file, "utf8"), path.relative(cwd, file));
    if (event.meta.thread === thread) return true;
  }
  return false;
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
    const files = await listInbox({ actor: options.actor, cwd });
    for (const file of files) console.log(file);
    if (!files.length) console.log(`No open events addressed to ${options.actor}.`);
    return 0;
  }
  if (command === "append") {
    for (const required of ["actor", "thread", "type", "body"]) if (!options[required]) throw new Error(`append requires --${required}`);
    const body = await readFile(path.resolve(cwd, options.body), "utf8");
    const artifacts = options.artifacts ? options.artifacts.split(",").filter(Boolean) : [];
    const readJsonArray = async (flag) => {
      if (!options[flag]) return undefined;
      const value = JSON.parse(await readFile(path.resolve(cwd, options[flag]), "utf8"));
      if (!Array.isArray(value)) throw new Error(`append requires --${flag} to contain a JSON array`);
      return value;
    };
    const boundedContext = await readJsonArray("bounded-context");
    const completionCriteria = await readJsonArray("completion-criteria");
    const criteriaResults = await readJsonArray("criteria-results");
    const schemaVersion = options["schema-version"] === undefined ? undefined : Number(options["schema-version"]);
    const result = await appendEvent({ actor: options.actor, thread: options.thread, type: options.type, body, reply: options.reply, next: options.next, artifacts, schemaVersion, boundedContext, completionCriteria, criteriaResults }, { cwd, id: options.id });
    if (!result.ok) { console.error(`Event refused because log would be invalid:\n${result.errors.join("\n")}`); return 1; }
    console.log(result.relative); return 0;
  }
  console.log("EngramPort Git\n\nCommands:\n  verify\n  inbox --actor SLUG\n  thread declare --thread SLUG --mode MODE [--coordinator SLUG]\n  append --actor SLUG --thread SLUG --type TYPE --body FILE [--id UUIDV7] [--reply UUID] [--next SLUG] [--artifacts REF,...] [--bounded-context JSON] [--completion-criteria JSON] [--criteria-results JSON]");
  return command ? 1 : 0;
}
