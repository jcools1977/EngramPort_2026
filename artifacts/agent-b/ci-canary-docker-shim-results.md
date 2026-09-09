# CI canary Docker shim, revision three

Actor: agent-b, Codex Builder. Thread: ci-canary-core-pattern.
Handoff: 01a086cb-7bca-77b7-9d6c-6cdd850d7704.
Starting commit from `git rev-parse HEAD`: 559fc2459de014708cc90503bf770a2c0cc89ed2.
Initial `git status --short --branch`: agent-b/ci-canary-4 tracking origin/main, with no changes.

| Criterion id | Status | Evidence |
| --- | --- | --- |
| gate-control-green | satisfied | `npm run docker-gates:test` completed with 12 passed, zero failed, zero skipped. Synthetic Docker answered the exact core-pattern probe with core and reached both inventory execution markers. |
| shim-in-step | satisfied | The alternative requiring failure on an added unanswered probe is implemented. The control pins the setup prefix, including the fixture precondition list and later preflight functions. An added Docker probe in checkCanaryHostPreconditions and a changed list both failed the review assertion. Removing the shim's core answer failed the real-entry-point continuation control. Each control passed again after restoration. |
| ci-green | blocked | Success on main must be observed by the dispatcher in Actions. This handoff explicitly assigns agent-b a blocked result. No push or Actions observation is authorized or performed in this turn. The local branch cannot establish the dispatcher's required main-workflow outcome. |

## Admission and bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, and the complete named handoff, including completion_criteria and bounded_context. Read schemas/event-v1.schema.json, including $defs.result. Initial `npm run proof:verify` verified 556 events across 113 threads and three actors. `npm run engram -- inbox --actor agent-b` returned the named handoff only.

Resolved bound event 01a086c8-51c6-74ef-bd57-71512dc53a13 with `rg -l` and opened events/agent-b/20260909T152750Z_01a086c8-51c6-74ef-bd57-71512dc53a13.md in full. Opened its referenced artifacts/agent-b/ci-canary-host-preconditions-results.md in full. `shasum -a 256 artifacts/agent-b/ci-canary-host-preconditions-results.md` returned 29ca8b5fdc709bc2bb0bf6b91ebb7f755171cb3359ed10ef4368dfb7dad995af, matching the reference. Also opened its supporting artifacts/agent-b/ci-canary-host-preconditions-control.mjs in full; `shasum -a 256 artifacts/agent-b/ci-canary-host-preconditions-control.mjs` returned ca8bbba25424eb9beb1c87d34e2845bce5efe012957c2d411c3caa868869fe90, matching the report. Historical claims and the handoff's Actions failure are quoted project evidence, not current Actions observations.

## Change and limits

Only tests/docker-gates.test.mjs and an append to docs/constraints.md changed among shared surfaces. The fixture is unchanged. Database and KMS continuation retain the previous generic synthetic Docker. The canary gets an exact-argument core-pattern answer and an allowlist of two inventory calls. These calls write an execution marker and exit 42, deliberately stopping before any container, signing listener, host preflight, or canary sink. Unexpected calls write UNANSWERED_DOCKER_PROBE and exit 43. The control asserts the exact trace and W1_7_CANARY_CLEANUP_INVENTORY error, with no Docker skip. Temporary shim and trace files are removed in finally.

The trace is necessary because the fixture converts the failing inventory command's stderr into a sanitized one-line diagnostic. No fixture diagnostics were weakened to expose the marker. A selected canary child run is expected to fail at inventory; success applies to the outer gate-control suite, not the canary.

The setup-prefix SHA-256 guard covers all source before the first vulnerableLanding declaration, including the listed preconditions, helper implementations, and preflight invocation. Its expected digest is a4189421cbb3aa7c4cb4d44a56f17df9947c022eb7fb78e601d54ebaf35f8c32. It requires review even when a new probe would occur after the synthetic stopping point. It conservatively flags unrelated prefix edits too. Maintainers must review shim coverage and stopping point before updating it. It is an in-tree maintenance control, not protection against coordinated edits to both fixture and guard. The shim does not model every host assumption or execute the full preflight.

