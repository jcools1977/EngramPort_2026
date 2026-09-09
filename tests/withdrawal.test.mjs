import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const source = process.env.ADR52_SOURCE_ROOT ?? path.resolve(import.meta.dirname, "..");
const { appendEvent, listInbox } = await import(pathToFileURL(path.join(source, "packages/git-adapter/src/event-core.mjs")));
const { verifyLog, parseEvent, EVENT_TYPES } = await import(pathToFileURL(path.join(source, "packages/git-adapter/src/verify-log.mjs")));
const { run } = await import(pathToFileURL(path.join(source, "packages/git-adapter/src/cli.mjs")));
const require = createRequire(import.meta.url);
const Ajv = createRequire(require.resolve("ajv-formats"))("ajv/dist/2020").default;
const addFormats = require("ajv-formats");

function project(t, mode = "strict_relay") {
  const root = mkdtempSync(path.join(tmpdir(), "adr52-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const a of ["a", "b", "c"]) {
    for (const dir of ["actors", `events/${a}`, `artifacts/${a}`, "threads"]) mkdirSync(path.join(root, dir), { recursive: true });
    writeFileSync(path.join(root, `actors/${a}.yaml`), `slug: ${a}\ndisplay_name: ${a}\nkind: agent\nevent_directory: events/${a}\nartifact_prefix: artifacts/${a}\n`);
  }
  writeFileSync(path.join(root, "engramport.yaml"), `protocol: engramport-git-v0\nproject: test\nmode: ${mode}\ndefault_thread_mode: ${mode}\n`);
  writeFileSync(path.join(root, "threads/t.yaml"), `schema_version: 0\nthread: t\nmode: ${mode}\ncoordinator: ${mode === "coordinator_led" ? "a" : "null"}\n`);
  return root;
}
const add = (root, fields) => appendEvent({ actor: "a", thread: "t", type: "message", body: "Reason for retiring this wait.\n", next: "b", ...fields }, { cwd: root });
function observed(label, result, ok, pattern) {
  console.log(`ADR52_OBS ${label} ok=${result.ok} errors=${JSON.stringify(result.errors)}`);
  assert.equal(result.ok, ok, JSON.stringify(result.errors));
  if (pattern) assert.match(result.errors.join("\n"), pattern);
  return result;
}
async function seed(root) { return observed("seed", await add(root, {}), true); }
async function withdraw(root, parent, fields = {}) { return add(root, { type: "withdrawal", reply: parent.event_id, ...fields }); }
async function inbox(root) { return listInbox({ actor: "b", cwd: root }); }

test("ADR52 sender withdraws and inbox retires original", async (t) => {
  const root = project(t), e = await seed(root);
  assert.deepEqual(await inbox(root), [e.relative]);
  const w = observed("sender-withdraws", await withdraw(root, e), true);
  assert.deepEqual(await inbox(root), [w.relative]);
  console.log("ADR52_INBOX original=absent withdrawal=present");
  observed("real-withdrawal-verify", await verifyLog(root), true);
  const ajv = new Ajv({ strict: true, strictRequired: false }); addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(path.join(source, "schemas/event-v1.schema.json"))));
  assert.equal(validate(parseEvent(readFileSync(path.join(root, w.relative), "utf8")).meta), true, JSON.stringify(validate.errors));
  console.log("ADR52_SCHEMA real-withdrawal=accepted");
});

test("ADR52 pre-fix unknown type", { skip: !process.env.ADR52_PRE_FIX }, async (t) => {
  const root = project(t), e = await seed(root);
  observed("pre-fix", await withdraw(root, e), false, /unknown event type withdrawal/);
  assert.deepEqual(await inbox(root), [e.relative]);
});

for (const body of ["", " \t\n "]) test(`ADR52 empty reason ${JSON.stringify(body)}`, async (t) => {
  const root = project(t), e = await seed(root), before = await inbox(root);
  observed("empty-reason", await withdraw(root, e, { body }), false, /non-empty reason/);
  assert.deepEqual(await inbox(root), before);
});
for (const actor of ["b", "c"]) test(`ADR52 non-sender ${actor}`, async (t) => {
  const root = project(t), e = await seed(root), before = await inbox(root);
  observed("non-sender", await withdraw(root, e, { actor }), false, /original sender/);
  assert.deepEqual(await inbox(root), before);
});
for (const first of ["reply", "withdrawal"]) test(`ADR52 single successor ${first} first`, async (t) => {
  const root = project(t), e = await seed(root);
  const reply = () => add(root, { actor: "b", type: "reply", reply: e.event_id, next: "a" });
  observed("first-successor", await (first === "reply" ? reply() : withdraw(root, e)), true);
  observed("second-successor", await (first === "reply" ? withdraw(root, e) : reply()), false, /parent has 2 replies/);
});

test("ADR52 forked history verifier", async (t) => {
  const root = project(t), e = await seed(root), branch = project(t);
  cpSync(root, branch, { recursive: true });
  const w = observed("fork-withdrawal", await withdraw(root, e), true);
  const r = observed("fork-reply", await add(branch, { actor: "b", type: "reply", reply: e.event_id, next: "a" }), true);
  // Assemble both independently valid successors on disk only in this scaffold.
  cpSync(path.join(branch, r.relative), path.join(root, r.relative));
  assert.ok(w.event_id !== r.event_id);
  observed("fork-verifier", await verifyLog(root), false, /parent has 2 replies/);
});

