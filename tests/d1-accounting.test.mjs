import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const harness = path.join(root, "scripts/run-d1-mutation-harness");
const boundPath = "artifacts/agent-a/d1-live-run-2-2026-09-09.md";
const boundDigest = "eb5ada7fa3ccd595064bf557aaefd367b15248414aebb7d97f45ec0e808b7337";
const bound = readFileSync(path.join(root, boundPath), "utf8");
assert.equal(createHash("sha256").update(bound).digest("hex"), boundDigest);
// The bound artifact provides an inventory, not full per-outcome result lines.
const names = bound.split("Names, sorted:\n```\n")[1].split("```")[0].trim().split("\n");
const skips = new Map([...bound.matchAll(/^(W1_1_OIDC_DURABLE_\S+) not-exercised (.+)$/gm)].map(match => [match[1], match[2]]));
assert.equal(new Set(names).size, names.length);
assert.equal(skips.size, 7);

function run(script, args = [], source = harness) {
  return spawnSync("bash", ["-c", `source "$1"\nd1_load_definitions "$2" || exit 2\nd1_accounting_init\n${script}`, "accounting", source, root, ...args], { encoding: "utf8" });
}
function withDirectory(operation) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "d1-accounting-"));
  try { return operation(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
const replay = `while IFS= read -r line; do d1_outcome '%s\\n' "$line"; done < "$3"
d1_summary`;
function boundInventory(directory) {
  const file = path.join(directory, "bound-inventory.txt");
  writeFileSync(file, names.map(name => skips.has(name)
    ? `${name} not-exercised ${skips.get(name)}`
    : `${name} inventory-only`).join("\n") + "\n");
  return file;
}
const completeInventory = `while IFS= read -r name; do
  d1_outcome '%s inventory-only\\n' "$name"
done < <(d1_definition_names)
d1_summary`;

function assertComplete(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const summary = result.stdout.match(/executed=(\d+) not_exercised=(\d+) negative_control=(\d+) expected_total=(\d+)/);
  assert.ok(summary, result.stdout);
  const [executed, skipped, negative, expected] = summary.slice(1).map(Number);
  assert.equal(executed + skipped + negative, expected);
  assert.equal(negative, 1);
  assert.equal(skipped, 0);
  return expected;
}

test("D1 accounting derives its inventory and refuses the bound live inventory mismatch", () => withDirectory(directory => {
  const result = run(replay, [boundInventory(directory)]);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /D1 unknown outcome: W1_1_MANAGER_RETENTION/);
  assert.match(result.stderr, /D1 missing outcome: PORT_WATCH_SHARED_ELIGIBILITY/);
  assert.match(result.stderr, /D1 missing outcome: SITE_UNPUBLISHED_INSTALL_CLAIM/);
  assert.equal((result.stderr.match(/D1 missing outcome:/g) ?? []).length, 2);
  assert.match(result.stdout, /executed=147 not_exercised=7 negative_control=1 expected_total=157/);
  console.log(`D1_BOUND_INVENTORY source=${boundPath} sha256=${boundDigest} names=${names.length} exit=${result.status}\n${result.stdout.trim().split("\n").at(-1)}\n${result.stderr.trim()}`);
  console.log("D1_BOUND_LIMIT inventory-only entries do not prove mutation success; no live db:test execution occurred");
}));

test("D1 accounting follows added definitions and property iterations without a literal total", () => {
  const baseline = run(completeInventory);
  const expected = assertComplete(baseline);
  const extended = run(`MUTATIONS+=("ADDED_CONTROL|ADDED_CONTROL|SELECT true")
d1_durable_patterns+=(added-property)
d1_accounting_init
${completeInventory}`);
  assert.equal(assertComplete(extended), expected + 2);
  console.log(`D1_DERIVED_ACCOUNTING baseline_total=${expected} extended_total=${expected + 2} baseline=0 extended=0; inventory replay only`);
  assert.doesNotMatch(readFileSync(harness, "utf8"), /\b156\b/);
});

test("D1 accounting kills skipped counters, omitted output accounting, NOOP omission, and duplicate masking", () => withDirectory(directory => {
  const original = readFileSync(harness, "utf8");
  const mutations = [
    ["drop-one-counter", "executed) executed=$((executed+1))", 'executed) if [ "$name" != G1 ]; then executed=$((executed+1)); fi'],
    ["drop-one-outcome", '  d1_seen[$name]=$state', '  [ "$name" != G1 ] || return 0\n  d1_seen[$name]=$state'],
    ["drop-noop-counter", "negative_control) negative_control=$((negative_control+1))", "negative_control) :"],
  ];
  let killed = 0;
  for (const [name, before, after] of mutations) {
    assertComplete(run(completeInventory));
    assert.equal(original.split(before).length, 2, `${name} applies once`);
    const source = path.join(directory, `${name}.bash`);
    writeFileSync(source, original.replace(before, after));
    const mutant = run(completeInventory, [], source);
    assert.equal(mutant.status, 1, mutant.stdout + mutant.stderr);
    assert.throws(() => assertComplete(mutant), { code: "ERR_ASSERTION" });
    if (name === "drop-one-outcome") assert.match(mutant.stderr, /D1 missing outcome: G1/);
    assertComplete(run(completeInventory));
    killed++;
    console.log(`D1_ACCOUNTING_MUTATION ${name} baseline=0 applied=t control=${mutant.status} restored=0 killed=t\n${mutant.stdout.trim().split("\n").at(-1)}`);
  }
  // Duplicate G1 cannot compensate for a missing G2 even when cardinality matches.
  const duplicate = run(`while IFS= read -r name; do
    [ "$name" != G2 ] || name=G1
    d1_outcome '%s inventory-only\\n' "$name"
  done < <(d1_definition_names)
  d1_summary`);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /D1 duplicate outcome: G1/);
  assert.match(duplicate.stderr, /D1 missing outcome: G2/);
  console.log(`D1_ACCOUNTING_MUTATIONS executed=${mutations.length} killed=${killed} survived=${mutations.length - killed}`);
}));

