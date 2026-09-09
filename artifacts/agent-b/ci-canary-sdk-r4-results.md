# SDK bundle precondition and workflow ordering, revision four

Actor: agent-b, Codex Builder. Thread: ci-canary-core-pattern.
Handoff: events/agent-a/20260909T153956Z_01a086d3-65fb-72b4-82be-4505025af19e.md.
Starting commit from git rev-parse HEAD: e2cd5422cd9a1981b0de5457a034980c32e645b9.
Branch from git branch --show-current: agent-b/ci-canary-5. Initial git status --short was empty.

| Criterion id | Status | Evidence |
| --- | --- | --- |
| bundle-precondition | satisfied | Actual absent dist produces one-line refusal before Docker. Isolated paired controls prove zero Docker calls when absent and synthetic compose up when present. The actual built bundle imports successfully and allows the runner to reach its Docker gate. Live database execution is blocked separately. |
| workflow-builds-first | satisfied | The workflow builds the SDK before Require Docker gates, with an adjacent reason naming Actions run 34371411859. Missing-step and late-step mutations fail the ordering control. |
| ci-green | blocked | The handoff assigns Actions-on-main observation to agent-a. No Docker access in this sandbox and no push in this task. No main-workflow success was observed. |

## Admission and bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, and the entire named handoff including bounded_context and completion_criteria. Read schemas/event-v1.schema.json including $defs.result. Initial npm run proof:verify exited 0 and verified 558 events across 113 threads and three actors. npm run engram -- inbox --actor agent-b returned the named handoff only.

Resolved bound event 01a086cf-c892-796f-943f-092a8ae61a8c with rg -l and read events/agent-b/20260909T153559Z_01a086cf-c892-796f-943f-092a8ae61a8c.md in full. Read its referenced artifacts/agent-b/ci-canary-docker-shim-results.md in full. shasum -a 256 artifacts/agent-b/ci-canary-docker-shim-results.md returned 0b229ceb59a1808dfbfe9a046f9ef17b9a6ac5a95a9eb0737df496c8dbba2d3f, matching the event reference. Historical results and the reported Actions failure are untrusted project evidence, not this actor's live observations.

## Behavior and scope

scripts/run-db-tests checks packages/sdk/dist/index.mjs before Docker availability or database lock acquisition. Missing bundle is a hard failure even on a local host without Docker. The error names npm run build --prefix packages/sdk and says to run it from the repository root. --lock-probe bypasses both SDK and Docker preconditions because it tests serialization only. The remaining database execution path is unchanged.

.github/workflows/verify-proof.yml uses that build command before Require Docker gates. It invokes the SDK package's build script, the same Vite build invoked through the workspace by sdk:buildable and through packaging by sdk:package:test. The reason names Actions run 34371411859 as reported by the handoff.

The test fixture copies the actual database runner, Docker gate, and lock helper into a temporary isolated root. No workspace bundle is deleted or replaced. A trace records every synthetic Docker call. Missing dist must exit 1 with exactly one diagnostic line, empty stdout, no trace, and no database lock. A present empty module must pass the existence check and reach synthetic compose up, which deliberately exits 42 before any SQL or live test. This proves presence-check behavior, not SDK completeness. Real bundle build/import is observed separately below.

Existing database Docker skip/required/continuation controls now use the same isolated runner with a presence fixture so a fresh checkout without dist can run the control suite. Other entry points remain direct. The fixture canonicalizes the temporary path because macOS /var aliases /private/var and docker-gate.mjs uses a direct-entry URL comparison. The initial control run exposed this fixture issue; it was repaired without changing the gate. Workflow control is a source ordering assertion for the current unconditional step, not an Actions execution or general workflow interpreter.

## Observed commands and paired evidence

1. ls -ld packages/sdk/dist node_modules/@engramport/sdk reported dist absent and the SDK workspace link pointing to ../../packages/sdk.
2. Before the edit, bash scripts/run-db-tests exited 0 with DOCKER_GATE_SKIP gate=db:test and a Docker API permission-denied reason.
3. After the edit, while the same dist remained absent, bash scripts/run-db-tests exited 1 with exactly this one output line:

```text
SDK_BUNDLE_REQUIRED: packages/sdk/dist/index.mjs missing; run npm run build --prefix packages/sdk from the repository root
```