for (const next of [null, "a"]) test(`ADR52 late completion once next=${next}`, async (t) => {
  const root = project(t), e = await seed(root), w = observed("withdrawal", await withdraw(root, e), true);
  const complete = () => add(root, { actor: "b", type: "completion", reply: w.event_id, next });
  observed("late-completion", await complete(), true);
  observed("second-completion", await complete(), false, /parent has 2 replies/);
});

test("ADR52 original handoff criteria preserved", async (t) => {
  const root = project(t);
  const evidence = observed("evidence", await add(root, { thread: "evidence", next: null }), true);
  const refs = [{ type: "event", event_id: evidence.event_id }];
  const h = observed("handoff", await add(root, { type: "handoff", boundedContext: refs, completionCriteria: [{ id: "c1", statement: "Report observed work", evidence_classes: ["event"] }] }), true);
  const w = observed("withdrawal", await withdraw(root, h), true);
  const base = { actor: "b", type: "completion", reply: w.event_id, next: "a" };
  observed("missing-criteria", await add(root, base), false, /criteria_results is required/);
  observed("wrong-criteria", await add(root, { ...base, criteriaResults: [] }), false, /missing criterion ids/);
  observed("late-handoff-completion", await add(root, { ...base, criteriaResults: [{ criterion_id: "c1", status: "unmet", evidence: refs }] }), true);
});

test("ADR52 non-handoff criteria refused", async (t) => {
  const root = project(t), e = await seed(root), w = observed("withdrawal", await withdraw(root, e), true);
  observed("non-handoff-criteria", await add(root, { actor: "b", type: "completion", reply: w.event_id, next: null, criteriaResults: [] }), false, /requires an original handoff/);
});

test("ADR52 other self replies remain refused", async (t) => {
  for (const type of EVENT_TYPES.filter((type) => type !== "withdrawal")) {
    const root = project(t), e = await seed(root);
    const fields = type === "handoff" ? { boundedContext: [{ type: "event", event_id: e.event_id }], completionCriteria: [{ id: "c", statement: "s", evidence_classes: ["event"] }] } : {};
    observed(`self-${type}`, await add(root, { type, reply: e.event_id, ...fields }), false, /may not reply to itself/);
  }
});
for (const mode of ["free_form", "coordinator_led"]) test(`ADR52 non-strict ${mode}`, async (t) => {
  const root = project(t, mode), e = await seed(root);
  observed("non-strict", await withdraw(root, e), false, /withdrawal requires strict_relay/);
});

test("ADR52 parent required", async (t) => {
  observed("root-withdrawal", await add(project(t), { type: "withdrawal" }), false, /withdrawal requires a parent/);
});
for (const next of [null, "c"]) test(`ADR52 addressee binding ${next}`, async (t) => {
  const root = project(t), e = await seed(root);
  observed("wrong-addressee", await withdraw(root, e, { next }), false, /original addressee/);
});
test("ADR52 terminal turn cannot withdraw", async (t) => {
  const root = project(t), e = observed("terminal", await add(root, { next: null }), true);
  observed("terminal-withdrawal", await withdraw(root, e, { next: null }), false, /original addressee/);
});
test("ADR52 duplicate withdrawal refused", async (t) => {
  const root = project(t), e = await seed(root);
  observed("withdrawal", await withdraw(root, e), true);
  observed("duplicate-withdrawal", await withdraw(root, e), false, /parent has 2 replies/);
});
test("ADR52 withdrawal successor completion only", async (t) => {
  const root = project(t), e = await seed(root), w = observed("withdrawal", await withdraw(root, e), true);
  observed("non-completion", await add(root, { actor: "b", type: "reply", reply: w.event_id, next: "a" }), false, /successor must be a completion/);
});
test("ADR52 late completion routing", async (t) => {
  const root = project(t), e = await seed(root), w = observed("withdrawal", await withdraw(root, e), true);
  observed("completion-routing", await add(root, { actor: "b", type: "completion", reply: w.event_id, next: "c" }), false, /late completion next/);
});
test("ADR52 late completion only addressee", async (t) => {
  for (const actor of ["a", "c"]) {
    const root = project(t), e = await seed(root), w = observed("withdrawal", await withdraw(root, e), true);
    observed("wrong-completer", await add(root, { actor, type: "completion", reply: w.event_id, next: null }), false, /expected next actor b/);
  }
});
test("ADR52 CLI accepts withdrawal", async (t) => {
  const root = project(t), e = await seed(root);
  writeFileSync(path.join(root, "artifacts/a/reason.md"), "Explicit retirement of the relay wait.\n");
  assert.equal(await run(["append", "--actor", "a", "--thread", "t", "--type", "withdrawal", "--reply", e.event_id, "--next", "b", "--body", "artifacts/a/reason.md"], root), 0);
  assert.ok(!(await inbox(root)).includes(e.relative));
});
