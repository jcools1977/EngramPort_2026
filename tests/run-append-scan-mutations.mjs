import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = process.env.F156_SOURCE_ROOT ?? root;
const temporary = mkdtempSync(path.join(tmpdir(), "f156-mutations-"));
const core = "packages/git-adapter/src/event-core.mjs";
const boundary = "packages/git-adapter/src/credential-boundary.mjs";
const supervisor = "packages/agent-c-supervisor/src/index.mjs";
const limitChange = [boundary, "export const MAX_CONTEXT_BYTES = 1_000_000;", "export const MAX_CONTEXT_BYTES = 100_000;"];
function replace(file, before, after) {
  const filename = path.join(temporary, file);
  const source = readFileSync(filename, "utf8");
  assert.equal(source.split(before).length - 1, 1, `unique mutation target: ${file} ${before}`);
  writeFileSync(filename, source.replace(before, after));
}
function reset() {
  for (const dir of ["packages/git-adapter/src", "packages/agent-c-supervisor/src"]) cpSync(path.join(sourceRoot, dir), path.join(temporary, dir), { recursive: true });
}
function run(name) {
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", "tests/append-scan-policy.test.mjs"], {
    cwd: root, encoding: "utf8", timeout: 60_000,
    env: { ...process.env, F156_SOURCE_ROOT: temporary, ...(name ? { F156_CASE: name } : {}) }
  });
}
function expectPass(result, label) {
  assert.equal(result.status, 0, `${label}\n${result.stdout}${result.stderr}`);
  console.log(`CONTROL ${label}=passed`);
}
const mutations = [
  ["old-default", "clean-large-artifact", [core, "{ maxBytes: MAX_CONTEXT_BYTES, rawStringBytes: true }", "{}"]],
  ["size-as-credential", "artifact-size", [core, 'appendError("SCAN_INPUT_TOO_LARGE",', 'appendError("CREDENTIAL_INPUT_REFUSED",']],
  ["missing-byte-count", "artifact-size", [core, "error.bytes = finding.bytes;", "error.bytes = 0;"]],
  ["missing-limit", "artifact-size", [core, "error.limit = finding.limit;", "error.limit = 0;"]],
  ["artifact-scan-removed", "artifact-credential", [core, 'scanAppendInput(artifact, "artifact");', 'void artifact;']],
  ["body-scan-removed", "body-credential", [core, 'scanAppendInput(body, "event body");', 'void body;']],
  ["envelope-scan-removed", "envelope-credential", [core, 'if (envelope) scanAppendInput(envelope, "event envelope");', 'void envelope;']],
  ["scan-truncated", "artifact-credential", [core, "detectCredential(value, {", "detectCredential(value.slice(0, 65536), {"]],
  ["serialized-instead-of-utf8", "utf8-and-escaping", [core, "rawStringBytes: true", "rawStringBytes: false"]],
  ["body-size-bypassed", "body-size", [core, 'scanAppendInput(body, "event body");', 'if (Buffer.byteLength(body) <= MAX_CONTEXT_BYTES) scanAppendInput(body, "event body");']],
  ["envelope-size-bypassed", "envelope-size", [core, 'if (envelope) scanAppendInput(envelope, "event envelope");', 'if (envelope && Buffer.byteLength(JSON.stringify(envelope)) <= MAX_CONTEXT_BYTES) scanAppendInput(envelope, "event envelope");']],
  ["append-restates-limit", "artifact-size", [core, "maxBytes: MAX_CONTEXT_BYTES", "maxBytes: 1_000_000"], limitChange],
  ["supervisor-restates-limit", "supervisor-shared-limit", [supervisor, '"CREDENTIAL_CONTEXT_REFUSED", {}, { maxBytes: MAX_CONTEXT_BYTES, rawStringBytes: true }', '"CREDENTIAL_CONTEXT_REFUSED", {}, { maxBytes: 1_000_000, rawStringBytes: true }'], limitChange],
  ["supervisor-truncated", "supervisor-credential", [supervisor, 'assertNoCredential(prompt, this.credential,', 'assertNoCredential(prompt.slice(0, 65536), this.credential,']],
  ["supervisor-size-details-lost", "supervisor-shared-limit", [supervisor, "this.bytes = bytes;", "this.bytes = 0;"]],
];
let executed = 0;
try {
  reset();
  expectPass(run(), "production");
  replace(...limitChange);
  expectPass(run(), "shared-limit-lowered-to-100000");
  // Execute the exact pre-fix event-core from the handoff's starting commit.
  reset();
  const before = spawnSync("git", ["show", "6ecdd5703b88b88a4cde78f237b07bbf992f3e18:packages/git-adapter/src/event-core.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(before.status, 0, before.stderr);
  writeFileSync(path.join(temporary, core), before.stdout);
  const historical = run("clean-large-artifact");
  assert.notEqual(historical.status, 0);
  assert.match(historical.stdout, /not ok \d+ - clean-large-artifact/);
  assert.match(historical.stdout, /CREDENTIAL_INPUT_REFUSED: artifact refused/);
  console.log("OBSERVED pre-fix event-core clean artifact refused=CREDENTIAL_INPUT_REFUSED");
  for (const [name, control, ...changes] of mutations.filter(([, control]) => process.env.F156_APPEND_ONLY !== "1" || !control.startsWith("supervisor-"))) {
    reset();
    for (const change of changes) replace(...change);
    const result = run(control);
    assert.equal(result.signal, null, `${name} did not finish`);
    assert.notEqual(result.status, 0, `${name} survived`);
    assert.match(result.stdout, new RegExp(`not ok \\d+ - ${control}`), `${name} failed for another reason\n${result.stdout}${result.stderr}`);
    executed++;
    console.log(`F156_MUTATION ${name}=killed control=${control} executed=${executed}`);
  }
  console.log(`F156_MUTATIONS executed=${executed} killed=${executed} survived=0`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
