import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const harness = path.join(root, "scripts/run-d1-mutation-harness");
const original = readFileSync(harness, "utf8");
const testName = "synthetic canary baseline exceeds its budget";
function fixture(operation) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "d1-timeout-"));
  try { return operation(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
function run(script, args) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync("bash", ["-c", script, "d1-timeout-control", ...args], {
    cwd: root, env, encoding: "utf8", timeout: 20000, maxBuffer: 2 * 1024 * 1024,
  });
}
function syntheticTest(directory) {
  const file = path.join(directory, "timeout.test.mjs");
  writeFileSync(file, `import test from "node:test";
import {setTimeout} from "node:timers/promises";
test(${JSON.stringify(testName)}, {timeout:40}, async t => {
  await setTimeout(5000, null, {signal:t.signal});
});
`);
  return file;
}
function runCanaryBranches(directory, source = harness, selected = "all") {
  const file = syntheticTest(directory);
  return run(`source "$1"
root_dir="$2"; mutation_dir="$3"; synthetic_test="$4"
d1_load_definitions "$root_dir" || exit 2
selected=()
for definition in "\${MUTATIONS[@]}"; do
  if [[ "$definition" = D3_CANARY_* ]] && { [ "$5" = all ] || [[ "$definition" = "D3_CANARY_OPERATIONAL_OBSERVER|"* ]]; }; then
    selected+=("$definition")
  fi
done
MUTATIONS=("\${selected[@]}")
# Substitute only the Docker entry point. Keep assertion capture, the actual
# branch loop, variant builder, timeout classifier, and accounting unchanged.
run_canary(){ node --test --test-reporter=tap --test-timeout=10000 "$synthetic_test"; }
d1_accounting_init
d1_run_mutations
d1_summary
`, [source, root, directory, file, selected]);
}
function assertTimeout(result, count) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const lines = result.stdout.split("\n").filter(line => line.startsWith("D3_CANARY_"));
  assert.equal(lines.length, count, result.stdout);
  for (const line of lines) {
    assert.match(line, /^D3_CANARY_\S+ baseline-timeout /);
    assert.ok(line.includes(`test=${JSON.stringify(testName)} budget_ms=40 exit=1`), line);
  }
  assert.doesNotMatch(result.stdout, /baseline=|applied=|forbidden=/);
  assert.ok(result.stdout.includes(`executed=${count} not_exercised=0 negative_control=0 expected_total=${count}`));
  assert.match(result.stderr, /D1 mutation harness failed/);
  assert.doesNotMatch(result.stderr, /D1 (missing|duplicate|unknown) outcome:/);
}

test("all five canary branches count real synthetic baseline timeouts and fail before mutation", () => fixture(directory => {
  const result = runCanaryBranches(directory);
  assertTimeout(result, 5);
  console.log(result.stdout.trim());
  console.log("D1_SYNTHETIC_TIMEOUT live_canary=blocked reason=no-Docker; only synthetic baselines ran");
}));

test("the timeout control kills reporting a timed-out baseline as baseline=1 and passes after restoration", () => fixture(directory => {
  assertTimeout(runCanaryBranches(directory, harness, "one"), 1);
  const anchor = 'if d1_baseline_timeout "$outcome_name" "$baseline_rc" "$baseline_log"; then';
  assert.equal(original.split(anchor).length, 2);
  const mutant = path.join(directory, "baseline-one.bash");
  writeFileSync(mutant, original.replace(anchor, "if false; then"));
  const result = runCanaryBranches(directory, mutant, "one");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /D3_CANARY_OPERATIONAL_OBSERVER baseline=1 applied=t after=1 forbidden=f restored=1/);
  assert.throws(() => assertTimeout(result, 1), { code: "ERR_ASSERTION" });
  assertTimeout(runCanaryBranches(directory, harness, "one"), 1);
  console.log(result.stdout.trim());
  console.log("D1_TIMEOUT_CLASSIFICATION baseline=0 applied=t control=1 restored=0 killed=t");
}));

