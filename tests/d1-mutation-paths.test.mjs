import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const harness = path.join(root, "scripts/run-d1-mutation-harness");
const four = ["CLI_ARGUMENT_REFUSAL", "EVENT_EXTENSION_CASE", "SITE_UNPUBLISHED_INSTALL_CLAIM", "PORT_WATCH_SHARED_ELIGIBILITY"];
const original = readFileSync(harness, "utf8");

function run(directory, source = harness, selected = four) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync("bash", ["-c", `
source "$1"
root_dir="$2"; mutation_dir="$3"
shift 3
d1_load_definitions "$root_dir" || exit 2
selected=()
for line in "\${MUTATIONS[@]}"; do
  for requested in "$@"; do
    if [ "\${line%%|*}" = "$requested" ]; then selected+=("$line"); fi
  done
done
MUTATIONS=("\${selected[@]}")
d1_accounting_init
d1_run_mutations
d1_summary
`, "mutation-paths", source, root, directory, ...selected], { cwd: root, encoding: "utf8", env, timeout: 120000 });
}

function expectKilled(result, selected = four) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const name of selected) {
    const line = result.stdout.split("\n").find(line => line.startsWith(`${name} `));
    assert.ok(line, `${name} must print an outcome`);
    assert.match(line, /baseline=0 applied=t after=[1-9]\d* /);
    assert.match(line, /forbidden=t restored=0$/);
    if (name === "EVENT_EXTENSION_CASE") assert.match(line, /verifier_forbidden=t cli_forbidden=t/);
  }
  assert.match(result.stdout, new RegExp(`executed=${selected.length} not_exercised=0 negative_control=0 expected_total=${selected.length}`));
  assert.doesNotMatch(result.stdout + result.stderr, /missing outcome|unknown outcome|duplicate outcome/);
}

function withDirectory(operation) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "d1-mutation-paths-"));
  try { operation(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
function mutant(directory, name, before, after) {
  assert.equal(original.split(before).length, 2, `${name} anchor must occur once`);
  const source = path.join(directory, `${name}.bash`);
  writeFileSync(source, original.replace(before, after));
  return source;
}

// Static guard complements runtime accounting: it covers outcome branches that
// this Docker-free control cannot execute. Diagnostics and name formatting are
// allowed; direct outcome prints are not.
function assertAccountingPath(source) {
  assert.doesNotMatch(source, /\b(?:printf|echo)\s+['"][^'"\n]*(?:baseline=|applied=|not-exercised |guarded=)/);
  const loop = source.split("d1_run_mutations(){")[1].split("\nd1_main(){")[0];
  for (const line of loop.split("\n").filter(line => /\bmake_\w+/.test(line))) {
    assert.match(line, /d1_mutate "\$\(d1_current_name\)" make_/, line);
  }
}

test("D1 real mutation paths kill all four and restore their actual baselines", () => withDirectory(directory => {
  const baseline = run(directory);
  expectKilled(baseline);
  assertAccountingPath(original);
  console.log(`D1_REV3_REAL_FOUR\n${baseline.stdout.trim()}`);
}));

test("D1 nonexistent anchor is a named, counted failing outcome through the real helper", () => withDirectory(directory => {
  const selected = ["CLI_ARGUMENT_REFUSAL"];
  expectKilled(run(directory, harness, selected), selected);
  const before = 'const anchor=\'  if (profile) for (const flag of Object.keys(out).filter((key) => key !== "_" && key !== "help")) if (!profile.has(flag)) argumentRefused(flag);\';';
  const source = mutant(directory, "absent-anchor", before, "const anchor='D1_NONEXISTENT_ANCHOR_REV3';");
  const result = run(directory, source, selected);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /^CLI_ARGUMENT_REFUSAL applied=f mutation_error=.*D1_NONEXISTENT_ANCHOR_REV3/m);
  assert.match(result.stderr, /anchor absent: D1_NONEXISTENT_ANCHOR_REV3/);
  assert.match(result.stdout, /executed=1 not_exercised=0 negative_control=0 expected_total=1/);
  assert.doesNotMatch(result.stderr, /missing outcome|unknown outcome|duplicate outcome/);
  assert.throws(() => expectKilled(result, selected), { code: "ERR_ASSERTION" });
  expectKilled(run(directory, harness, selected), selected);
  console.log(`D1_REV3_ABSENT_ANCHOR baseline=0 applied=t control=${result.status} restored=0 killed=t\n${result.stdout.trim()}`);
}));

test("D1 control kills an outcome printf bypass in the actual extension branch", () => withDirectory(directory => {
  const selected = ["EVENT_EXTENSION_CASE"];
  expectKilled(run(directory, harness, selected), selected);
  const source = mutant(directory, "printf-bypass", "d1_outcome 'EVENT_EXTENSION_CASE baseline=", "printf 'EVENT_EXTENSION_CASE baseline=");
  assert.throws(() => assertAccountingPath(readFileSync(source, "utf8")), { code: "ERR_ASSERTION" });
  const result = run(directory, source, selected);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /EVENT_EXTENSION_CASE baseline=0 applied=t after=1 verifier_forbidden=t cli_forbidden=t restored=0/);
  assert.match(result.stderr, /D1 missing outcome: EVENT_EXTENSION_CASE/);
  assert.match(result.stdout, /executed=0 not_exercised=0 negative_control=0 expected_total=1/);
  assert.throws(() => expectKilled(result, selected), { code: "ERR_ASSERTION" });
  expectKilled(run(directory, harness, selected), selected);
  console.log(`D1_REV3_PRINTF_BYPASS baseline=0 applied=t control=${result.status} restored=0 killed=t\n${result.stdout.trim()}\n${result.stderr.trim()}`);
}));

test("D1 failed helper names follow the expanded definition names", () => {
  const result = spawnSync("bash", ["-c", `source "$1"
name=unused
mutation=W1_8_G_PROPERTIES
for control in 3 13 14; do d1_current_name; echo; done
mutation=W1_1_OIDC_DURABLE_PROPERTIES; pattern=same-name; d1_current_name; echo
mutation=W1_1_OIDC_PROVIDER_PROPERTIES; pattern=discovery; d1_current_name; echo
mutation=W1_1_MANAGER_CRITERION5_DIFFERENT; d1_current_name; echo
mutation=W1_8_SOURCE_PROPERTIES; property=principal; d1_current_name; echo
`, "expanded-names", harness], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), ["W1_8_G3_G12", "W1_8_G13", "W1_8_G14", "W1_1_OIDC_DURABLE_SAME-NAME", "W1_1_OIDC_PROVIDER_DISCOVERY", "W1_1_MANAGER_DIFFERENT", "W1_8_LIVE_PRINCIPAL"]);
});