## Observed commands

- Before editing, `npm run docker-gates:test`: exit 1, 11 tests, 10 passed, one failed, zero skipped. The real-entry-point control expected DOCKER_EXECUTION_REACHED and received W1_7_CANARY_DOCKER_IMAGE.
- After editing, `npm run docker-gates:test`: exit 0, 12 tests, 12 passed, zero failed, zero skipped. Missing-Docker local/CI controls and existing Docker/OIDC silent-skip mutations also completed.
- `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero failed, zero skipped; 1371 tracked paths, zero unaccounted paths at that check.
- `npm run lint`: completed, exit 0.
- `git diff --check`: exit 0 before the documentation append. A final check is recorded separately below if run before publication.
- Pre-publication `npm run proof:verify`: exit 0, 556 events across 113 threads and three actors.
- This report's Python generation command compared docs/constraints.md with `git show HEAD:docs/constraints.md` before appending and asserted the original bytes remain an unchanged prefix.

Selected output from `npm run docker-gates:test`:

```text
DOCKER_SHIM_CONTRACT baseline=passed added-probe=killed changed-list=killed restored=passed
DOCKER_GATE_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1
DOCKER_SHIM_CONTINUATION core_pattern=answered inventory=execution-reached missing-answer=killed restored=passed scope=synthetic
OIDC_RUNTIME_MUTATIONS baseline=0 silent-skip=killed restored=0 executed=1
tests 12
pass 12
fail 0
skipped 0
```

The discriminating variants are in-memory strings passed to the same controls. The removed-answer variant executes through the real W1-7 entry point. The new-probe and changed-list variants exercise the setup-review guard without executing their unknown command. No mutation remains in source. No full npm test, real Docker execution, live canary, or Actions success is claimed. F170 remains open for the dispatcher's live acceptance. The post-append proof and commit outcome are reported separately because this artifact becomes immutable when referenced.

## Complete bounded diff

Command: `git diff -- tests/docker-gates.test.mjs docs/constraints.md`.

```diff
diff --git a/docs/constraints.md b/docs/constraints.md
index 13377b8..8a7b6cb 100644
--- a/docs/constraints.md
+++ b/docs/constraints.md
@@ -3551,3 +3551,12 @@ The handoff attributes Actions run 34369284714 on `137e348` to missing container
 `node artifacts/agent-b/ci-canary-host-preconditions-control.mjs` exited 0: synthetic baseline and restoration passed, 13 diagnostic failure cases were classified with single-line messages, and gateway-removal, ignored-container-failure, and removed-host-core-read mutations each failed the control. The same command checked the extracted Bash syntax, confirmed the core operation is unchanged except for the mapping and its reason, and confirmed canary observations, tests, and workflow are byte-identical to starting commit `ead7d4cb3c8c98df3aa36acd93c7d29146b0ab11`. `W1_7_CASE=core-pattern npm run w1-7:test` completed with five passed, zero failed, and zero skipped, excluding live canary and database cases. `node --test tests/repository-surface-policy.test.mjs` completed with four passed, zero failed, and zero skipped. `npm run lint`, `node --check tests/helpers/w1-7-canary-fixture.mjs`, and `git diff --check` exited 0.
 
 These controls use synthetic Docker outputs and files. No live core dump, container connectivity, live canary, or Actions result was observed by agent-b. The extra safe-crash/signing preflight adds runtime that has not been measured on a Docker host. Preconditions describe the host at probe time; they cannot reserve disk capacity or prevent later host/network changes. Concurrent unrelated resource creation is still judged by the unchanged final cleanup assertions. F170 remains open and ci-green is blocked pending the dispatcher's live canary and Actions-on-main observation. Evidence: `artifacts/agent-b/ci-canary-host-preconditions-results.md`.