test("ordinary failure and successful output mentioning a timeout are not classified as baseline-timeout", () => fixture(directory => {
  const log = path.join(directory, "ordinary.log");
  writeFileSync(log, "not ok 1 - ordinary failure\n  ---\n  error: 'test timed out after 40ms'\n  failureType: 'testCodeFailure'\n  ...\n");
  const result = run(`source "$1"
MUTATIONS=('SYNTHETIC|SYNTHETIC|SELECT true'); d1_accounting_init
if d1_baseline_timeout SYNTHETIC 1 "$2"; then exit 2; fi
printf 'ORDINARY fail=%s executed=%s\\n' "$fail" "$executed"
`, [harness, log]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /ORDINARY fail=0 executed=0/);
  writeFileSync(log, readFileSync(log, "utf8").replace("testCodeFailure", "testTimeoutFailure"));
  const successful = run('source "$1"; if d1_baseline_timeout SYNTHETIC 0 "$2"; then exit 2; fi', [harness, log]);
  assert.equal(successful.status, 0, successful.stdout + successful.stderr);
  assert.equal(successful.stdout, "");
}));

function assertCanaryBudget(source) {
  const defaultBudget = Number(original.match(/run_w1_7\(\).*?--test-timeout=(\d+)/)?.[1]);
  assert.ok(Number.isFinite(defaultBudget), "harness declares the ordinary default budget");
  const budget = Number(source.match(/const canaryTimeoutMs\s*=\s*(\d+)\s*;/)?.[1]);
  assert.ok(budget > defaultBudget, "canary budget must exceed the harness default");
  assert.match(source, /test\("section 10 canary observes ten vulnerable sinks and protects ten signing paths",\s*\{skip:!canaryAvailable,timeout:canaryTimeoutMs\}/);
  return { budget, defaultBudget };
}

test("the canary declares and applies a larger budget and a short per-test timeout affects only its test", () => fixture(directory => {
  const source = readFileSync(path.join(root, "tests/wizard-w1-7.test.mjs"), "utf8");
  const { budget, defaultBudget } = assertCanaryBudget(source);
  // No file-level deadline: exercise a per-test timeout without racing startup
  // or depending on whether this Node version applies CLI timeouts to files.
  const file = path.join(directory, "budget.test.mjs");
  writeFileSync(file, `import test from "node:test";
import {setTimeout} from "node:timers/promises";
test("short per-test budget", {timeout:40}, async t => {await setTimeout(5000,null,{signal:t.signal});});
test("ordinary test after timeout", () => {});
`);
  const result = run('"$1" --test --test-reporter=tap "$2"', [process.execPath, file]);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /^not ok 1 - short per-test budget$/m);
  assert.match(result.stdout, /^ok 2 - ordinary test after timeout$/m);
  assert.match(result.stdout, /failureType: 'testTimeoutFailure'/);
  assert.match(result.stdout, /test timed out after 40ms/);
  assert.match(result.stdout, /^# pass 1$/m);
  assert.match(result.stdout, /^# tests 2$/m);
  console.log(`D1_CANARY_BUDGET declared_ms=${budget} default_ms=${defaultBudget} applied=t short_test=timed-out sibling=passed budget_ms=40`);
}));

test("the budget control rejects copied wizard sources with missing or default canary timeouts", () => fixture(directory => {
  const source = readFileSync(path.join(root, "tests/wizard-w1-7.test.mjs"), "utf8");
  const { defaultBudget } = assertCanaryBudget(source);
  const copy = path.join(directory, "wizard-copy.mjs");
  const mutants = [
    ["missing-option", source.replace(",timeout:canaryTimeoutMs", "")],
    ["default-budget", source.replace(/const canaryTimeoutMs=\d+;/, `const canaryTimeoutMs=${defaultBudget};`)],
    ["missing-declaration", source.replace(/const canaryTimeoutMs=\d+;/, "")],
  ];
  for (const [name, mutant] of mutants) {
    writeFileSync(copy, source);
    assertCanaryBudget(readFileSync(copy, "utf8"));
    assert.notEqual(mutant, source);
    writeFileSync(copy, mutant);
    assert.throws(() => assertCanaryBudget(readFileSync(copy, "utf8")), { code: "ERR_ASSERTION" });
    writeFileSync(copy, source);
    assertCanaryBudget(readFileSync(copy, "utf8"));
    console.log(`D1_CANARY_BUDGET_MUTATION ${name} baseline=0 applied=t control=1 restored=0 killed=t`);
  }
}));
