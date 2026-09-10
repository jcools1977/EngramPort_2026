import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const harness = path.join(root, "scripts/run-d1-mutation-harness");
const original = readFileSync(harness, "utf8");
function fixture(operation) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "d1-agent-c-"));
  try { return operation(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
function bash(script, args) {
  const env = { ...process.env, D1_VARIANT_HELPER: path.join(root, "tests/helpers/d1-variant.mjs") };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync("bash", ["-c", script, "d1-agent-c-control", ...args], {
    cwd: root, env, encoding: "utf8", timeout: 90000, maxBuffer: 4 * 1024 * 1024,
  });
}
function runBranch(directory, { source = harness, missing = false } = {}) {
  return bash(`
source "$1"
root_dir="$2"; mutation_dir="$3"
d1_load_definitions "$root_dir" || exit 1
selected=()
for definition in "\${MUTATIONS[@]}"; do
  if [[ "$definition" = AGENT_C_* ]]; then selected+=("$definition"); fi
done
MUTATIONS=("\${selected[@]}")
if [ "$4" = true ]; then
  MUTATIONS=("\${MUTATIONS[0]}")
  eval "$(declare -f make_agent_c_variant | sed '1s/make_agent_c_variant/make_real_agent_c_variant/')"
  make_agent_c_variant(){
    make_real_agent_c_variant "$@" || return $?
    printf '\\nimport "./intentionally-missing-module.mjs";\\n' >> "$1"
  }
fi
d1_accounting_init
d1_run_mutations
d1_summary
`, [source, root, directory, String(missing)]);
}
function assertLoadFailure(result) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /AGENT_C_CREDENTIAL_REFERENCE mutant-load-failed baseline=0 applied=t after=1 error=.*ERR_MODULE_NOT_FOUND.*intentionally-missing-module/);
  assert.doesNotMatch(result.stdout, /forbidden=/);
  assert.match(result.stdout, /executed=1 not_exercised=0 negative_control=0 expected_total=1/);
  assert.match(result.stderr, /D1 mutation harness failed/);
}

test("agent-c builder derives adapter rewrites including a synthetic fourth import", () => fixture(directory => {
  const supervisorDir = path.join(directory, "packages/agent-c-supervisor/src");
  mkdirSync(supervisorDir, { recursive: true });
  const source = readFileSync(path.join(root, "packages/agent-c-supervisor/src/index.mjs"), "utf8");
  writeFileSync(path.join(supervisorDir, "index.mjs"), source + '\nimport "../../git-adapter/src/synthetic-fourth.mjs";\n');
  const target = path.join(directory, "variant.mjs");
  function build(builder) {
    const result = bash('source "$1"; root_dir="$2"; make_agent_c_variant "$3" credential-reference', [builder, directory, target]);
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(target, "utf8");
  }
  function assertRewritten(text) {
    assert.doesNotMatch(text, /["']\.\.\/\.\.\/git-adapter\/src\//);
    for (const name of ["credential-boundary", "verify-log", "bounded-context", "synthetic-fourth"]) {
      assert.ok(text.includes(pathToFileURL(path.join(directory, `packages/git-adapter/src/${name}.mjs`)).href), name);
    }
  }
  assertRewritten(build(harness));
  const writer = 'writeVariant(target,text,source,{"../../git-adapter/src/credential-boundary.mjs":boundary});';
  assert.equal(original.split(writer).length, 2);
  const oldBuilder = path.join(directory, "hand-kept-rewrites.bash");
  writeFileSync(oldBuilder, original.replace(writer, `fs.writeFileSync(target,text
    .replace("../../git-adapter/src/credential-boundary.mjs",pathToFileURL(boundary).href)
    .replace("../../git-adapter/src/verify-log.mjs",pathToFileURL(path.join(root,"packages/git-adapter/src/verify-log.mjs")).href));`));
  const oldText = build(oldBuilder);
  assert.match(oldText, /"\.\.\/\.\.\/git-adapter\/src\/bounded-context\.mjs"/);
  assert.throws(() => assertRewritten(oldText), { code: "ERR_ASSERTION" });
  assertRewritten(build(harness));
  console.log("D1_AGENT_C_REWRITES fourth-import=rewritten pre-fix-bounded-context=unrewritten baseline=0 applied=t control=1 restored=0 killed=t");
}));

test("agent-c missing module is named, counted, and fails the actual harness branch", () => fixture(directory => {
  const result = runBranch(directory, { missing: true });
  assertLoadFailure(result);
  console.log(result.stdout.trim());
  const before = 'load_error=$(sed -n \'s/^# AGENT_C_MUTANT_LOAD_FAILED //p\' "$log")';
  assert.equal(original.split(before).length, 2);
  const drifted = path.join(directory, "load-marker-drift.bash");
  writeFileSync(drifted, original.replace(before, 'load_error=""'));
  const mutant = runBranch(directory, { source: drifted, missing: true });
  assert.throws(() => assertLoadFailure(mutant), { code: "ERR_ASSERTION" });
  assert.match(mutant.stdout, /forbidden=f/);
  assertLoadFailure(runBranch(directory, { missing: true }));
  console.log("D1_AGENT_C_LOAD_CLASSIFICATION baseline=0 applied=t control=1 restored=0 killed=t");
}));

test("all declared agent-c mutants apply and produce per-case failures through the harness", () => fixture(directory => {
  const result = runBranch(directory);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const definitions = readFileSync(path.join(root, "tests/failure/d1-mutations.txt"), "utf8")
    .split("\n").filter(line => line.startsWith("AGENT_C_")).map(line => line.split("|")[0]);
  assert.ok(definitions.length >= 12);
  const outcomes = result.stdout.trim().split("\n").filter(line => line.startsWith("AGENT_C_"));
  assert.equal(outcomes.length, definitions.length);
  for (const name of definitions) {
    assert.ok(outcomes.includes(`${name} baseline=0 applied=t after=1 forbidden=t restored=0`), name);
    const branch = original.match(new RegExp(`${name}\\) pattern=([^;]+); marker=`));
    assert.ok(branch, name);
    const pattern = branch[1];
    const tap = readFileSync(path.join(directory, `agent-c-${pattern}.log`), "utf8");
    const failure = tap.match(new RegExp(`^not ok [0-9]+ - ${pattern}$`, "m"));
    assert.ok(failure, tap);
    assert.doesNotMatch(tap, /AGENT_C_MUTANT_LOAD_FAILED/);
    console.log(`${name} ${failure[0]}`);
  }
  assert.ok(result.stdout.includes(`executed=${definitions.length} not_exercised=0 negative_control=0 expected_total=${definitions.length}`));
  console.log(result.stdout.trim());
}));
