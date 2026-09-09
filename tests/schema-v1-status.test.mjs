import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Resolve the draft-2020-12 implementation used by the locked ajv-formats
// dependency, rather than ESLint's draft-07 Ajv. No network or install required.
const require = createRequire(import.meta.url);
const formatsRequire = createRequire(require.resolve("ajv-formats"));
const Ajv2020 = formatsRequire("ajv/dist/2020").default;
const addFormats = require("ajv-formats");
const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = process.env.F157_SOURCE_ROOT ?? root;
const schemaFile = "schemas/event-v1.schema.json";
const verifierFile = "packages/git-adapter/src/verify-log.mjs";
const historicalEvent = "events/agent-b/20260908T194830Z_01a08290-9b52-7002-b704-44c3576f959b.md";
const schema = JSON.parse(readFileSync(path.join(sourceRoot, schemaFile), "utf8"));
const { COMPLETION_STATUSES, EVENT_TYPES, parseEvent } = await import(pathToFileURL(path.join(sourceRoot, verifierFile)).href);
const { appendEvent } = await import(pathToFileURL(path.join(sourceRoot, "packages/git-adapter/src/event-core.mjs")).href);
function compile(value) {
  const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
  addFormats(ajv);
  return ajv.compile(value);
}

test("F157 real blocked completion validates against the published schema", () => {
  const { meta } = parseEvent(readFileSync(path.join(root, historicalEvent), "utf8"));
  assert.ok(meta.criteria_results.some((r) => r.status === "blocked"));
  const validate = compile(schema);
  assert.equal(validate(meta), true, JSON.stringify(validate.errors));
  const old = spawnSync("git", ["show", "bc198f2da9cd2bd5c3a4a72ea0518652c3ca889d:schemas/event-v1.schema.json"], { cwd: root, encoding: "utf8" });
  assert.equal(old.status, 0, old.stderr);
  const before = compile(JSON.parse(old.stdout));
  assert.equal(before(meta), false);
  assert.ok(before.errors.some((e) => e.instancePath === "/criteria_results/6/status" && e.keyword === "const"), JSON.stringify(before.errors));
  console.log(`F157_REAL event=${historicalEvent} current=accepted pre-fix=rejected keyword=const`);
});

test("F157 schema and verifier vocabularies agree", () => {
  assert.ok(Object.isFrozen(COMPLETION_STATUSES));
  assert.deepEqual([...schema.$defs.result.properties.status.enum].sort(), [...COMPLETION_STATUSES].sort());
  assert.ok(Object.isFrozen(EVENT_TYPES));
  assert.deepEqual([...schema.properties.type.enum].sort(), [...EVENT_TYPES].sort());
});