+
+
+### F170 revision three: synthetic Docker gate continuation
+
+`tests/docker-gates.test.mjs` now answers the exact canary core-pattern probe with `core`. The W1-7 control records `DOCKER_EXECUTION_REACHED` for container and volume inventory in a temporary trace, because the fixture deliberately sanitizes Docker stderr into a precondition diagnostic. It asserts the expected inventory refusal and exact trace. This proves entry-point continuation through the core-pattern check to inventory only. The synthetic gate stops before host/container preflight and canary sinks.
+
+The control pins the fixture setup prefix, including the declared host-precondition list and preflight functions. A new probe or list change fails with a shim-review diagnostic, including probes after the synthetic stopping point. Maintainers must review the listed requirements, shim answers, and stopping point before updating the digest. This conservative guard also requires review for unrelated edits within that prefix; it does not prove a real host meets those requirements.
+
+`npm run docker-gates:test` initially completed with 10 passed and one failed at W1_7_CANARY_DOCKER_IMAGE. After this change it completed with 12 passed, zero failed, and zero skipped. Its mutations detected a removed core-pattern answer, an added unanswered probe, and a changed precondition list, then passed after restoration. `npm run lint` exited 0. `node --test tests/repository-surface-policy.test.mjs` completed with four passed. No full suite, live canary, or Actions success was observed. ci-green is blocked pending agent-a's Actions-on-main observation under the handoff. F170 remains open. Evidence: `artifacts/agent-b/ci-canary-docker-shim-results.md`.
diff --git a/tests/docker-gates.test.mjs b/tests/docker-gates.test.mjs
index 2b8e149..c4824b7 100644
--- a/tests/docker-gates.test.mjs
+++ b/tests/docker-gates.test.mjs
@@ -4,12 +4,36 @@ import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
 import { tmpdir } from "node:os";
 import path from "node:path";
 import { spawnSync } from "node:child_process";
+import { createHash } from "node:crypto";
 import { pathToFileURL } from "node:url";
 import { dockerGate } from "../scripts/docker-gate.mjs";
 
 const root = path.resolve(import.meta.dirname, "..");
 const missing = { available: false, reason: "Docker endpoint unavailable: synthetic missing socket" };
 const gates = ["w1-7:canary", "db:test", "d1:mutation", "kms:test"];
