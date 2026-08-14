import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashBody, parseEvent, verifyLog } from "./verify-log.mjs";

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) argv[i].startsWith("--") ? out[argv[i].slice(2)] = argv[++i] : out._.push(argv[i]);
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

export async function run(argv, cwd = process.cwd()) {
  const options = args(argv);
  const command = options._[0];
  if (command === "verify") {
    const result = await verifyLog(cwd);
    if (!result.ok) { console.error(result.errors.map((error) => `✗ ${error}`).join("\n")); return 1; }
    console.log(`✓ verified ${result.events} events across ${result.threads} thread(s) and ${result.actors} actors`); return 0;
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
    const occurredAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const id = uuidv7();
    const meta = [line("schema_version", 0), line("id", id), line("thread", options.thread), line("from", options.actor), line("type", options.type), line("occurred_at", occurredAt), line("in_reply_to", options.reply ?? null), line("next", options.next ?? null), line("content_sha256", hashBody(body))];
    if (options.artifacts) meta.push(line("artifacts", options.artifacts.split(",")));
    const directory = path.join(cwd, "events", options.actor);
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, `${compact(occurredAt)}_${id}.md`);
    await writeFile(file, `---\n${meta.join("\n")}\n---\n${body.trimEnd()}\n`, { flag: "wx" });
    const result = await verifyLog(cwd);
    if (!result.ok) { console.error(`Event written but log is invalid:\n${result.errors.join("\n")}`); return 1; }
    console.log(path.relative(cwd, file)); return 0;
  }
  console.log("EngramPort Git v0\n\nCommands:\n  verify\n  inbox --actor SLUG\n  append --actor SLUG --thread SLUG --type TYPE --body FILE [--reply UUID] [--next SLUG] [--artifacts REF,...]");
  return command ? 1 : 0;
}
