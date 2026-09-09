import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const temporary = mkdtempSync(path.join(os.tmpdir(), "f158-mutations-"));
const sourcePath = "packages/agent-c-supervisor/src/spend-ledger.mjs";
const baselineCommit = "955a9b60f148430c3582ccbaa9123661d38cd302";
const moduleFile = path.join(temporary, "ledger.mjs");
const gateUrl = pathToFileURL(path.join(root, "packages/agent-c-supervisor/src/spend-gate.mjs")).href;
const verifierUrl = pathToFileURL(path.join(root, "packages/git-adapter/src/verify-log.mjs")).href;
const source = readFileSync(path.join(root, sourcePath), "utf8")
  .replace('"../../git-adapter/src/verify-log.mjs"', JSON.stringify(verifierUrl))
  .replace('"./spend-gate.mjs"', JSON.stringify(gateUrl));
const acceptance = 'if (!(await verifyLog(base)).ok) return null; // F158_ACCEPTED_LOG';
const vouch = 'if (!references.has(`${relative}#sha256=${digest}`)) return null; // F158_VOUCHED_BYTES';
const mutations = [
  ["hide-directory-failure", "unreadable-root", [['throw error; // F158_UNREADABLE_ROOT', 'continue; // MUTATED']]],
  ["refuse-missing-root", "missing-root", [['if (error.code === "ENOENT") continue; // F158_MISSING_ROOT', 'if (error.code === "ENOENT") return null; // MUTATED']]],
  ["trust-unreferenced-file", "unreferenced-file", [[vouch, 'void digest; // MUTATED']]],
  // Both the whole-log verifier and the buffer check enforce digest integrity.
  // Remove both for this property mutation, leaving reference presence enforced.
  ["trust-altered-cost", "altered-bytes", [[acceptance, 'void verifyLog; // MUTATED'], [vouch, 'if (![...references].some((ref) => ref.startsWith(`${relative}#sha256=`))) return null; // MUTATED']]],
  ["trust-unaccepted-event", "invalid-event", [[acceptance, 'void verifyLog; // MUTATED']]],
  ["skip-buffer-digest", "post-verification-edit", [[vouch, 'void digest; // MUTATED']]],
  ["reread-cost-after-hashing", "same-buffer-cost", [['JSON.parse(bytes.toString("utf8"))', 'JSON.parse(await readFile(path.join(dir, name), "utf8"))']]],
  ["drop-root-cost", "valid-sum", [['return ticksSpentOn(rows, day);', 'return ticksSpentOn(rows.slice(0, 1), day);']]],
];
function run(name, preFix = false) {
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", "tests/agent-c-spend-ledger.test.mjs"], {
    cwd: root, encoding: "utf8", timeout: 30_000,
    env: { ...process.env, F158_LEDGER_MODULE: pathToFileURL(moduleFile).href, F158_CASE: name ?? "", F158_PRE_FIX: preFix ? "1" : "0" },
  });
}
function passed(result, label) {
  assert.equal(result.status, 0, `${label}\n${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /# fail 0/);
  console.log(`CONTROL ${label}=passed\n${result.stdout}`);
}
let executed = 0;
try {
  writeFileSync(moduleFile, source);
  passed(run(), "production");
  const prior = spawnSync("git", ["show", `${baselineCommit}:scripts/run-agent-c-review-service-account`], { cwd: root, encoding: "utf8" });
  assert.equal(prior.status, 0, prior.stderr);
  const start = prior.stdout.indexOf("async function spentTicksToday() {");
  const end = prior.stdout.indexOf("\nconst gate = decide({", start);
  assert.ok(start > 0 && end > start);
  // Execute the exact pre-fix function body with only its closed-over roots
  // supplied as a parameter. Never execute credential, notification or provider code.
  const oldFunction = prior.stdout.slice(start, end).replace("async function spentTicksToday()", "export async function spentTicksToday(spendRoots)");
  writeFileSync(moduleFile, `import { readdir, readFile } from "node:fs/promises";\nimport path from "node:path";\nimport { ticksSpentOn, utcDay } from ${JSON.stringify(gateUrl)};\n${oldFunction}`);
  passed(run(undefined, true), `pre-fix-${baselineCommit}`);
  const oldAgainstNew = run("unreadable-root");
  assert.equal(oldAgainstNew.status, 1, oldAgainstNew.stdout + oldAgainstNew.stderr);
  assert.match(oldAgainstNew.stdout, /ERR_ASSERTION/);
  console.log("PRE_FIX new-unreadable-control=failed-as-expected");
  for (const [name, testName, edits] of mutations) {
    let changed = source;
    for (const [before, after] of edits) {
      assert.equal(changed.split(before).length - 1, 1, `unique mutation target ${name}`);
      changed = changed.replace(before, after);
    }
    writeFileSync(moduleFile, changed);
    const result = run(testName);
    executed++;
    assert.equal(result.status, 1, `${name} survived or failed to run\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /ERR_ASSERTION/, `${name} must fail a behavioral assertion`);
    assert.match(result.stdout, /# tests 1\n/);
    console.log(`KILLED ${name} case=${testName} exit=${result.status}\n${result.stdout}`);
  }
  writeFileSync(moduleFile, source);
  passed(run(), "restoration");
  console.log(`SPEND_LEDGER_MUTATIONS executed=${executed} killed=${executed}`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
