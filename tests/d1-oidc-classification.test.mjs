import "./d1-mutation-paths.test.mjs";
import "./d1-accounting.test.mjs";
import "./d1-agent-c-mutations.test.mjs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const harness = path.resolve(import.meta.dirname, "../scripts/run-d1-mutation-harness");
const reason = "OIDC_RUNTIME_VERSION_REFUSED: synthetic Miniflare startup refusal";
const patterns = ["route", "same-name", "restart", "atomic", "expiry", "cleanup", "redaction"];

function fixture(operation) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "d1-oidc-classification-"));
  try { return operation(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function classify(directory, { source = harness, baselineOutputs, skipped = true, base = "0", applied = "t", after = "1", forbidden = "t", restored = "0", priorFail = "0", omitLast = false } = {}) {
  const synthetic = "TAP version 13\n" + patterns.map((pattern, index) =>
    `ok ${index + 1} - ${pattern}${skipped ? ` # SKIP ${reason}` : ""}\n`).join("");
  for (const pattern of patterns) writeFileSync(path.join(directory, `${pattern}.tap`), baselineOutputs?.[pattern] ?? synthetic);
  return spawnSync("bash", ["-c", `
source "$1"
MUTATIONS=("W1_1_OIDC_DURABLE_PROPERTIES|W1_1_OIDC_DURABLE_PROPERTIES|SELECT true")
d1_accounting_init
fail="\${10}"
for pattern in route same-name restart atomic expiry cleanup redaction; do
  if [ "$9" = true ] && [ "$pattern" = redaction ]; then continue; fi
  reason=$(d1_oidc_skip_reason "$3" "$2/$pattern.tap" "$pattern")
  d1_oidc_classify "$pattern" v26.5.0 "$reason" "$3" "$4" "$5" "$6" "$7"
  printf 'OUTCOME %s %s\\n' "$pattern" "$oidc_outcome"
done
d1_summary
rc=$?
printf 'STATE executed=%s not_exercised=%s fail=%s\\n' "$executed" "$not_exercised" "$fail"
exit "$rc"
`, "classification", source, directory, base, applied, after, forbidden, restored, "unused", String(omitLast), priorFail], { encoding: "utf8" });
}

function assertSkipped(result, expectedReason = reason) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  for (const pattern of patterns) {
    assert.ok(result.stdout.includes(`W1_1_OIDC_DURABLE_${pattern.toUpperCase()} not-exercised runtime=v26.5.0 reason=${expectedReason}\n`));
    assert.ok(result.stdout.includes(`OUTCOME ${pattern} not-exercised\n`));
  }
  assert.ok(result.stdout.includes("STATE executed=0 not_exercised=7 fail=0\n"));
  assert.doesNotMatch(result.stdout, /OUTCOME .* killed|baseline=/);
}

test("selected skipped baselines are loud, separately counted, and do not fail the harness", () => fixture(directory => {
  const result = classify(directory);
  assertSkipped(result);
  console.log(result.stdout.trim());
}));

test("a running baseline retains all original kill requirements", () => fixture(directory => {
  const result = classify(directory, { skipped: false });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes("W1_1_OIDC_DURABLE_REDACTION baseline=0 applied=t after=1 forbidden=t restored=0"));
  assert.equal((result.stdout.match(/OUTCOME .* killed/g) ?? []).length, 7);
  assert.ok(result.stdout.includes("STATE executed=7 not_exercised=0 fail=0"));
  console.log(result.stdout.trim());
  for (const alteration of [{ base: "1" }, { applied: "f" }, { after: "0" }, { forbidden: "f" }, { restored: "1" }]) {
    const refused = classify(directory, { skipped: false, ...alteration });
    assert.equal(refused.status, 1, JSON.stringify(alteration));
    assert.ok(refused.stdout.includes("STATE executed=7 not_exercised=0 fail=1"));
    assert.doesNotMatch(refused.stdout, /OUTCOME .* killed/);
  }
}));

test("skip classification preserves prior failures and refuses missing accounting", () => fixture(directory => {
  for (const alteration of [{ priorFail: "1" }, { omitLast: true }]) {
    const result = classify(directory, alteration);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /D1 mutation harness failed/);
  }
  const failedProcess = classify(directory, { base: "1" });
  assert.equal(failedProcess.status, 1);
  assert.ok(failedProcess.stdout.includes("STATE executed=7 not_exercised=0 fail=1"));
}));

