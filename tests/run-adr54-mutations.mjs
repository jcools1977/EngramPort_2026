import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const temporary = mkdtempSync(path.join(tmpdir(), "adr54-mutations-"));
const verifier = "packages/git-adapter/src/verify-log.mjs";
const reporter = "packages/git-adapter/src/report-criteria.mjs";
function reset() { for (const dir of ["packages/git-adapter/src", "packages/sdk/src", "schemas"]) cpSync(path.join(root, dir), path.join(temporary, dir), { recursive: true }); }
function run(pattern, file = "tests/adr54.test.mjs") {
  const env = { ...process.env, ADR54_SOURCE_ROOT: temporary, F157_SOURCE_ROOT: temporary }; delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", `--test-name-pattern=${pattern}`, file], { cwd: root, env, encoding: "utf8", timeout: 60_000 });
  assert.equal(r.signal, null, r.stdout + r.stderr); assert.ok(!r.error, String(r.error)); return r;
}
const guards = [
  ["subject", "V2_ENV_SUBJECT", "ADR54 subject bare$", "subject-bare"],
  ...["required", "time", "members", "extra", "object", "version", "text"].map((n) => [`environment-${n}`, `V2_ENV_${n.toUpperCase()}`, `ADR54 environment ${n}$`, `env-${n}`]),
  ...[["author", "AUTHOR"], ["unknown", "TARGET"], ["chain", "CHAIN"], ["thread", "THREAD"], ["parent", "PARENT"], ["next", "NEXT"]].map(([n, marker]) => [`correction-${n}`, `V2_CORRECTION_${marker}`, `ADR54 correction ${n}$`, `correction-${n}`]),
  ["corrects-only", "V2_CORRECTS_ONLY", "ADR54 corrects only annotations$", "corrects-on-message"],
  ["reply-edge", "V2_CORRECTION_REPLY", "ADR54 correction cannot receive replies$", "reply-to-correction"],
  ["restatement-shape", "V2_RESTATES_SHAPE", "ADR54 restatement shape guard$", "restatement-extra"],
  ["owner-only", "V2_RESTATES_OWNER", "ADR54 restatement owner guard$", "restatement-non-owner"],
];
let executed = 0;
function killed(name, pattern, witness) {
  const r = run(`^${pattern}`);
  assert.equal(r.status, 1, `${name} survived or crashed:\n${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /not ok \d+ - ADR54/, r.stdout + r.stderr);
  assert.match(r.stdout, witness, `missing discriminating observation ${name}:\n${r.stdout}${r.stderr}`);
  console.log(`ADR54_MUTATION name=${name} killed=true witness=${r.stdout.split("\n").filter((l) => witness.test(l)).join(" ")} executed=${++executed}`);
}
try {
  reset(); const baseline = run("^ADR54"); assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr); console.log("ADR54_MUTATIONS baseline=0");
  for (const [name, marker, pattern, observation] of guards) {
    reset(); const p = path.join(temporary, verifier), lines = readFileSync(p, "utf8").split("\n");
    assert.equal(lines.filter((l) => l.includes(`/* ${marker} */`)).length, 1, marker);
    // For the object guard preserve the early return when mutation admits null.
    const replacement = marker === "V2_ENV_OBJECT" ? '  if (!environment || typeof environment !== "object" || Array.isArray(environment)) return;' : "";
    writeFileSync(p, lines.map((l) => l.includes(`/* ${marker} */`) ? replacement : l).join("\n"));
    killed(name, pattern, new RegExp(`ADR54_OBS ${observation} ok=true errors=\\[\\]`));
  }
  for (const [name, file, before, after, pattern, witness] of [
    ["retry-corrects", verifier, "Object.assign(intent, { schema_version, corrects });", "Object.assign(intent, { schema_version });", "ADR54 retry canonical v2$", /ADR54_RETRY different-corrects=reused/],
    ["handoff-key", reporter, 'return `${handoffId}:${criterionId}`;', 'return criterionId;', "ADR54 separate handoffs", /ADR54_REPORT separate-handoffs=contested count=1/],
    ["clear-one-environment", reporter, 'pins.every((v) => v.order > group.conflict.order)', 'pins.some((v) => v.order > group.conflict.order)', "ADR54 contested clears", /ADR54_REPORT one-environment=observed/],
    ["never-clear", reporter, 'group.conflict = null; /* V2_REPORT_CLEAR_BOTH */', 'group.conflict = group.conflict; /* V2_REPORT_CLEAR_BOTH */', "ADR54 contested clears", /ADR54_REPORT both-environments=contested/],
    ["owner-restatement-ignored", reporter, 'if (group && target?.from === event.from && target.id !== event.id)', 'if (false)', "ADR54 owner restatement$", /ADR54_REPORT owner=contested/],
    ["replace-original", reporter, 'event_id: event.id, type: event.type, criteria_results: event.criteria_results ?? [],', 'event_id: event.id, type: event.type, criteria_results: ordered.some((c) => c.corrects === event.id) ? [] : event.criteria_results ?? [],', "ADR54 correction report preserves", /ADR54_REPORT original-status=undefined correction=/],
    ["one-root", verifier, 'if (threadRoots.length > 1)', 'if (false)', "ADR54 correction inbox free_form$", /ADR54_OBS second-root ok=true errors=\[\]/],
  ]) {
    reset(); const p = path.join(temporary, file), s = readFileSync(p, "utf8"); assert.equal(s.split(before).length, 2, name); writeFileSync(p, s.replace(before, after)); killed(name, pattern, witness);
  }
  reset(); const p = path.join(temporary, "schemas/event-v2.schema.json"), schema = JSON.parse(readFileSync(p)); schema.properties.type.enum = schema.properties.type.enum.filter((v) => v !== "correction"); writeFileSync(p, JSON.stringify(schema));
  killed("v2-vocabulary", "ADR54 vocabulary one definition$", /correction/);
  const existing = run("^F157 schema and verifier vocabularies agree$", "tests/schema-v1-status.test.mjs");
  assert.equal(existing.status, 1, existing.stdout + existing.stderr);
  assert.match(existing.stdout, /not ok \d+ - F157 schema and verifier vocabularies agree/);
  assert.match(existing.stdout, /correction/);
  console.log(`ADR54_MUTATION name=existing-one-definition-v2 killed=true executed=${++executed}`);
  reset(); const restored = run("^ADR54"); assert.equal(restored.status, 0, restored.stdout + restored.stderr);
  console.log(`ADR54_MUTATIONS executed=${executed} killed=${executed} survived=0 restored=0`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
