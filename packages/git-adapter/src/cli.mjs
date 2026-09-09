import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendEvent, listInbox, validateAppendInputs } from "./event-core.mjs";
import { discoverEventFiles, parseEvent, verifyLog } from "./verify-log.mjs";
import { verifyWelcome } from "./welcome-verify.mjs";
import { ACTION_PROFILE, PLAN_PROFILE, compileSetupFile } from "./workspace-setup.mjs";
import { executeDryRun } from "./workspace-dry-run.mjs";
import { initProject } from "./init.mjs";

// SDK consumers import event-core.mjs directly; the CLI re-exports these exact
// bindings for compatibility and adapts argv without a second swappable core.
export { appendEvent, listInbox, validateAppendInputs };

const ARGUMENT_PROFILES = new Map([
  ["init", new Set(["actor", "kind", "project", "mode"])],
  ["welcome verify", new Set(["package"])],
  ["setup compile", new Set(["file"])],
  ["setup dry-run", new Set(["file", "temp-dir"])],
  ["verify", new Set()],
  ["thread declare", new Set(["thread", "mode", "coordinator"])],
  ["inbox", new Set(["actor"])],
  ["append", new Set(["actor", "thread", "type", "body", "reply", "next", "artifacts", "id", "schema-version", "bounded-context", "completion-criteria", "criteria-results"])]
]);

const HELP = `EngramPort Git

Commands (each accepts --help without reading or writing a project):
  init --actor SLUG --kind human|agent [--project SLUG] [--mode free_form|strict_relay]
  verify
  inbox --actor SLUG
  thread declare --thread SLUG --mode MODE [--coordinator SLUG]
  welcome verify --package DIRECTORY
  setup compile --file FILE
  setup dry-run --file FILE --temp-dir DIRECTORY
  append --actor SLUG --thread SLUG --type TYPE --body FILE [--id UUIDV7] [--reply UUIDV7] [--next SLUG|null] [--artifacts REF,...] [--schema-version 0|1] [--bounded-context JSON_FILE] [--completion-criteria JSON_FILE] [--criteria-results JSON_FILE]

JSON_FILE is a filename, resolved from the current directory, containing a JSON array.
The following are shapes with illustrative values; replace IDs, paths and digests.
--bounded-context JSON_FILE (handoff, 1-32 references):
  [{"type":"event","event_id":"UUIDV7"},{"type":"artifact","ref":"artifacts/ACTOR/FILE#sha256=DIGEST"}]
--completion-criteria JSON_FILE (handoff, 1-32 criteria):
  [{"id":"receipt-written","statement":"Write a receipt.","evidence_classes":["artifact"]}]
--criteria-results JSON_FILE (completion, one entry for every parent criterion):
  [{"criterion_id":"receipt-written","status":"satisfied","evidence":[{"type":"artifact","ref":"artifacts/ACTOR/FILE#sha256=DIGEST"}]}]
References may be event or artifact objects as shown above. DIGEST is 64 lowercase SHA-256 hex characters.
evidence_classes is a unique nonempty subset of ["event","artifact"].
status is "satisfied", "unmet", or "blocked". evidence contains 1-32 references of permitted classes.
--artifacts takes comma-separated digest-bound refs directly, not a JSON filename.
--body takes a UTF-8 text filename. Handoffs require both context and criteria files.
Completion evidence must cover every parent criterion exactly once; do not mark unperformed work satisfied.`;

function argumentRefused(flag) {
  const error = new Error(`ARGUMENT_REFUSED: unrecognized flag --${flag}`);
  error.code = "ARGUMENT_REFUSED";
  throw error;
}

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help") out.help = true;
    else if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  const profile = ARGUMENT_PROFILES.get(out._.slice(0, 2).join(" ")) ?? ARGUMENT_PROFILES.get(out._[0]);
  if (profile) for (const flag of Object.keys(out).filter((key) => key !== "_" && key !== "help")) if (!profile.has(flag)) argumentRefused(flag);
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
  if (options.help) {
    console.log(HELP);
    return 0;
  }
  if (command === "init") {
    for (const file of await initProject(options, cwd)) console.log(file);
    return 0;
  }
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
    const next = options.next === "null" ? null : options.next; /* V1_CLI_TERMINAL_NEXT */
    const result = await appendEvent({ actor: options.actor, thread: options.thread, type: options.type, body, reply: options.reply, next, artifacts, schemaVersion, boundedContext, completionCriteria, criteriaResults }, { cwd, id: options.id });
    if (!result.ok) { console.error(`Event refused because log would be invalid:\n${result.errors.join("\n")}`); return 1; }
    console.log(result.relative); return 0;
  }
  console.log(HELP);
  return command ? 1 : 0;
}