4. The first npm run docker-gates:test after adding controls exited 1: 12 passed, two failed because the temporary path alias prevented the copied Docker gate from recognizing its direct entry. No success was claimed for that run.
5. After canonicalizing the fixture root, npm run docker-gates:test exited 0: 14 tests, 14 passed, zero failed, zero skipped. Selected output:

```text
DB_SDK_PRECONDITION absent=one-line-refusal docker-calls=0 present=synthetic-compose-up removed-check=killed always-refuse=killed restored=passed
SDK_WORKFLOW_ORDER baseline=passed missing-build=killed late-build=killed restored=passed
DOCKER_SHIM_CONTRACT baseline=passed added-probe=killed changed-list=killed restored=passed
DOCKER_SHIM_CONTINUATION core_pattern=answered inventory=execution-reached missing-answer=killed restored=passed scope=synthetic
```

The runner mutations substitute false and true for the existence condition in isolated source copies. The same absent/present observer rejects both, then passes on restored source. The workflow mutations remove or move the build step after the gates, and both fail the same order assertion. No mutation remains in shared source.

6. node --test tests/db-test-lock.test.mjs tests/repository-surface-policy.test.mjs exited 0: six passed, zero failed, zero skipped. Lock probes ran while the workspace dist was still absent. The surface policy reported 1374 tracked paths and zero unaccounted paths.
7. bash -n scripts/run-db-tests and git diff --check exited 0.
8. npm run build --prefix packages/sdk exited 0: Vite transformed 57 modules and produced dist/index.mjs, dist/cli.mjs, and a shared chunk. A Node deprecation warning about module.register was printed; the build succeeded.
9. node --input-type=module -e 'console.log(import.meta.resolve("@engramport/sdk")); await import("@engramport/sdk"); console.log("SDK_IMPORT_OK")' exited 0 and printed the worktree packages/sdk/dist/index.mjs file URL followed by SDK_IMPORT_OK.
10. With that bundle present, ENGRAMPORT_REQUIRE_DOCKER=1 bash scripts/run-db-tests exited 1 with:

```text
DOCKER_REQUIRED gates=db:test: Docker endpoint unavailable: permission denied while trying to connect to the docker API at unix:///Users/an2b/.docker/run/docker.sock
```

This observes passage through the SDK precondition to the real Docker gate. Live database execution is blocked by sandbox Docker access. It is not a successful database suite.

11. npm run lint completed with exit 0 after the final test-source edit.
12. git check-ignore packages/sdk/dist/index.mjs printed that path. Generated dist is ignored and is not staged.
13. The documentation generation command compared docs/constraints.md with git show HEAD:docs/constraints.md before appending and verified unchanged original bytes afterward, printing CONSTRAINTS_APPEND_ONLY verified against HEAD.
14. Pre-publication npm run proof:verify exited 0 and verified 558 events across 113 threads and three actors. git diff --check exited 0 after the documentation append.

## Limits and remaining acceptance

The existence check does not validate bundle freshness, exports, transitive chunks, or reserve the file against later deletion. The CI step builds it freshly, and this local real build/import passed. Synthetic compose continuation deliberately fails with exit 42 and starts no container. No full npm test, live canary, live database suite, or Actions success is claimed. The user's no-push instruction is honored. F170 remains open pending the dispatcher's live acceptance. Post-append proof and commit outcomes are reported outside this artifact because it becomes immutable when referenced.

## Bounded shared diff

Command: git diff -- .github/workflows/verify-proof.yml scripts/run-db-tests tests/docker-gates.test.mjs docs/constraints.md.