test("F157 both consumers accept every status and reject an invented status", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "f157-completion-"));
  try {
    for (const dir of ["actors", "events/a", "artifacts/a", "threads"]) mkdirSync(path.join(fixture, dir), { recursive: true });
    writeFileSync(path.join(fixture, "engramport.yaml"), "protocol: engramport-git-v0\nproject: t\nmode: free_form\ndefault_thread_mode: free_form\n");
    writeFileSync(path.join(fixture, "actors/a.yaml"), "slug: a\ndisplay_name: A\nkind: agent\nevent_directory: events/a\nartifact_prefix: artifacts/a\n");
    const seed = await appendEvent({ actor: "a", thread: "seed", type: "message", body: "evidence\n", next: null }, { cwd: fixture });
    assert.equal(seed.ok, true, JSON.stringify(seed.errors));
    const evidence = [{ type: "event", event_id: parseEvent(readFileSync(path.join(fixture, seed.relative), "utf8")).meta.id }];
    const validate = compile(schema);
    for (const status of [...schema.$defs.result.properties.status.enum, "probably-fine"]) {
      const accepted = status !== "probably-fine";
      const handoff = await appendEvent({ actor: "a", thread: `status-${status}`, type: "handoff", body: "ask\n", next: "a",
        boundedContext: evidence, completionCriteria: [{ id: "c1", statement: "Report the observed outcome", evidence_classes: ["event"] }] }, { cwd: fixture });
      assert.equal(handoff.ok, true, JSON.stringify(handoff.errors));
      const reply = parseEvent(readFileSync(path.join(fixture, handoff.relative), "utf8")).meta.id;
      const result = await appendEvent({ actor: "a", thread: `status-${status}`, type: "completion", body: "result\n", next: null, reply,
        criteriaResults: [{ criterion_id: "c1", status, evidence }] }, { cwd: fixture });
      assert.equal(result.ok, accepted, `status=${status}: ${JSON.stringify(result.errors)}`);
      if (accepted) {
        const { meta } = parseEvent(readFileSync(path.join(fixture, result.relative), "utf8"));
        assert.equal(validate(meta), true, JSON.stringify(validate.errors));
        meta.criteria_results[0].status = "probably-fine";
        assert.equal(validate(meta), false);
        assert.ok(validate.errors.some((e) => e.instancePath === "/criteria_results/0/status" && e.keyword === "enum"));
      } else assert.ok(result.errors.some((e) => /status must be one of/.test(e)));
      console.log(`F157_CONSUMERS status=${status} accepted=${accepted}`);
    }
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("F157 discriminating mutations", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "f157-mutations-"));
  const baselinePattern = "^F157 (real|schema|both)";
  function run(pattern) {
    const env = { ...process.env, F157_SOURCE_ROOT: temporary };
    delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath, ["--test", "--test-reporter=tap", `--test-name-pattern=${pattern}`, "tests/schema-v1-status.test.mjs"], {
      cwd: root, encoding: "utf8", timeout: 60_000, env
    });
  }
  function reset() {
    for (const dir of ["schemas", "packages/git-adapter/src"]) cpSync(path.join(sourceRoot, dir), path.join(temporary, dir), { recursive: true });
  }
  const mutations = [
    ["pre-fix-schema", schemaFile, '"enum": ["satisfied", "unmet", "blocked"]', '"const": "satisfied"', "F157 real blocked"],
    ["schema-extra-status", schemaFile, '"satisfied", "unmet", "blocked"', '"satisfied", "unmet", "blocked", "invented"', "F157 schema and verifier"],
    ["verifier-missing-status", verifierFile, '"satisfied", "unmet", "blocked"', '"satisfied", "unmet"', "F157 schema and verifier"],
    ["verifier-private-copy", verifierFile, "new Set(COMPLETION_STATUSES)", 'new Set(["satisfied", "unmet"])', "F157 both consumers"],
    ["verifier-guard-bypassed", verifierFile, "if (!COMPLETION_STATUS.has(result.status))", "if (false)", "F157 both consumers"],
  ];
  let executed = 0;
  try {
    reset();
    const baseline = run(baselinePattern);
    assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
    assert.match(baseline.stdout, /ok \d+ - F157 both consumers/);
    console.log("F157_MUTATIONS baseline=0");
    for (const [name, file, before, after, control] of mutations) {
      reset();
      const filename = path.join(temporary, file);
      const source = readFileSync(filename, "utf8");
      assert.equal(source.split(before).length - 1, 1, `unique target ${name}`);
      writeFileSync(filename, source.replace(before, after));
      const result = run(`^${control}`);
      assert.equal(result.signal, null, `${name} did not finish`);
      assert.notEqual(result.status, 0, `${name} survived`);
      assert.match(result.stdout, new RegExp(`not ok \\d+ - ${control}`), result.stdout + result.stderr);
      executed++;
      console.log(`F157_MUTATION ${name}=killed control=${control} executed=${executed}`);
    }
    reset();
    const restored = run(baselinePattern);
    assert.equal(restored.status, 0, restored.stdout + restored.stderr);
    assert.match(restored.stdout, /ok \d+ - F157 both consumers/);
    console.log(`F157_MUTATIONS executed=${executed} killed=${executed} survived=0 restored=0`);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