test("skip parsing uses the selected test's actual TAP reason, not unrelated skips", () => fixture(directory => {
  const suite = path.join(directory, "synthetic.test.mjs");
  writeFileSync(suite, `import test from 'node:test';test('route',{skip:${JSON.stringify(reason)}},()=>{});test('redaction',()=>{});`);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const tap = spawnSync(process.execPath, ["--test", "--test-reporter=tap", suite], { encoding: "utf8", env });
  assert.equal(tap.status, 0, tap.stderr);
  const log = path.join(directory, "actual.tap");
  writeFileSync(log, tap.stdout);
  const result = spawnSync("bash", ["-c", 'source "$1"; d1_oidc_skip_reason 0 "$2" route; d1_oidc_skip_reason 0 "$2" redaction', "parser", harness, log], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${reason}\n`);
}));

test("real durable output crosses into the classifier and kills pre-fix and marker-drift readers", {
  skip: process.versions.node !== "26.5.0" ? "crossed runtime control requires actual Node 26.5.0" : false,
}, () => fixture(directory => {
  const root = path.resolve(import.meta.dirname, "..");
  const baselineOutputs = {};
  let expectedReason;
  for (const pattern of patterns) {
    const env = { ...process.env, W1_1_OIDC_DURABLE_MODULE_ROOT: root, W1_1_OIDC_DURABLE_CASE: pattern };
    delete env.NODE_TEST_CONTEXT;
    const args = ["--test", "--test-reporter=tap", "--test-timeout=10000", "tests/workspace-oidc-durable.test.mjs"];
    const actual = spawnSync(process.execPath, args, { cwd: root, env, encoding: "utf8", timeout: 20000 });
    assert.equal(actual.status, 0, actual.stdout + actual.stderr);
    baselineOutputs[pattern] = actual.stdout + actual.stderr;
    const markers = [...actual.stdout.matchAll(/^# OIDC_RUNTIME_SKIP runtime=Node 26\.5\.0 reason=(.+)$/gm)];
    assert.equal(markers.length, 1, baselineOutputs[pattern]);
    expectedReason = markers[0][1];
    console.log(`D1_OIDC_REAL_OUTPUT case=${pattern} command=node ${args.join(" ")} exit=${actual.status}\n${baselineOutputs[pattern].trim()}`);
  }
  // A skipped mutant also exits zero. No successful mutant execution is invented.
  const options = { baselineOutputs, after: "0", forbidden: "f" };
  const fixed = classify(directory, options);
  assertSkipped(fixed, expectedReason);
  console.log(`D1_OIDC_CROSSED_FIXED\n${fixed.stdout.trim()}`);

  const original = readFileSync(harness, "utf8");
  const runtimeBlock = original.match(/ {2}# The runtime gate[^]*? {2}fi\n/)?.[0];
  assert.ok(runtimeBlock, "pre-fix comparison must remove the runtime comment parser");
  const mutations = [
    ["pre-fix-classifier", original.replace(runtimeBlock, "")],
    ["reader-marker-drift", original.replace("# OIDC_RUNTIME_SKIP runtime=", "# OIDC_RUNTIME_DRIFT runtime=")],
  ];
  for (const [name, source] of mutations) {
    assert.notEqual(source, original, `${name} must alter the reader`);
    const mutant = path.join(directory, `${name}.bash`);
    writeFileSync(mutant, source);
    const result = classify(directory, { ...options, source: mutant });
    assert.throws(() => assertSkipped(result, expectedReason), { code: "ERR_ASSERTION" });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /STATE executed=7 not_exercised=0 fail=1/);
    assert.equal((result.stdout.match(/OUTCOME .* failed/g) ?? []).length, 7);
    console.log(`D1_OIDC_CROSSED_MUTANT ${name}\n${result.stdout.trim()}`);
    assertSkipped(classify(directory, options), expectedReason);
    console.log(`D1_OIDC_CROSSED_MUTATION ${name} baseline=0 applied=t control=1 restored=0 killed=t`);
  }
  const failedProcess = classify(directory, { ...options, base: "1" });
  assert.equal(failedProcess.status, 1);
  assert.match(failedProcess.stdout, /STATE executed=7 not_exercised=0 fail=1/);
  console.log("D1_OIDC_CROSSED_MUTATIONS executed=2 killed=2; only the seven selected definitions are accounted; no other executions are seeded");
}));

test("the control kills false execution, false kill, silent skip, and executed-only total mutations", () => fixture(directory => {
  const original = readFileSync(harness, "utf8");
  const mutations = [
    ["skip-counted-as-killed", "oidc_outcome=not-exercised", "oidc_outcome=killed"],
    ["skip-counted-as-executed", "not_exercised) not_exercised=$((not_exercised+1))", "not_exercised) executed=$((executed+1))"],
    ["silent-skip", "    d1_outcome 'W1_1_OIDC_DURABLE_%s not-exercised runtime=%s reason=%s\\n' \"${pattern^^}\" \"$runtime\" \"$reason\"", "    :"],
    ["skip-sets-failure", "oidc_outcome=not-exercised", "oidc_outcome=not-exercised; fail=1"],
    ["executed-only-total", '[ "$((executed+not_exercised+negative_control))" = "$expected_total" ]', '[ "$executed" = "$expected_total" ]'],
  ];
  for (const [name, before, after] of mutations) {
    assertSkipped(classify(directory));
    assert.equal(original.split(before).length, 2, `${name} must alter exactly one site`);
    const mutant = path.join(directory, `${name}.bash`);
    writeFileSync(mutant, original.replace(before, after));
    const result = classify(directory, { source: mutant });
    assert.throws(() => assertSkipped(result), { code: "ERR_ASSERTION" });
    assertSkipped(classify(directory));
    console.log(`D1_OIDC_CLASSIFICATION_MUTATION ${name} baseline=0 applied=t control=1 restored=0 killed=t`);
  }
  console.log(`D1_OIDC_CLASSIFICATION_MUTATIONS executed=${mutations.length} killed=${mutations.length}`);
}));