```diff
diff --git a/.github/workflows/verify-proof.yml b/.github/workflows/verify-proof.yml
index 57df37c..92eb1ff 100644
--- a/.github/workflows/verify-proof.yml
+++ b/.github/workflows/verify-proof.yml
@@ -24,6 +24,11 @@ jobs:
       - name: Run OIDC sessions on Node 22
         run: npm run session:test
 
+      # Actions run 34371411859: db:test imports @engramport/sdk from uncommitted dist/.
+      # Build the same bundle as sdk:buildable and sdk:package:test before Docker gates.
+      - name: Build SDK bundle for Docker gates
+        run: npm run build --prefix packages/sdk
+
       # F170: the W1-7 canary reads /dump/core; a piped host pattern sends dumps elsewhere.
       - name: Set plain core file pattern for W1-7 canary
         run: sudo sysctl -w kernel.core_pattern=core
diff --git a/docs/constraints.md b/docs/constraints.md
index 8a7b6cb..c7f633e 100644
--- a/docs/constraints.md
+++ b/docs/constraints.md
@@ -3560,3 +3560,14 @@ These controls use synthetic Docker outputs and files. No live core dump, contai
 The control pins the fixture setup prefix, including the declared host-precondition list and preflight functions. A new probe or list change fails with a shim-review diagnostic, including probes after the synthetic stopping point. Maintainers must review the listed requirements, shim answers, and stopping point before updating the digest. This conservative guard also requires review for unrelated edits within that prefix; it does not prove a real host meets those requirements.
 
 `npm run docker-gates:test` initially completed with 10 passed and one failed at W1_7_CANARY_DOCKER_IMAGE. After this change it completed with 12 passed, zero failed, and zero skipped. Its mutations detected a removed core-pattern answer, an added unanswered probe, and a changed precondition list, then passed after restoration. `npm run lint` exited 0. `node --test tests/repository-surface-policy.test.mjs` completed with four passed. No full suite, live canary, or Actions success was observed. ci-green is blocked pending agent-a's Actions-on-main observation under the handoff. F170 remains open. Evidence: `artifacts/agent-b/ci-canary-docker-shim-results.md`.
+
+
+### F170 revision four: SDK bundle before Docker gates
+
+Actions run 34371411859 is the handoff's reported failure: db:test reached second-builder-live.test.mjs, whose @engramport/sdk import needs the uncommitted packages/sdk/dist/index.mjs. The workflow now runs npm run build --prefix packages/sdk before Require Docker gates. The database runner refuses a missing bundle before Docker probing or lock acquisition, with one line naming that build command. The serialization-only --lock-probe remains independent of the bundle and Docker.
+
+With dist absent in this worktree, bash scripts/run-db-tests changed from exit 0 with DOCKER_GATE_SKIP before the edit to exit 1 with SDK_BUNDLE_REQUIRED after it. npm run docker-gates:test completed with 14 passed, zero failed, and zero skipped. Its isolated runner fixture observed no Docker calls with dist absent and reached synthetic compose up with a present module. Removed-check and always-refuse mutations were rejected, as were missing and late workflow build steps; restorations passed. The presence fixture does not establish bundle validity or live database success.
+
+npm run build --prefix packages/sdk exited 0, and a Node dynamic import of @engramport/sdk printed SDK_IMPORT_OK. With that real bundle present, ENGRAMPORT_REQUIRE_DOCKER=1 bash scripts/run-db-tests exited 1 at DOCKER_REQUIRED because the sandbox denied Docker API access. The bundle precondition therefore proceeds to the Docker gate; live database acceptance is blocked. Actions on main remains blocked pending agent-a's observation. No live suite or Actions success is claimed, and F170 remains open for that acceptance.
+
+node --test tests/db-test-lock.test.mjs tests/repository-surface-policy.test.mjs completed with six passed and zero skipped. npm run lint, bash -n scripts/run-db-tests, and git diff --check exited 0. Shared edits are limited to the workflow, database runner, Docker gate controls, and this append. Evidence: artifacts/agent-b/ci-canary-sdk-r4-results.md.
diff --git a/scripts/run-db-tests b/scripts/run-db-tests
index d0f6f2a..93be985 100644
--- a/scripts/run-db-tests
+++ b/scripts/run-db-tests
@@ -1,13 +1,17 @@
 #!/usr/bin/env bash
 set -euo pipefail
-# A lock probe exercises serialization only and does not require Docker.
+root_dir="$(cd "$(dirname "$0")/.." && pwd)"
+# A lock probe exercises serialization only and requires neither the SDK nor Docker.
 if [[ "${1:-}" != "--lock-probe" ]]; then
+  if [[ ! -f "$root_dir/packages/sdk/dist/index.mjs" ]]; then
+    echo "SDK_BUNDLE_REQUIRED: packages/sdk/dist/index.mjs missing; run npm run build --prefix packages/sdk from the repository root" >&2
+    exit 1
+  fi
   docker_gate_rc=0
   node "$(dirname "$0")/docker-gate.mjs" db:test || docker_gate_rc=$?
   if [[ "$docker_gate_rc" == 77 ]]; then exit 0; fi
   if [[ "$docker_gate_rc" != 0 ]]; then exit "$docker_gate_rc"; fi
 fi
-root_dir="$(cd "$(dirname "$0")/.." && pwd)"
 source "$root_dir/scripts/db-test-lock"
 ENGRAMPORT_DB_TEST_LOCK_LABEL=run-db-tests
 db_test_lock_acquire || exit $?
diff --git a/tests/docker-gates.test.mjs b/tests/docker-gates.test.mjs
index c4824b7..b5792aa 100644
--- a/tests/docker-gates.test.mjs
+++ b/tests/docker-gates.test.mjs
@@ -1,6 +1,6 @@
 import assert from "node:assert/strict";
 import { test } from "node:test";
-import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
+import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, rmSync } from "node:fs";
 import { tmpdir } from "node:os";
 import path from "node:path";
 import { spawnSync } from "node:child_process";
@@ -11,6 +11,84 @@ import { dockerGate } from "../scripts/docker-gate.mjs";
 const root = path.resolve(import.meta.dirname, "..");
 const missing = { available: false, reason: "Docker endpoint unavailable: synthetic missing socket" };
 const gates = ["w1-7:canary", "db:test", "d1:mutation", "kms:test"];
+// Isolate the runner's bundle precondition from the workspace build. The empty
+// module is a presence fixture only; synthetic Docker stops before any SQL/test.
+function dbRunnerFixture(directory, source = readFileSync(path.join(root, "scripts/run-db-tests"), "utf8")) {
+  // Canonicalize macOS /var -> /private/var so the gate's direct-entry URL matches.
+  const fixture = path.join(realpathSync(directory), "db-runner");
+  mkdirSync(path.join(fixture, "scripts"), { recursive: true });
+  for (const file of ["docker-gate.mjs", "db-test-lock"]) {
+    writeFileSync(path.join(fixture, "scripts", file), readFileSync(path.join(root, "scripts", file)));
+  }
+  const runner = path.join(fixture, "scripts/run-db-tests");
+  writeFileSync(runner, source);
+  return { runner, dist: path.join(fixture, "packages/sdk/dist") };
+}
+
+test("database runner refuses an absent SDK before Docker and continues with a present bundle", () => {
+  const directory = mkdtempSync(path.join(tmpdir(), "db-sdk-precondition-"));
+  const source = readFileSync(path.join(root, "scripts/run-db-tests"), "utf8");
+  const trace = path.join(directory, "docker.trace");
+  const env = { ...process.env, CI: "true", ENGRAMPORT_REQUIRE_DOCKER: "1", PATH: `${directory}:${process.env.PATH}`,
+    ENGRAMPORT_DB_TEST_LOCK_PATH: path.join(directory, "db.lock"), DB_SDK_TRACE: trace };
+  delete env.ENGRAMPORT_DB_TEST_LOCK_OWNER;
+  try {
+    writeFileSync(path.join(directory, "docker"), `#!/bin/sh
+echo "$*" >> "$DB_SDK_TRACE"
+if [ "$1" = info ]; then echo synthetic-version; exit 0; fi
+echo DOCKER_EXECUTION_REACHED >&2
+exit 42
+`, { mode: 0o755 });
+    function observe(candidate) {
+      const { runner, dist } = dbRunnerFixture(directory, candidate);
+      rmSync(dist, { recursive: true, force: true });
+      rmSync(trace, { force: true });
+      const run = () => spawnSync("bash", [runner], { cwd: directory, env, encoding: "utf8", timeout: 20000 });
+      const absent = run();
+      assert.equal(absent.error, undefined);
+      assert.equal(absent.status, 1);
+      assert.equal(absent.stdout, "");
+      assert.equal(absent.stderr, "SDK_BUNDLE_REQUIRED: packages/sdk/dist/index.mjs missing; run npm run build --prefix packages/sdk from the repository root\n");
+      assert.equal(existsSync(trace), false, "missing SDK must refuse before any Docker call");
+      assert.equal(existsSync(env.ENGRAMPORT_DB_TEST_LOCK_PATH), false);
+      mkdirSync(dist, { recursive: true });
+      writeFileSync(path.join(dist, "index.mjs"), "export {};\n");
+      const present = run();
+      assert.equal(present.error, undefined);
+      assert.equal(present.status, 42);
+      assert.match(present.stderr, /DOCKER_EXECUTION_REACHED/);
+      assert.doesNotMatch(present.stdout + present.stderr, /SDK_BUNDLE_REQUIRED|DOCKER_GATE_SKIP/);
+      const calls = readFileSync(trace, "utf8").trim().split("\n");
+      assert.equal(calls[0], "info --format {{.ServerVersion}}");
+      assert.ok(calls.some(line => line.endsWith(" up -d --wait")), "present bundle reaches synthetic compose up");
+    }
+    observe(source);
+    const anchor = '[[ ! -f "$root_dir/packages/sdk/dist/index.mjs" ]]';
+    assert.ok(source.includes(anchor));
+    assert.throws(() => observe(source.replace(anchor, "false")), { code: "ERR_ASSERTION" });
+    assert.throws(() => observe(source.replace(anchor, "true")), { code: "ERR_ASSERTION" });
+    observe(source);
+    console.log("DB_SDK_PRECONDITION absent=one-line-refusal docker-calls=0 present=synthetic-compose-up removed-check=killed always-refuse=killed restored=passed");
+  } finally { rmSync(directory, { recursive: true, force: true }); }
+});
+
+test("Actions builds the SDK before requiring Docker gates", () => {
+  const source = readFileSync(path.join(root, ".github/workflows/verify-proof.yml"), "utf8");
+  function check(workflow) {
+    const build = workflow.indexOf("        run: npm run build --prefix packages/sdk\n");
+    const gates = workflow.indexOf("      - name: Require Docker gates\n");
+    assert.ok(build >= 0 && gates > build, "SDK build must precede Docker gates");
+    assert.match(workflow.slice(0, build), /Actions run 34371411859/);
+  }
+  check(source);
+  const step = "      - name: Build SDK bundle for Docker gates\n        run: npm run build --prefix packages/sdk\n";
+  assert.ok(source.includes(step));
+  assert.throws(() => check(source.replace(step, "")), { code: "ERR_ASSERTION" });
+  assert.throws(() => check(source.replace(step, "") + step), { code: "ERR_ASSERTION" });
+  check(source);
+  console.log("SDK_WORKFLOW_ORDER baseline=passed missing-build=killed late-build=killed restored=passed");
+});
+
 // Keep the shim in step with the fixture's listed preconditions. This gate control
 // answers core_pattern, then stops at cleanup inventory, before host/container
 // preflight or any sink. Review new probes and the stopping point before updating
@@ -79,9 +157,12 @@ test("real entry points skip loudly locally, refuse in CI, and continue when Doc
   delete env.NODE_TEST_CONTEXT;
   delete env.ENGRAMPORT_DB_TEST_LOCK_OWNER;
   try {
+    const { runner, dist } = dbRunnerFixture(directory);
+    mkdirSync(dist, { recursive: true });
+    writeFileSync(path.join(dist, "index.mjs"), "export {};\n");
     writeFileSync(path.join(directory, "docker"), '#!/bin/sh\nif [ "$1" = info ]; then echo "synthetic missing socket" >&2; exit 1; fi\necho UNEXPECTED_DOCKER_EXECUTION >&2\nexit 42\n', { mode: 0o755 });
     const commands = [
-      ["bash", ["scripts/run-db-tests"], ["db:test"]],
+      ["bash", [runner], ["db:test"]],
       ["bash", ["scripts/run-d1-mutation-harness"], ["d1:mutation"]],
       ["bash", ["scripts/run-kms-tests"], ["kms:test"]],
       [process.execPath, ["--test", "tests/wizard-w1-7.test.mjs"], ["w1-7:canary"]],
@@ -98,7 +179,7 @@ test("real entry points skip loudly locally, refuse in CI, and continue when Doc
     }
     // Exercise the unchanged execution path without pretending this runs containers.
     writeFileSync(path.join(directory, "docker"), '#!/bin/sh\nif [ "$1" = info ]; then echo synthetic-version; exit 0; fi\necho DOCKER_EXECUTION_REACHED >&2\nexit 42\n');
-    for (const [command, args] of commands.filter(([, args]) => args.includes("scripts/run-db-tests") || args.includes("scripts/run-kms-tests"))) {
+    for (const [command, args] of commands.filter(([, , expected]) => expected.includes("db:test") || expected.includes("kms:test"))) {
       const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", timeout: 20000 });
       assert.notEqual(result.status, 0);
       assert.match(result.stdout + result.stderr, /DOCKER_EXECUTION_REACHED/);
```
