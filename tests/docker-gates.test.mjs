import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { dockerGate } from "../scripts/docker-gate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const missing = { available: false, reason: "Docker endpoint unavailable: synthetic missing socket" };
const gates = ["w1-7:canary", "db:test", "d1:mutation", "kms:test"];
function assertSkipLines(gateFunction) {
  const lines = [];
  assert.equal(gateFunction(gates, { availability: missing, env: {}, emit: line => lines.push(line) }), false);
  assert.deepEqual(lines, gates.map(gate => `DOCKER_GATE_SKIP gate=${gate} reason=${missing.reason}`));
}

test("every absent Docker gate emits exactly one named reason", () => assertSkipLines(dockerGate));
test("CI and required Docker refuse missing endpoints without successful skips", () => {
  for (const env of [{ CI: "true" }, { ENGRAMPORT_REQUIRE_DOCKER: "1" }]) {
    assert.throws(() => dockerGate(gates, { availability: missing, env, emit: () => assert.fail("silent CI downgrade") }), /DOCKER_REQUIRED/);
  }
});
test("reachable Docker continues without skip output even in required mode", () => {
  assert.equal(dockerGate(gates, { availability: { available: true }, env: { CI: "true" }, emit: () => assert.fail("reachable gate skipped") }), true);
});
test("silent-skip mutation is killed by the same output control", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "docker-gate-mutation-"));
  try {
    const source = readFileSync(path.join(root, "scripts/docker-gate.mjs"), "utf8");
    const anchor = 'emit(`DOCKER_GATE_SKIP gate=${gate} reason=${availability.reason}`)';
    assert.ok(source.includes(anchor));
    const file = path.join(directory, "mutant.mjs");
    writeFileSync(file, source.replace(anchor, 'void gate'));
    const mutant = await import(pathToFileURL(file).href);
    assert.throws(() => assertSkipLines(mutant.dockerGate), { code: "ERR_ASSERTION" });
    assertSkipLines(dockerGate);
    console.log("DOCKER_GATE_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test("Docker-free D1 controls run in the npm test chain before docker:test", () => {
  const { scripts } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const chain = scripts.test.split(" && ");
  const controls = chain.indexOf("npm run d1:controls:test");
  assert.ok(controls >= 0 && controls < chain.indexOf("npm run docker:test"));
  assert.equal(scripts["d1:controls:test"], "node --test tests/d1-oidc-classification.test.mjs");
  const classification = readFileSync(path.join(root, "tests/d1-oidc-classification.test.mjs"), "utf8");
  for (const name of ["d1-accounting", "d1-mutation-paths"]) assert.ok(classification.includes(`import "./${name}.test.mjs";`));
  assert.doesNotMatch(readFileSync(path.join(root, "scripts/run-db-tests"), "utf8"), /d1-(?:oidc-classification|accounting|mutation-paths)\.test\.mjs/);
});
test("real entry points skip loudly locally, refuse in CI, and continue when Docker responds", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "docker-gate-entry-"));
  const env = { ...process.env, CI: "", ENGRAMPORT_REQUIRE_DOCKER: "", PATH: `${directory}:${process.env.PATH}`, ENGRAMPORT_DB_TEST_LOCK_PATH: path.join(directory, "db.lock") };
  delete env.NODE_TEST_CONTEXT;
  delete env.ENGRAMPORT_DB_TEST_LOCK_OWNER;
  try {
    writeFileSync(path.join(directory, "docker"), '#!/bin/sh\nif [ "$1" = info ]; then echo "synthetic missing socket" >&2; exit 1; fi\necho UNEXPECTED_DOCKER_EXECUTION >&2\nexit 42\n', { mode: 0o755 });
    const commands = [
      ["bash", ["scripts/run-db-tests"], ["db:test"]],
      ["bash", ["scripts/run-d1-mutation-harness"], ["d1:mutation"]],
      ["bash", ["scripts/run-kms-tests"], ["kms:test"]],
      [process.execPath, ["--test", "tests/wizard-w1-7.test.mjs"], ["w1-7:canary"]],
    ];
    for (const [command, args, expected] of commands) {
      const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", timeout: 20000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const lines = result.stdout.split("\n").filter(line => line.includes("DOCKER_GATE_SKIP"));
      assert.equal(lines.length, expected.length, result.stdout);
      for (const gate of expected) assert.ok(lines.some(line => line.includes(`gate=${gate} reason=Docker endpoint unavailable: synthetic missing socket`)));
      const required = spawnSync(command, args, { cwd: root, env: { ...env, CI: "true" }, encoding: "utf8", timeout: 20000 });
      assert.notEqual(required.status, 0);
      assert.match(required.stdout + required.stderr, /DOCKER_REQUIRED/);
    }
    // Exercise the unchanged execution path without pretending this runs containers.
    writeFileSync(path.join(directory, "docker"), '#!/bin/sh\nif [ "$1" = info ]; then echo synthetic-version; exit 0; fi\necho DOCKER_EXECUTION_REACHED >&2\nexit 42\n');
    for (const [command, args] of commands.filter(([, args]) => !args.includes("scripts/run-d1-mutation-harness"))) {
      const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", timeout: 20000 });
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /DOCKER_EXECUTION_REACHED/);
      assert.doesNotMatch(result.stdout + result.stderr, /DOCKER_GATE_SKIP/);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