+// Keep the shim in step with the fixture's listed preconditions. This gate control
+// answers core_pattern, then stops at cleanup inventory, before host/container
+// preflight or any sink. Review new probes and the stopping point before updating
+// this digest. Pin the entire setup prefix so later preflight additions also fail.
+function assertCanaryPreconditionsReviewed(source) {
+  const end = source.indexOf("    const vulnerableLanding=");
+  assert.ok(end > 0, "canary precondition boundary moved; review the Docker shim");
+  assert.equal(createHash("sha256").update(source.slice(0, end)).digest("hex"),
+    "a4189421cbb3aa7c4cb4d44a56f17df9947c022eb7fb78e601d54ebaf35f8c32",
+    "canary preconditions changed; keep the Docker shim in step with the fixture list");
+}
+
+test("canary shim requires review when the fixture adds an unanswered precondition", () => {
+  const source = readFileSync(path.join(root, "tests/helpers/w1-7-canary-fixture.mjs"), "utf8");
+  assertCanaryPreconditionsReviewed(source);
+  const anchor = '  const dump=path.join(directory,"host-preflight");';
+  assert.ok(source.includes(anchor));
+  const mutant = source.replace(anchor, `${anchor}\n  await run("docker", ["run", "--rm", "--entrypoint", "cat", coreImage, "/proc/sys/kernel/new_probe"]);`);
+  assert.throws(() => assertCanaryPreconditionsReviewed(mutant), /canary preconditions changed/);
+  assert.throws(() => assertCanaryPreconditionsReviewed(source.replace("// Host preconditions,", "// New Docker probe required.\n// Host preconditions,")), /canary preconditions changed/);
+  assertCanaryPreconditionsReviewed(source);
+  console.log("DOCKER_SHIM_CONTRACT baseline=passed added-probe=killed changed-list=killed restored=passed");
+});
 function assertSkipLines(gateFunction) {
   const lines = [];
   assert.equal(gateFunction(gates, { availability: missing, env: {}, emit: line => lines.push(line) }), false);
@@ -74,11 +98,50 @@ test("real entry points skip loudly locally, refuse in CI, and continue when Doc
     }
     // Exercise the unchanged execution path without pretending this runs containers.
     writeFileSync(path.join(directory, "docker"), '#!/bin/sh\nif [ "$1" = info ]; then echo synthetic-version; exit 0; fi\necho DOCKER_EXECUTION_REACHED >&2\nexit 42\n');
-    for (const [command, args] of commands.filter(([, args]) => !args.includes("scripts/run-d1-mutation-harness"))) {
+    for (const [command, args] of commands.filter(([, args]) => args.includes("scripts/run-db-tests") || args.includes("scripts/run-kms-tests"))) {
       const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", timeout: 20000 });
       assert.notEqual(result.status, 0);
       assert.match(result.stdout + result.stderr, /DOCKER_EXECUTION_REACHED/);
       assert.doesNotMatch(result.stdout + result.stderr, /DOCKER_GATE_SKIP/);
     }
+    // Precondition errors intentionally sanitize Docker stderr. Observe the shim
+    // directly so its execution marker survives without changing fixture errors.
+    const trace = path.join(directory, "canary-docker.trace");
+    const shim = `#!/bin/sh
+if [ "$1" = info ]; then echo synthetic-version; exit 0; fi
+if [ "$#" -eq 6 ] && [ "$1" = run ] && [ "$2" = --rm ] && [ "$3" = --entrypoint ] && [ "$4" = cat ] && [ "$5" = pgvector/pgvector:pg16 ] && [ "$6" = /proc/sys/kernel/core_pattern ]; then
+  echo CORE_PATTERN_ANSWERED >> "$DOCKER_GATE_TRACE"
+  echo core
+  exit 0
+fi
+if [ "$*" = 'ps -aq' ] || [ "$*" = 'volume ls -q' ]; then
+  echo "DOCKER_EXECUTION_REACHED $*" >> "$DOCKER_GATE_TRACE"
+  echo DOCKER_EXECUTION_REACHED >&2
+  exit 42
+fi
+echo UNANSWERED_DOCKER_PROBE >> "$DOCKER_GATE_TRACE"
+exit 43
+`;
+    function canaryContinuation(source) {
+      writeFileSync(path.join(directory, "docker"), source);
+      writeFileSync(trace, "");
+      const result = spawnSync(process.execPath, ["--test", "tests/wizard-w1-7.test.mjs"], {
+        cwd: root, env: { ...env, W1_7_CASE: "canary", DOCKER_GATE_TRACE: trace }, encoding: "utf8", timeout: 20000,
+      });
+      assert.equal(result.error, undefined);
+      assert.notEqual(result.status, 0);
+      const output = result.stdout + result.stderr;
+      assert.doesNotMatch(output, /DOCKER_GATE_SKIP/);
+      assert.match(output, /W1_7_CANARY_CLEANUP_INVENTORY/);
+      assert.deepEqual(readFileSync(trace, "utf8").trim().split("\n").sort(), [
+        "CORE_PATTERN_ANSWERED", "DOCKER_EXECUTION_REACHED ps -aq", "DOCKER_EXECUTION_REACHED volume ls -q",
+      ]);
+    }
+    canaryContinuation(shim);
+    // Removing the new answer reproduces the old precondition failure and must
+    // fail the same continuation assertions. Restore and exercise them again.
+    assert.throws(() => canaryContinuation(shim.replace("  echo core\n  exit 0", "  exit 42")), /W1_7_CANARY_CLEANUP_INVENTORY/);
+    canaryContinuation(shim);
+    console.log("DOCKER_SHIM_CONTINUATION core_pattern=answered inventory=execution-reached missing-answer=killed restored=passed scope=synthetic");
   } finally { rmSync(directory, { recursive: true, force: true }); }
 });
```

Final pre-publication `git diff --check`: exit 0 after the documentation append.
