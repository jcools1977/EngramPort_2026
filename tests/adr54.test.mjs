import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const source = process.env.ADR54_SOURCE_ROOT ?? path.resolve(import.meta.dirname, "..");
const { appendEvent, listInbox } = await import(pathToFileURL(path.join(source, process.env.ADR54_USE_BUNDLE ? "packages/sdk/dist/index.mjs" : "packages/git-adapter/src/event-core.mjs")));
const { verifyLog, parseEvent, hashBody, hashAppendIntent, EVENT_TYPES_V2, COMPLETION_STATUSES } = await import(pathToFileURL(path.join(source, "packages/git-adapter/src/verify-log.mjs")));
const { generateCriteriaReport, generateReportDraft } = await import(pathToFileURL(path.join(source, "packages/git-adapter/src/report-correspondent.mjs")));
const require = createRequire(import.meta.url);
const Ajv = createRequire(require.resolve("ajv-formats"))("ajv/dist/2020").default;
const ajv = new Ajv({ strict: true, strictRequired: false, allErrors: true });
require("ajv-formats")(ajv);
const schema = JSON.parse(readFileSync(path.join(source, "schemas/event-v2.schema.json")));
const validates = ajv.compile(schema);
let now = Date.parse("2026-09-10T18:00:00Z");
function project(t, mode = "free_form") {
  const root = mkdtempSync(path.join(tmpdir(), "adr54-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const actor of ["a", "b", "c"]) {
    for (const dir of [`events/${actor}`, `artifacts/${actor}`, "actors", "threads"]) mkdirSync(path.join(root, dir), { recursive: true });
    writeFileSync(path.join(root, `actors/${actor}.yaml`), `slug: ${actor}\nevent_directory: events/${actor}\nartifact_prefix: artifacts/${actor}\n`);
  }
  writeFileSync(path.join(root, "engramport.yaml"), `mode: ${mode}\ndefault_thread_mode: ${mode}\n`);
  if (mode === "coordinator_led") writeFileSync(path.join(root, "threads/t.yaml"), "schema_version: 0\nthread: t\nmode: coordinator_led\ncoordinator: a\n");
  return root;
}
async function add(root, fields = {}, opts = {}) {
  now += 1000;
  return appendEvent({ actor: "a", thread: "t", type: "message", body: "Observed fixture result.\n", next: "b", ...fields }, { cwd: root, now, ...opts });
}
function observed(label, value, expected = true, pattern) {
  console.log(`ADR54_OBS ${label} ok=${value.ok} errors=${JSON.stringify(value.errors)}`);
  assert.equal(value.ok, expected, `${label}: ${JSON.stringify(value.errors)}`);
  if (pattern) assert.match(value.errors.join("; "), pattern);
  return value;
}
const unknown = () => ({ version: null, platform: null, tree_shape: null, observed_at: null });
const environment = (platform = "linux", observed_at = "2026-09-10T18:00:00Z") => ({ version: { source_revision: "abc", dirty: false, runtime: "node22", subject: "fixture" }, platform, tree_shape: "root", observed_at });
async function handoff(root, thread = "t", criteriaExtra = {}) {
  const seed = observed("seed", await add(root, { thread: `seed-${now}`, next: null }));
  const evidence = [{ type: "event", event_id: seed.event_id }];
  const h = observed("handoff", await add(root, { thread, type: "handoff", ...(criteriaExtra.restates ? { schemaVersion: 2 } : {}), boundedContext: evidence, completionCriteria: [{ id: "c1", statement: "Command meets expectation", evidence_classes: ["event"], ...criteriaExtra }] }));
  return { h, evidence };
}
function result(evidence, status = "satisfied", env = environment()) { return { criterion_id: "c1", status, evidence, environment: env }; }
async function completion(root, h, results, fields = {}) { return add(root, { actor: "b", thread: parseEvent(readFileSync(path.join(root, h.relative), "utf8")).meta.thread, type: "completion", reply: h.event_id, next: null, criteriaResults: results, ...fields }); }

for (const [label, mutate, pattern] of [
  ["required", (r) => { delete r.environment; }, /environment is required/],
  ["time", (r) => { r.environment.observed_at = "yesterday"; }, /observed_at/],
  ["members", (r) => { delete r.environment.platform; }, /missing member/],
  ["extra", (r) => { r.environment.region = "us"; }, /extra member/],
  ["object", (r) => { r.environment = null; }, /must be an object/],
  ["version", (r) => { r.environment.version = { runtime: "node" }; }, /version must have/],
  ["text", (r) => { r.environment.tree_shape = 12; }, /must be text/],
]) test(`ADR54 environment ${label}`, async (t) => {
  const root = project(t), { h, evidence } = await handoff(root), r = result(evidence); mutate(r);
  observed(`env-${label}`, await completion(root, h, [r], { schemaVersion: 2 }), false, pattern);
});

test("ADR54 environment acceptance and schema agreement", async (t) => {
  const root = project(t), { h, evidence } = await handoff(root);
  const r = result(evidence); delete r.environment;
  const v1 = observed("v1-no-environment", await completion(root, h, [r]));
  assert.equal(parseEvent(readFileSync(path.join(root, v1.relative), "utf8")).meta.schema_version, 1);
  for (const env of [unknown(), environment(), { ...unknown(), version: { source_revision: null, dirty: null, runtime: null, subject: null } }]) {
    const c = observed("v2-environment", await completion(root, h, [result(evidence, "blocked", env)]));
    const meta = parseEvent(readFileSync(path.join(root, c.relative), "utf8")).meta;
    assert.equal(meta.schema_version, 2);
    assert.equal(validates(meta), true, JSON.stringify(validates.errors));
  }
  for (const key of ["version", "platform", "tree_shape", "observed_at"]) {
    const env = environment(); delete env[key];
    observed(`missing-${key}`, await completion(root, h, [result(evidence, "satisfied", env)]), false);
  }
  for (const value of ["2026-02-30T12:00:00Z", "2026-09-10", "2026-09-10T25:00:00Z", 12]) observed("bad-time", await completion(root, h, [result(evidence, "satisfied", { ...environment(), observed_at: value })]), false);
  observed("verify-environments", await verifyLog(root));
});

test("ADR54 vocabulary one definition", () => {
  assert.ok(Object.isFrozen(EVENT_TYPES_V2));
  assert.deepEqual([...schema.properties.type.enum].sort(), [...EVENT_TYPES_V2].sort());
  assert.deepEqual([...schema.$defs.result.properties.status.enum].sort(), [...COMPLETION_STATUSES].sort());
});

async function contested(root) {
  const { h, evidence } = await handoff(root);
  observed("opposite-observations", await completion(root, h, [result(evidence, "satisfied", environment("mac")), result(evidence, "unmet", environment("linux"))]));
  return { h, evidence };
}
function state(report, h) { return report.criteria.find((c) => c.handoff_id === h.event_id && c.criterion_id === "c1")?.state; }
test("ADR54 contested clears only after both environments", async (t) => {
  const root = project(t), { h, evidence } = await contested(root);
  assert.equal(state(await generateCriteriaReport({ root }), h), "contested");
  observed("later-linux-pass", await completion(root, h, [result(evidence, "satisfied", environment("linux", "2026-09-10T19:00:00Z"))]));
  let report = await generateCriteriaReport({ root });
  console.log(`ADR54_REPORT one-environment=${state(report, h)}`);
  assert.equal(state(report, h), "contested");
  observed("later-mac-pass", await completion(root, h, [result(evidence, "satisfied", environment("mac", "2026-09-10T20:00:00Z"))]));
  report = await generateCriteriaReport({ root });
  console.log(`ADR54_REPORT both-environments=${state(report, h)}`);
  assert.equal(state(report, h), "observed");
  assert.equal(report.criteria[0].observations.length, 4);
});

test("ADR54 owner restatement", async (t) => {
  const root = project(t), { h } = await contested(root);
  const restated = await handoff(root, "restated", { restates: { handoff_id: h.event_id, environment: environment("linux") } });
  const report = await generateCriteriaReport({ root });
  console.log(`ADR54_REPORT owner=${state(report, h)}`);
  assert.equal(state(report, h), "decided-by-owner");
  assert.equal(report.criteria[0].owner_restatement.event_id, restated.h.event_id);
  assert.equal(report.criteria[0].observations.length, 2);
});

test("ADR54 restatement owner guard", async (t) => {
  const root = project(t), { h, evidence } = await handoff(root);
  observed("restatement-non-owner", await add(root, { actor: "b", thread: "restated", schemaVersion: 2, type: "handoff", boundedContext: evidence, completionCriteria: [{ id: "c1", statement: "New assumption", evidence_classes: ["event"], restates: { handoff_id: h.event_id, environment: environment() } }] }), false, /owned by/);
});

test("ADR54 separate handoffs and cannot tell", async (t) => {
  const root = project(t), one = await handoff(root, "one"), two = await handoff(root, "two");
  observed("one-result", await completion(root, one.h, [result(one.evidence, "satisfied", environment("mac"))]));
  observed("two-result", await completion(root, two.h, [result(two.evidence, "unmet", environment("linux"))]));
  const report = await generateCriteriaReport({ root });
  console.log(`ADR54_REPORT separate-handoffs=${report.state} count=${report.criteria.length}`);
  assert.equal(report.state, "observed"); assert.equal(report.criteria.length, 2);
  const empty = project(t); await handoff(empty);
  const noResults = await generateCriteriaReport({ root: empty });
  assert.equal(noResults.state, "cannot-tell"); assert.equal(noResults.criteria[0].state, "cannot-tell");
  assert.match(noResults.markdown, /cannot-tell/); assert.doesNotMatch(noResults.markdown, /contested/);
});

// The raw candidate is only constructed inside a disposable scaffold, to
// exercise verifyLog independently of the writer's own candidate validation.
async function correctionAttempt(root, fields, label, expected, pattern) {
  const base = { schemaVersion: 2, actor: "a", thread: "t", type: "correction", body: "Annotation only.\n", reply: null, next: null, ...fields };
  now += 1000;
  const id = `${now.toString(16).padStart(12, "0").slice(0, 8)}-${now.toString(16).slice(-4)}-7000-8000-000000000001`;
  const c = await add(root, base, { id });
  console.log(`ADR54_OBS ${label} ok=${c.ok} errors=${JSON.stringify(c.errors)}`);
  if (expected) { observed(`${label}-verify`, await verifyLog(root)); assert.equal(c.ok, true, JSON.stringify(c.errors)); return c; }
  if (!c.ok) {
    const meta = { schema_version: 2, id, thread: base.thread, from: base.actor, type: "correction", occurred_at: new Date(now - 1000).toISOString().replace(".000", ""), in_reply_to: base.reply, next: base.next, content_sha256: hashBody(base.body), corrects: base.corrects };
    meta.intent_sha256 = hashAppendIntent({ schema_version: 2, actor: meta.from, thread: meta.thread, type: meta.type, reply: meta.in_reply_to, next: meta.next, content_sha256: meta.content_sha256, corrects: meta.corrects });
    const text = `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${v === null ? "null" : v}`).join("\n")}\n---\n${base.body}`;
    const verified = await verifyLog(root, { candidateEvent: { relative: c.relative, source: text } });
    observed(`${label}-verify`, verified, false, pattern);
  }
  assert.equal(c.ok, false, JSON.stringify(c.errors)); if (pattern) assert.match(c.errors.join("; "), pattern);
  return c;
}
for (const [label, setup, pattern] of [
  ["author", async (_root, e) => ({ actor: "b", corrects: e.event_id }), /original author/],
  ["unknown", async () => ({ corrects: "01900000-0000-7000-8000-000000000000" }), /target must exist/],
  ["chain", async (root, e) => ({ corrects: (await correctionAttempt(root, { corrects: e.event_id }, "first", true)).event_id }), /cannot target a correction/],
  ["thread", async (root) => ({ corrects: observed("other-thread", await add(root, { thread: "other" })).event_id }), /crosses threads/],
  ["parent", async (_root, e) => ({ corrects: e.event_id, reply: e.event_id }), /in_reply_to must be null/],
  ["next", async (_root, e) => ({ corrects: e.event_id, next: "b" }), /next must be null/],
]) test(`ADR54 correction ${label}`, async (t) => {
  const root = project(t), e = observed("review", await add(root));
  await correctionAttempt(root, await setup(root, e), `correction-${label}`, false, pattern);
});

for (const mode of ["strict_relay", "free_form", "coordinator_led"]) test(`ADR54 correction inbox ${mode}`, async (t) => {
  const root = project(t, mode), e = observed("review", await add(root));
  const c = await correctionAttempt(root, { corrects: e.event_id }, "own-correction", true);
  const meta = parseEvent(readFileSync(path.join(root, c.relative), "utf8")).meta;
  assert.equal(meta.in_reply_to, null); assert.equal(meta.next, null);
  assert.equal(validates(meta), true, JSON.stringify(validates.errors));
  const inbox = await listInbox({ actor: "b", cwd: root });
  console.log(`ADR54_INBOX mode=${mode} original=${inbox.includes(e.relative)} correction=${inbox.includes(c.relative)}`);
  assert.deepEqual(inbox, [e.relative]);
  observed("recipient-reply", await add(root, { actor: "b", type: "reply", reply: e.event_id, next: "a" }));
  observed("second-root", await add(root), false, /already has a root/);
  observed("final-verify", await verifyLog(root));
});

test("ADR54 correction report preserves both", async (t) => {
  const root = project(t), { h, evidence } = await handoff(root);
  const original = observed("original-unmet", await completion(root, h, [result(evidence, "unmet")]));
  const c = await correctionAttempt(root, { actor: "b", corrects: original.event_id }, "annotation", true);
  const report = await generateCriteriaReport({ root });
  const record = report.records.find((r) => r.event_id === original.event_id);
  console.log(`ADR54_REPORT original-status=${record?.criteria_results[0]?.status} correction=${record?.corrections[0]?.event_id}`);
  assert.equal(record?.criteria_results[0]?.status, "unmet"); assert.equal(record.corrections[0].event_id, c.event_id);
  assert.equal(report.criteria[0].observations[0].status, "unmet");
  assert.match(report.markdown, new RegExp(`Original ${original.event_id}.*unmet.*${c.event_id}`));
  // Exercise the existing correspondent entry point as well as the criteria view.
  writeFileSync(path.join(root, "SECURITY.md"), "Fixture\n");
  const artifactPath = "artifacts/a/trace.md", body = "Trace fixture.\n";
  writeFileSync(path.join(root, artifactPath), body);
  const digest = hashBody(body);
  const trace = observed("trace", await add(root, { thread: "trace", artifacts: [`${artifactPath}#sha256=${digest}`] }));
  const draft = await generateReportDraft({ root, manifest: { schema_version: 1, title: "Fixture", dek: "Observation", claims: [{ id: "annotation", kind: "correction", headline: "Annotation", statement: "Original retained", evidence: [{ event_id: trace.event_id, artifact_path: artifactPath, artifact_sha256: digest }] }] }, findingRegistry: { schema_version: 1, maintainer: "agent-a", findings: {} } });
  assert.match(draft.markdown, new RegExp(`Original ${original.event_id}.*unmet.*${c.event_id}`));
});

