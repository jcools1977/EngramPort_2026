import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { dockerGate } from "../scripts/docker-gate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const missing = { available: false, reason: "Docker endpoint unavailable: synthetic missing socket" };
const gates = ["w1-7:canary", "db:test", "d1:mutation", "kms:test"];
// Isolate the runner's bundle precondition from the workspace build. The empty
// module is a presence fixture only; synthetic Docker stops before any SQL/test.
function dbRunnerFixture(directory, source = readFileSync(path.join(root, "scripts/run-db-tests"), "utf8")) {
  // Canonicalize macOS /var -> /private/var so the gate's direct-entry URL matches.
  const fixture = path.join(realpathSync(directory), "db-runner");
  mkdirSync(path.join(fixture, "scripts"), { recursive: true });
  for (const file of ["docker-gate.mjs", "db-test-lock"]) {
    writeFileSync(path.join(fixture, "scripts", file), readFileSync(path.join(root, "scripts", file)));
  }
  const runner = path.join(fixture, "scripts/run-db-tests");
  writeFileSync(runner, source);
  return { runner, dist: path.join(fixture, "packages/sdk/dist") };
}

test("database runner refuses an absent SDK before Docker and continues with a present bundle", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "db-sdk-precondition-"));
  const source = readFileSync(path.join(root, "scripts/run-db-tests"), "utf8");
  const trace = path.join(directory, "docker.trace");
  const env = { ...process.env, CI: "true", ENGRAMPORT_REQUIRE_DOCKER: "1", PATH: `${directory}:${process.env.PATH}`,
    ENGRAMPORT_DB_TEST_LOCK_PATH: path.join(directory, "db.lock"), DB_SDK_TRACE: trace };
  delete env.ENGRAMPORT_DB_TEST_LOCK_OWNER;
  try {
    writeFileSync(path.join(directory, "docker"), `#!/bin/sh
echo "$*" >> "$DB_SDK_TRACE"
if [ "$1" = info ]; then echo synthetic-version; exit 0; fi
echo DOCKER_EXECUTION_REACHED >&2
exit 42
`, { mode: 0o755 });
    function observe(candidate) {
      const { runner, dist } = dbRunnerFixture(directory, candidate);
      rmSync(dist, { recursive: true, force: true });
      rmSync(trace, { force: true });
      const run = () => spawnSync("bash", [runner], { cwd: directory, env, encoding: "utf8", timeout: 20000 });
      const absent = run();
      assert.equal(absent.error, undefined);
      assert.equal(absent.status, 1);
      assert.equal(absent.stdout, "");
      assert.equal(absent.stderr, "SDK_BUNDLE_REQUIRED: packages/sdk/dist/index.mjs missing; run npm run build --prefix packages/sdk from the repository root\n");
      assert.equal(existsSync(trace), false, "missing SDK must refuse before any Docker call");
      assert.equal(existsSync(env.ENGRAMPORT_DB_TEST_LOCK_PATH), false);
      mkdirSync(dist, { recursive: true });
      writeFileSync(path.join(dist, "index.mjs"), "export {};\n");
      const present = run();
      assert.equal(present.error, undefined);
      assert.equal(present.status, 42);
      assert.match(present.stderr, /DOCKER_EXECUTION_REACHED/);
      assert.doesNotMatch(present.stdout + present.stderr, /SDK_BUNDLE_REQUIRED|DOCKER_GATE_SKIP/);
      const calls = readFileSync(trace, "utf8").trim().split("\n");
      assert.equal(calls[0], "info --format {{.ServerVersion}}");
      assert.ok(calls.some(line => line.endsWith(" up -d --wait")), "present bundle reaches synthetic compose up");
    }
    observe(source);
    const anchor = '[[ ! -f "$root_dir/packages/sdk/dist/index.mjs" ]]';
    assert.ok(source.includes(anchor));
    assert.throws(() => observe(source.replace(anchor, "false")), { code: "ERR_ASSERTION" });
    assert.throws(() => observe(source.replace(anchor, "true")), { code: "ERR_ASSERTION" });
    observe(source);
    console.log("DB_SDK_PRECONDITION absent=one-line-refusal docker-calls=0 present=synthetic-compose-up removed-check=killed always-refuse=killed restored=passed");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("Actions builds the SDK before requiring Docker gates", () => {
  const source = readFileSync(path.join(root, ".github/workflows/verify-proof.yml"), "utf8");
  function check(workflow) {
    const build = workflow.indexOf("        run: npm run build --prefix packages/sdk\n");
    const gates = workflow.indexOf("      - name: Require Docker gates\n");
    assert.ok(build >= 0 && gates > build, "SDK build must precede Docker gates");
    assert.match(workflow.slice(0, build), /Actions run 34371411859/);
  }
  check(source);
  const step = "      - name: Build SDK bundle for Docker gates\n        run: npm run build --prefix packages/sdk\n";
  assert.ok(source.includes(step));
  assert.throws(() => check(source.replace(step, "")), { code: "ERR_ASSERTION" });
  assert.throws(() => check(source.replace(step, "") + step), { code: "ERR_ASSERTION" });
  check(source);
  console.log("SDK_WORKFLOW_ORDER baseline=passed missing-build=killed late-build=killed restored=passed");
});

// Keep the shim in step with the fixture's listed preconditions. This gate control
// answers core_pattern, then stops at cleanup inventory, before host/container
// preflight or any sink. Review new probes and the stopping point before updating
// this digest. Pin the entire setup prefix so later preflight additions also fail.
function assertCanaryPreconditionsReviewed(source) {
  const end = source.indexOf("    const vulnerableLanding=");
  assert.ok(end > 0, "canary precondition boundary moved; review the Docker shim");
  assert.equal(createHash("sha256").update(source.slice(0, end)).digest("hex"),
    "a4189421cbb3aa7c4cb4d44a56f17df9947c022eb7fb78e601d54ebaf35f8c32",
    "canary preconditions changed; keep the Docker shim in step with the fixture list");
}

test("canary shim requires review when the fixture adds an unanswered precondition", () => {
  const source = readFileSync(path.join(root, "tests/helpers/w1-7-canary-fixture.mjs"), "utf8");
  assertCanaryPreconditionsReviewed(source);
  const anchor = '  const dump=path.join(directory,"host-preflight");';
  assert.ok(source.includes(anchor));
  const mutant = source.replace(anchor, `${anchor}\n  await run("docker", ["run", "--rm", "--entrypoint", "cat", coreImage, "/proc/sys/kernel/new_probe"]);`);
  assert.throws(() => assertCanaryPreconditionsReviewed(mutant), /canary preconditions changed/);
  assert.throws(() => assertCanaryPreconditionsReviewed(source.replace("// Host preconditions,", "// New Docker probe required.\n// Host preconditions,")), /canary preconditions changed/);
  assertCanaryPreconditionsReviewed(source);
  console.log("DOCKER_SHIM_CONTRACT baseline=passed added-probe=killed changed-list=killed restored=passed");
});
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
    const { runner, dist } = dbRunnerFixture(directory);
    mkdirSync(dist, { recursive: true });
    writeFileSync(path.join(dist, "index.mjs"), "export {};\n");
    writeFileSync(path.join(directory, "docker"), '#!/bin/sh\nif [ "$1" = info ]; then echo "synthetic missing socket" >&2; exit 1; fi\necho UNEXPECTED_DOCKER_EXECUTION >&2\nexit 42\n', { mode: 0o755 });
    const commands = [
      ["bash", [runner], ["db:test"]],
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
    for (const [command, args] of commands.filter(([, , expected]) => expected.includes("db:test") || expected.includes("kms:test"))) {
      const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", timeout: 20000 });
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /DOCKER_EXECUTION_REACHED/);
      assert.doesNotMatch(result.stdout + result.stderr, /DOCKER_GATE_SKIP/);
    }
    // Precondition errors intentionally sanitize Docker stderr. Observe the shim
    // directly so its execution marker survives without changing fixture errors.
    const trace = path.join(directory, "canary-docker.trace");
    const shim = `#!/bin/sh
if [ "$1" = info ]; then echo synthetic-version; exit 0; fi
if [ "$#" -eq 6 ] && [ "$1" = run ] && [ "$2" = --rm ] && [ "$3" = --entrypoint ] && [ "$4" = cat ] && [ "$5" = pgvector/pgvector:pg16 ] && [ "$6" = /proc/sys/kernel/core_pattern ]; then
  echo CORE_PATTERN_ANSWERED >> "$DOCKER_GATE_TRACE"
  echo core
  exit 0
fi
if [ "$*" = 'ps -aq' ] || [ "$*" = 'volume ls -q' ]; then
  echo "DOCKER_EXECUTION_REACHED $*" >> "$DOCKER_GATE_TRACE"
  echo DOCKER_EXECUTION_REACHED >&2
  exit 42
fi
echo UNANSWERED_DOCKER_PROBE >> "$DOCKER_GATE_TRACE"
exit 43
`;
    function canaryContinuation(source) {
      writeFileSync(path.join(directory, "docker"), source);
      writeFileSync(trace, "");
      const result = spawnSync(process.execPath, ["--test", "tests/wizard-w1-7.test.mjs"], {
        cwd: root, env: { ...env, W1_7_CASE: "canary", DOCKER_GATE_TRACE: trace }, encoding: "utf8", timeout: 20000,
      });
      assert.equal(result.error, undefined);
      assert.notEqual(result.status, 0);
      const output = result.stdout + result.stderr;
      assert.doesNotMatch(output, /DOCKER_GATE_SKIP/);
      assert.match(output, /W1_7_CANARY_CLEANUP_INVENTORY/);
      assert.deepEqual(readFileSync(trace, "utf8").trim().split("\n").sort(), [
        "CORE_PATTERN_ANSWERED", "DOCKER_EXECUTION_REACHED ps -aq", "DOCKER_EXECUTION_REACHED volume ls -q",
      ]);
    }
    canaryContinuation(shim);
    // Removing the new answer reproduces the old precondition failure and must
    // fail the same continuation assertions. Restore and exercise them again.
    assert.throws(() => canaryContinuation(shim.replace("  echo core\n  exit 0", "  exit 42")), /W1_7_CANARY_CLEANUP_INVENTORY/);
    canaryContinuation(shim);
    console.log("DOCKER_SHIM_CONTINUATION core_pattern=answered inventory=execution-reached missing-answer=killed restored=passed scope=synthetic");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
