// Mutate disposable source copies. Accepted evidence and checkout bytes stay intact.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "identity-mutations-"));
const paths = ["tests/commit-identity.test.mjs", "tests/identity-control.mjs", "scripts/agent-commit", "docs/security/accepted-identity-mismatches.json", "docs/constraints.md"];
const original = new Map(paths.map((path) => [path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8")]));
let executed = 0;
let killed = 0;
let restored = 0;
const run = () => {
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", join(scratch, "tests/commit-identity.test.mjs")], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.signal, null, `unexpected signal: ${result.signal}`);
  return { status: result.status, output: result.stdout + result.stderr };
};
const helper = "tests/identity-control.mjs";
const removeLine = (marker) => (text) => {
  const lines = text.split("\n");
  assert.equal(lines.filter((line) => line.includes(marker)).length, 1, `mutation anchor ${marker}`);
  return lines.filter((line) => !line.includes(marker)).join("\n");
};
const mutants = [
  ["record-absent", "docs/security/accepted-identity-mismatches.json", () => "[]\n", /unrecorded signature\/author disagreement/],
  ...JSON.parse(original.get("docs/security/accepted-identity-mismatches.json")).map((entry) => [
    `remove-${entry.sha.slice(0, 7)}`, "docs/security/accepted-identity-mismatches.json",
    (text) => JSON.stringify(JSON.parse(text).filter((row) => row.sha !== entry.sha)), new RegExp(`unrecorded signature/author disagreement:[\\s\\S]*${entry.sha}`),
  ]),
  ["acceptance-disabled", helper, (text) => text.replace(" && !accepted.has(commit.sha)", ""), /unrecorded signature\/author disagreement/],
  ["unrecorded-disabled", helper, removeLine("assert.deepEqual(bad, []"), /Missing expected exception.*unrecorded/],
  ["existence-disabled", helper, (text) => text.replace('assert.fail(`identity record commit does not exist: ${entry.sha}`);', "continue;"), /Missing expected exception.*nonexistent/],
  ...["author", "signer", "date"].map((field) => [`${field}-disabled`, helper, removeLine(`assert.equal(entry.${field},`), new RegExp(`Missing expected exception.*${field}`)]),
  ["finding-disabled", helper, removeLine("assert.ok(constraints.split"), /Missing expected exception.*finding/],
  ["duplicate-disabled", helper, removeLine("assert.ok(!accepted.has"), /Missing expected exception.*duplicate/],
  ["fields-disabled", helper, removeLine("assert.deepEqual(Object.keys"), /Missing expected exception.*fields/],
  ["full-sha-disabled", helper, removeLine("assert.match(entry.sha"), /full-sha/],
  ["finding-format-disabled", helper, removeLine("assert.match(entry.finding"), /finding-format/],
  ["signature-disabled", helper, removeLine('assert.equal(commit.status, "G"'), /unverified/],
  ["mismatch-disabled", helper, removeLine("assert.notEqual(commit.author"), /not-mismatch/],
  ["history-disabled", helper, removeLine("assert.ok(history.some"), /outside-history/],
  ["foreign-key-guard-disabled", "scripts/agent-commit", (text) => text.replace("if ! key_binding_matches; then", "if false; then"), /foreign resolved key must refuse/],
];
try {
  for (const [path, text] of original) {
    mkdirSync(dirname(join(scratch, path)), { recursive: true });
    writeFileSync(join(scratch, path), text);
  }
  const baseline = run();
  assert.equal(baseline.status, 0, baseline.output);
  for (const [name, path, mutate, expected] of mutants) {
    const changed = mutate(original.get(path));
    assert.notEqual(changed, original.get(path), `unapplied mutation ${name}`);
    writeFileSync(join(scratch, path), changed);
    const after = run();
    executed++;
    assert.equal(after.status, 1, `${name}: ${after.output}`);
    assert.match(after.output, expected, `${name}: wrong failure`);
    assert.doesNotMatch(after.output, /SyntaxError|ERR_MODULE_NOT_FOUND/, `${name}: harness failure`);
    killed++;
    writeFileSync(join(scratch, path), original.get(path));
    const restoration = run();
    assert.equal(restoration.status, 0, restoration.output);
    restored++;
    console.log(`IDENTITY_MUTATION ${name} baseline=0 applied=true after=1 expected_failure=true restored=0`);
  }
  console.log(`IDENTITY_MUTATIONS executed=${executed} killed=${killed} restored=${restored}`);
} finally { rmSync(scratch, { recursive: true, force: true }); }