test("ADR54 retry canonical v2", async (t) => {
  const root = project(t), e = observed("review", await add(root));
  const input = { type: "correction", corrects: e.event_id, next: null };
  const first = observed("retry-first", await add(root, input));
  const retry = observed("retry-reused", await add(root, input, { id: first.event_id })); assert.equal(retry.reused, true);
  let different;
  try { const response = await add(root, { ...input, corrects: "01900000-0000-7000-8000-000000000000" }, { id: first.event_id }); different = response.reused ? "reused" : "other"; } catch (error) { different = error.code; }
  console.log(`ADR54_RETRY different-corrects=${different}`);
  assert.equal(different, "APPEND_INTENT_COLLISION");
  const v2 = observed("v2-message", await add(root, { thread: "retry-version", schemaVersion: 2 }));
  await assert.rejects(add(root, { thread: "retry-version", schemaVersion: 1 }, { id: v2.event_id }), { code: "APPEND_INTENT_COLLISION" });
  assert.notEqual(hashAppendIntent({ actor: "a", schema_version: 1 }), hashAppendIntent({ actor: "a", schema_version: 2 }));
  observed("v1-correction-refused", await add(root, { ...input, schemaVersion: 1 }), false, /unknown event type correction/);
  console.log("ADR54_RETRY reused=true different-corrects=collision different-version=collision");
});

