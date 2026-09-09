import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const temporary = mkdtempSync(path.join(tmpdir(), "adr52-mutations-"));
const verifier = "packages/git-adapter/src/verify-log.mjs";
const preFix = "799d96e3fa772f1e4ac8a8feaff8e452ce3f1b93";
function reset() {
  for (const dir of ["packages/git-adapter/src", "schemas"]) cpSync(path.join(root, dir), path.join(temporary, dir), { recursive: true });
}
function run(pattern, file = "tests/withdrawal.test.mjs", extra = {}) {
  const env = { ...process.env, ADR52_SOURCE_ROOT: temporary, F157_SOURCE_ROOT: temporary, ...extra };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", `--test-name-pattern=${pattern}`, file], { cwd: root, env, encoding: "utf8", timeout: 60_000 });
  assert.equal(result.signal, null, result.stdout + result.stderr);
  assert.ok(!result.error, String(result.error));
  return result;
}
function removeGuard(marker) {
  const p = path.join(temporary, verifier), text = readFileSync(p, "utf8");
  const lines = text.split("\n"), matches = lines.filter((line) => line.includes(marker));
  assert.equal(matches.length, 1, `unique guard ${marker}`);
  writeFileSync(p, lines.filter((line) => !line.includes(marker)).join("\n"));
}
const mutations = [
  ["sender-only", "WITHDRAWAL_SENDER", "ADR52 non-sender", "non-sender"],
  ["non-empty-reason", "WITHDRAWAL_REASON", "ADR52 empty reason", "empty-reason"],
  ["successor-reply-first", "parent has ${count} replies", "ADR52 single successor reply first", "second-successor"],
  ["successor-withdrawal-first", "parent has ${count} replies", "ADR52 single successor withdrawal first", "second-successor"],
  ["forked-history-verifier", "parent has ${count} replies", "ADR52 forked history verifier", "fork-verifier"],
  ["late-completion-once", "parent has ${count} replies", "ADR52 late completion once", "second-completion"],
  ["strict-mode-only", "WITHDRAWAL_MODE", "ADR52 non-strict", "non-strict"],
  ["parent-required", "WITHDRAWAL_PARENT", "ADR52 parent required", "root-withdrawal"],
  ["original-addressee", "WITHDRAWAL_NEXT", "ADR52 addressee binding", "wrong-addressee"],
  ["open-turn", "WITHDRAWAL_NEXT", "ADR52 terminal turn", "terminal-withdrawal"],
  ["completion-only", "/* WITHDRAWAL_COMPLETION */", "ADR52 withdrawal successor completion only", "non-completion"],
  ["completion-routing", "WITHDRAWAL_COMPLETION_NEXT", "ADR52 late completion routing", "completion-routing"],
  ["non-handoff-criteria", "WITHDRAWAL_NO_CRITERIA", "ADR52 non-handoff criteria refused", "non-handoff-criteria"],
];
let executed = 0;
try {
  reset();
  const baseline = run("^ADR52 (?!pre-fix)");
  assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
  console.log("ADR52_MUTATIONS baseline=0");
  // Observe the original append implementation, not an emulated error.
  for (const file of [verifier, "packages/git-adapter/src/event-core.mjs"]) {
    const old = spawnSync("git", ["show", `${preFix}:${file}`], { cwd: root, encoding: "utf8" });
    assert.equal(old.status, 0, old.stderr);
    writeFileSync(path.join(temporary, file), old.stdout);
  }
  const before = run("^ADR52 (pre-fix unknown type|other self replies remain refused)$", undefined, { ADR52_PRE_FIX: "1" });
  assert.equal(before.status, 0, before.stdout + before.stderr);
  assert.match(before.stdout, /ADR52_OBS pre-fix ok=false errors=.*unknown event type withdrawal/);
  console.log(`ADR52_PRE_FIX commit=${preFix} append=refused class=unknown-event-type self-replies=refused`);
  console.log(before.stdout);
  for (const [name, marker, control, observation] of mutations) {
    reset(); removeGuard(marker);
    const result = run(`^${control}`);
    assert.equal(result.status, 1, `${name} survived or failed to run:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, new RegExp(`not ok \\d+ - ${control}`));
    const witness = new RegExp(`ADR52_OBS ${observation} ok=true errors=\\[\\]`);
    assert.match(result.stdout, witness, `mutation must accept the forbidden event, not merely crash:\n${result.stdout}${result.stderr}`);
    executed++;
    console.log(`ADR52_MUTATION name=${name} removed=${marker} observation=${observation}:accepted control=failed executed=${executed}`);
  }
  reset();
  const schemaPath = path.join(temporary, "schemas/event-v1.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath));
  schema.properties.type.enum = schema.properties.type.enum.filter((type) => type !== "withdrawal");
  writeFileSync(schemaPath, JSON.stringify(schema));
  const mismatch = run("^F157 schema and verifier vocabularies agree$", "tests/schema-v1-status.test.mjs");
  assert.equal(mismatch.status, 1, mismatch.stdout + mismatch.stderr);
  assert.match(mismatch.stdout, /not ok \d+ - F157 schema and verifier vocabularies agree/);
  assert.match(mismatch.stdout, /withdrawal/);
  executed++;
  console.log(`ADR52_MUTATION name=schema-type-disagreement existing-one-definition-control=failed executed=${executed}`);
  reset();
  const restored = run("^ADR52 (?!pre-fix)");
  assert.equal(restored.status, 0, restored.stdout + restored.stderr);
  console.log(`ADR52_MUTATIONS executed=${executed} killed=${executed} survived=0 restored=0`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
