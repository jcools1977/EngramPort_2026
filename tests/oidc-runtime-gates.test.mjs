import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { oidcRuntimeGate } from "./oidc-runtime-gate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const expected = "OIDC_RUNTIME_SKIP runtime=Node 26.5.0 reason=Miniflare startup aborts in InternalCallbackScope::Close (execution_async_id != 0) after asynchronous filesystem work; upstream defect identity unconfirmed; rerun on CI Node 22";
function assertLoudSkip(gate) {
  const lines = [];
  assert.equal(gate({ version: "26.5.0", emit: line => lines.push(line) }), false);
  assert.deepEqual(lines, [expected]);
}

test("known-bad OIDC runtime emits exactly one runtime and reason line", () => assertLoudSkip(oidcRuntimeGate));
test("other runtimes continue without a skip", () => {
  for (const version of ["22.13.0", "22.19.0", "26.4.0", "26.5.1", "26.6.0", "27.0.0"]) {
    assert.equal(oidcRuntimeGate({ version, emit: () => assert.fail(`unexpected skip on ${version}`) }), true);
  }
});
test("silent OIDC skip mutation is killed by the output control", async () => {
  const source = readFileSync(new URL("./oidc-runtime-gate.mjs", import.meta.url), "utf8");
  const anchor = source.split("\n").find(line => line.trimStart().startsWith("emit(`OIDC_RUNTIME_SKIP"));
  assert.ok(anchor);
  const mutant = await import(`data:text/javascript;base64,${Buffer.from(source.replace(anchor, "")).toString("base64")}`);
  assertLoudSkip(oidcRuntimeGate);
  assert.throws(() => assertLoudSkip(mutant.oidcRuntimeGate), { code: "ERR_ASSERTION" });
  assertLoudSkip(oidcRuntimeGate);
  console.log("OIDC_RUNTIME_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1");
});
test("durable entry point exits zero with one loud skip on Node 26.5.0", () => {
  if (process.versions.node !== "26.5.0") return;
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", "tests/workspace-oidc-durable.test.mjs"], {
    cwd: root, env, encoding: "utf8", timeout: 20000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const lines = result.stdout.split("\n").filter(line => line.includes("OIDC_RUNTIME_SKIP"));
  assert.equal(lines.length, 1, result.stdout);
  assert.equal(lines[0].replace(/^# /, ""), expected);
  assert.doesNotMatch(result.stdout + result.stderr, /OIDC_RUNTIME_VERSION_REFUSED|W1_1_OIDC_DURABLE/);
});
test("Node 22 CI explicitly invokes session tests including the durable entry point", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/verify-proof.yml"), "utf8");
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.match(workflow, /node-version: 22\s/);
  assert.match(workflow, /run: npm run session:test\s/);
  assert.ok(pkg.scripts["session:test"].split(" ").includes("tests/workspace-oidc-durable.test.mjs"));
});