test("D1 prior NOOP and D4 branches demonstrate one omitted count, not two", () => {
  const prior = spawnSync("git", ["show", "1c388f8173dfa20eeef9972d145be073a37cfc0b:scripts/run-d1-mutation-harness"], { cwd: root, encoding: "utf8" });
  assert.equal(prior.status, 0, prior.stderr);
  // Pin the historical branch comparison to the handoff checkout.
  const current = readFileSync(harness, "utf8");
  const noop = source => source.split("\n").find(line => line.trim().startsWith('if [ "$name" = NOOP ]; then'));
  const d4 = source => source.match(/(?:printf|d1_outcome) 'D4_M8_ACTOR_CLASS baseline=[^\n]+\n[^\n]+/)[0];
  const fixed = run(`name=NOOP; base=0; after=0; applied=f; restored=0
d1_outcome '%s baseline=%s applied=%s after=%s restored=%s\\n' "$name" "$base" "$applied" "$after" "$restored"
${noop(current)}
printf 'NOOP_STATE executed=%s negative_control=%s\\n' "$executed" "$negative_control"
d4_base=1; d4_applied=t; d4_after=0; d4_forbidden=t
${d4(current)}
printf 'D4_STATE executed=%s negative_control=%s fail=%s\\n' "$executed" "$negative_control" "$fail"`);
  assert.equal(fixed.status, 0, fixed.stderr);
  assert.match(fixed.stdout, /NOOP_STATE executed=0 negative_control=1/);
  assert.match(fixed.stdout, /D4_STATE executed=1 negative_control=1 fail=0/);
  console.log(`D1_ACTUAL_BRANCHES_FIXED\n${fixed.stdout.trim()}`);
  assert.ok(prior.stdout.includes('[ "$((executed+not_exercised))" = 156 ]'));
  const observed = spawnSync("bash", ["-c", `executed=0; fail=0; name=NOOP; base=0; after=0
${noop(prior.stdout)}
printf 'NOOP_STATE executed=%s\\n' "$executed"
d4_base=1; d4_applied=t; d4_after=0; d4_forbidden=t
${d4(prior.stdout)}
printf 'D4_STATE executed=%s fail=%s\\n' "$executed" "$fail"`], { encoding: "utf8" });
  assert.equal(observed.status, 0, observed.stderr);
  assert.match(observed.stdout, /NOOP_STATE executed=0/);
  assert.match(observed.stdout, /D4_STATE executed=1 fail=0/);
  console.log(`D1_ACTUAL_BRANCHES_PRIOR\n${observed.stdout.trim()}`);
});