test("ADR54 corrects only annotations", async (t) => {
  const root = project(t), e = observed("review", await add(root));
  observed("corrects-on-message", await add(root, { schemaVersion: 2, type: "message", thread: "other", corrects: e.event_id }), false, /corrects is permitted only/);
});
test("ADR54 correction cannot receive replies", async (t) => {
  const root = project(t), e = observed("review", await add(root));
  const c = await correctionAttempt(root, { corrects: e.event_id }, "annotation", true);
  observed("reply-to-correction", await add(root, { type: "reply", actor: "b", reply: c.event_id }), false, /cannot be a reply target/);
});

test("ADR54 v2 handoff schema and restatement schema", async (t) => {
  const root = project(t), { h } = await handoff(root);
  const restated = await handoff(root, "restated", { restates: { handoff_id: h.event_id, environment: unknown() } });
  const meta = parseEvent(readFileSync(path.join(root, restated.h.relative), "utf8")).meta;
  assert.equal(validates(meta), true, JSON.stringify(validates.errors));
});

test("ADR54 restatement shape guard", async (t) => {
  const root = project(t), { h, evidence } = await handoff(root);
  observed("restatement-extra", await add(root, { thread: "restated", schemaVersion: 2, type: "handoff", boundedContext: evidence, completionCriteria: [{ id: "c1", statement: "New assumption", evidence_classes: ["event"], restates: { handoff_id: h.event_id, environment: unknown(), extra: true } }] }), false, /invalid restates/);
});
