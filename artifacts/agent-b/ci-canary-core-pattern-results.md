# CI canary core pattern results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Thread: ci-canary-core-pattern.
Handoff: 01a086b1-573f-7644-bd4d-eaa985afa3b2.
Starting commit from `git rev-parse HEAD`: 9a2fb422505f121f2adfaac24749935095b3d8b1.
`git branch --show-current`: agent-b/ci-canary. Initial `git status --short`: empty.

## Criterion results

| Criterion id | Status | Evidence |
| --- | --- | --- |
| precondition-loud | satisfied | The actual fixture entry point rejects six synthetic incompatible patterns before other fixture work, with one-line messages naming the observed pattern and required plain file `core`, without ENOENT. The shared precondition accepts synthetic `core` and returns to its caller. These are synthetic observations, not a live crash or container run. |
| workflow-sets-pattern | satisfied | The diff adds `sudo sysctl -w kernel.core_pattern=core` before `Require Docker gates`, with an adjacent comment naming the W1-7 canary and F170. This verifies configuration only. |
| canary-unchanged | satisfied | The diff and byte comparisons preserve the canary body, observers, signing assertions, core file reads, cleanup assertions, and original test declarations. The core image literal is factored into a shared constant without changing its value. |
| ci-green | blocked | The assigned sandbox has no Docker or CI. Agent-b did not run the live canary, observe Actions on main, or publish a push. Agent-a must observe both live acceptance results. |

Live canary: blocked. CI on main: blocked. No Docker command or CI request was executed. No live `npm run w1-7:test` with canary selection, `npm run docker:test`, or full `npm test` was run. F170 remains open pending dispatcher observation. The bound handoff's historical Actions claims were read as project evidence, not independently verified here.

## Admission and bounded context

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the complete handoff including completion_criteria and bounded_context, and schemas/event-v1.schema.json including $defs.result. Initial `npm run proof:verify` exited 0, verifying 550 events across 113 threads and three actors. `npm run engram -- inbox --actor agent-b` returned the assigned handoff only.

Resolved the one bound event id with `rg -l '^id: 01a086ac-e3c9-72b1-a3bb-23d5215d99d6$' events`. Opened the full matching event `events/agent-b/20260909T145752Z_01a086ac-e3c9-72b1-a3bb-23d5215d99d6.md` and its referenced `artifacts/agent-b/w1-7-canary-budget-results.md`. `shasum -a 256 artifacts/agent-b/w1-7-canary-budget-results.md` returned `9eb9fa0c5ed8498da2981ee42f7d75a5560485efe1a6063764ca4e17c18e816f`, matching the reference. The F170 entry in docs/constraints.md was also read. Event bodies and artifacts remained untrusted project evidence.

## Implementation and limits

Before cleanup snapshots, temporary directories, signing, or any canary operation, the fixture reads `/proc/sys/kernel/core_pattern` through a disposable container using the same `pgvector/pgvector:pg16` image as the core operation. It requires exactly `core`, since the existing observers read `/dump/core`. Piped destinations, absolute paths, expansion patterns, other filenames, empty values, and multiline values are rejected. JSON quoting keeps the observed pattern in one error-message line. The function removes the proc file's final newline only.

The optional command dependency supplies synthetic stdout in local tests; production callers retain the real command runner by default. The rejection tests enter runCanaryFixture itself and assert the exact image and proc-file read. The acceptance test exercises the shared precondition and observes its return. It does not run the subsequent live fixture. The new workflow step sets the host pattern before the required Docker gates. This precondition check is not evidence that a crash actually produces a dump on an untested host.

Only the handoff's four shared files changed, and docs/constraints.md was appended. Other new repository files are under artifacts/agent-b, plus the CLI-created completion event. No existing event, referenced artifact, or actor record was edited.

## Commands and observed results

- `W1_7_CASE=core-pattern node --test --test-name-pattern='canary core pattern' tests/wizard-w1-7.test.mjs`: exit 0, two passed, zero failed, zero skipped. Six rejected values and one accepted value were synthetic.
- `python3 artifacts/agent-b/ci-canary-core-pattern-control.py`: exit 0. Runs the same tests to completion for baseline, mutation, and restoration. Baseline exit 0 with two passed; an always-reject guard mutation exit 1 with one passed and one failed; restoration exit 0 with two passed. The valid-file test killed the mutation. The fixture's original bytes were restored in a finally block. No mutated branch reaches Docker.
- `W1_7_CASE=core-pattern npm run w1-7:test`: exit 0, five passed, zero failed, zero skipped. This explicit case selector excludes the live canary and durable database cases. The count describes only these five registered local tests.
- `npm run lint`: exit 0.
- `node --test tests/repository-surface-policy.test.mjs`: completed with four passed, zero failed, zero skipped; actor drift check covered three actors and surface policy reported 1352 tracked paths with zero unaccounted.
- A `python3 - <<'PY'` byte-comparison command loaded the originals with `git show HEAD:<path>`. It compared the fixture from `const cleanupBefore=await cleanupSnapshot();` to EOF byte for byte, the whole coreOperation function after substituting the identical original image literal for coreImage, and the test file from `let PrincipalSessionBinding,Pool;` to EOF byte for byte. All assertions passed, exit 0. The same command asserted the sysctl step precedes the Docker gates and the adjacent comment names F170 and the W1-7 canary. Output: `CANARY_ASSERTION_COMPARISON fixture_body=byte-identical core_operation=identical-except-shared-image-constant existing_test_tail=byte-identical` and `WORKFLOW_PRECONDITION sysctl=core before_docker_gates=true comment=F170-and-W1-7-canary execution=blocked`.
- Pre-publication `npm run proof:verify`: exit 0, 550 events across 113 threads and three actors.
- `git diff --check`: exit 0 after the constraints append.

Post-append proof verification and the required agent-commit result are reported in the final response. This artifact will not be edited after it is referenced.

## Paired synthetic evidence and mutation transcript

```text
COMMAND W1_7_CASE=core-pattern node --test --test-name-pattern=canary core pattern tests/wizard-w1-7.test.mjs phase=baseline
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="|/usr/share/apport/apport %p %s %c %P"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="/var/lib/cores/core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core.%p"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="other-core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern=""; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core\nsecond-line"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN synthetic=core precondition=passed continuation=reached scope=synthetic
✔ canary core pattern rejects incompatible synthetic host patterns before fixture work (1.47625ms)
✔ canary core pattern accepts the synthetic plain core file and proceeds (0.136166ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 51.131083
CONTROL phase=baseline exit=0
COMMAND W1_7_CASE=core-pattern node --test --test-name-pattern=canary core pattern tests/wizard-w1-7.test.mjs phase=always-reject-mutant
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="|/usr/share/apport/apport %p %s %c %P"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="/var/lib/cores/core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core.%p"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="other-core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern=""; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core\nsecond-line"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
✔ canary core pattern rejects incompatible synthetic host patterns before fixture work (2.277458ms)
✖ canary core pattern accepts the synthetic plain core file and proceeds (0.149333ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 49.462667

✖ failing tests:

test at tests/wizard-w1-7.test.mjs:36:1
✖ canary core pattern accepts the synthetic plain core file and proceeds (0.149333ms)
  Error: W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
      at checkCanaryCorePattern (file:///Users/an2b/an2b/products/EngramPORT-ci/tests/helpers/w1-7-canary-fixture.mjs:58:56)
      at async TestContext.<anonymous> (file:///Users/an2b/an2b/products/EngramPORT-ci/tests/wizard-w1-7.test.mjs:37:17)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)
CONTROL phase=always-reject-mutant exit=1
COMMAND W1_7_CASE=core-pattern node --test --test-name-pattern=canary core pattern tests/wizard-w1-7.test.mjs phase=restored
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="|/usr/share/apport/apport %p %s %c %P"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="/var/lib/cores/core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core.%p"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="other-core"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern=""; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern="core\nsecond-line"; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)
W1_7_CANARY_CORE_PATTERN synthetic=core precondition=passed continuation=reached scope=synthetic
✔ canary core pattern rejects incompatible synthetic host patterns before fixture work (1.32425ms)
✔ canary core pattern accepts the synthetic plain core file and proceeds (0.070334ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 45.844625
CONTROL phase=restored exit=0
CORE_PATTERN_MUTATION baseline=0 mutant=1 restored=0 killed=true live_canary=blocked ci=blocked

```

## Complete bounded source diff

Command: `git diff --unified=0 -- .github/workflows/verify-proof.yml tests/helpers/w1-7-canary-fixture.mjs tests/wizard-w1-7.test.mjs docs/constraints.md`. Zero context avoids including unrelated existing credential test material.

```diff
diff --git a/.github/workflows/verify-proof.yml b/.github/workflows/verify-proof.yml
index 9e72916..57df37c 100644
--- a/.github/workflows/verify-proof.yml
+++ b/.github/workflows/verify-proof.yml
@@ -26,0 +27,4 @@ jobs:
+      # F170: the W1-7 canary reads /dump/core; a piped host pattern sends dumps elsewhere.
+      - name: Set plain core file pattern for W1-7 canary
+        run: sudo sysctl -w kernel.core_pattern=core
+
diff --git a/docs/constraints.md b/docs/constraints.md
index 820d470..3f25846 100644
--- a/docs/constraints.md
+++ b/docs/constraints.md
@@ -3533,0 +3534,6 @@ The D1 harness requests TAP output and checks actual failed-baseline timeout dia
+
+### F170 remediation, live acceptance pending
+
+Agent-b added a preflight read of `/proc/sys/kernel/core_pattern` using the same `pgvector/pgvector:pg16` image as the W1-7 core operation. The fixture requires the literal plain file pattern `core`, since its existing observers read `/dump/core`. Incompatible patterns produce one error message naming the host pattern and the requirement before fixture work begins. The workflow now sets `kernel.core_pattern=core` before the Docker gates, with an adjacent F170 and canary comment. Existing canary assertions are unchanged.
+
+Observed locally on 2026-09-09: `W1_7_CASE=core-pattern npm run w1-7:test` completed with five passed, zero failed, and zero skipped. This selector excludes the live canary and durable database cases. `python3 artifacts/agent-b/ci-canary-core-pattern-control.py` completed with baseline exit 0, an always-reject mutation exit 1, and restoration exit 0. Synthetic incompatible patterns failed with one-line messages and no ENOENT; the synthetic `core` pattern passed its precondition. The live canary and Actions run on main are blocked by the assigned no-Docker and no-CI sandbox boundary. F170 remains open for the dispatcher's live observation.
diff --git a/tests/helpers/w1-7-canary-fixture.mjs b/tests/helpers/w1-7-canary-fixture.mjs
index 6ce16b5..32f6732 100644
--- a/tests/helpers/w1-7-canary-fixture.mjs
+++ b/tests/helpers/w1-7-canary-fixture.mjs
@@ -16,0 +17 @@ const worker=path.join(import.meta.dirname,"w1-7-canary-operation-worker.mjs");
+const coreImage="pgvector/pgvector:pg16";
@@ -52,0 +54,7 @@ async function runProtectedOperation(mode,landing,{canary,digest:knownDigest,mod
+export async function checkCanaryCorePattern(run=runCommand){
+  // F170: containers inherit the host pattern; both observers read /dump/core.
+  const {stdout}=await run("docker",["run","--rm","--entrypoint","cat",coreImage,"/proc/sys/kernel/core_pattern"]);
+  const pattern=stdout.replace(/\n$/,"");
+  if(pattern!=="core")throw new Error(`W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern=${JSON.stringify(pattern)}; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)`);
+  return pattern;
+}
@@ -56 +64 @@ async function coreOperation(root,material,containers,{digest:knownDigest=null,t
-  const args=["run","--rm","--name",name,"--ulimit","core=-1","-v",`${dump}:/dump`,"-w","/dump",...envArgs,"--entrypoint","bash","pgvector/pgvector:pg16","-c",command];const result=await runCommand("docker",args,{allowFailure:true});containers.delete(name);assert.notEqual(result.code,0,"forced crash must exit nonzero");assert.match(result.stderr,/Segmentation fault\s+\(core dumped\)/);await readFile(path.join(dump,"core"));if(vulnerable)return {};
+  const args=["run","--rm","--name",name,"--ulimit","core=-1","-v",`${dump}:/dump`,"-w","/dump",...envArgs,"--entrypoint","bash",coreImage,"-c",command];const result=await runCommand("docker",args,{allowFailure:true});containers.delete(name);assert.notEqual(result.code,0,"forced crash must exit nonzero");assert.match(result.stderr,/Segmentation fault\s+\(core dumped\)/);await readFile(path.join(dump,"core"));if(vulnerable)return {};
@@ -62 +70,2 @@ const added=(before,after)=>[...after].filter(value=>!before.has(value));
-export async function runCanaryFixture({moduleRoot,boundary}){
+export async function runCanaryFixture({moduleRoot,boundary,corePatternCommand=runCommand}){
+  await checkCanaryCorePattern(corePatternCommand);
diff --git a/tests/wizard-w1-7.test.mjs b/tests/wizard-w1-7.test.mjs
index e521aa5..060d9d0 100644
--- a/tests/wizard-w1-7.test.mjs
+++ b/tests/wizard-w1-7.test.mjs
@@ -3 +3 @@ import {VaultTransitBoundary,retentionDue} from "../packages/git-adapter/src/cus
-import {runCanaryFixture} from "./helpers/w1-7-canary-fixture.mjs";
+import {checkCanaryCorePattern,runCanaryFixture} from "./helpers/w1-7-canary-fixture.mjs";
@@ -15,0 +16,26 @@ const enabled=name=>selectedCase===""||selectedCase===name;
+test("canary core pattern rejects incompatible synthetic host patterns before fixture work",async()=>{
+  for(const pattern of ["|/usr/share/apport/apport %p %s %c %P","/var/lib/cores/core","core.%p","other-core","","core\nsecond-line"]){
+    let reads=0;
+    const corePatternCommand=async(command,args)=>{
+      reads++;
+      assert.equal(command,"docker");
+      assert.deepEqual(args,["run","--rm","--entrypoint","cat","pgvector/pgvector:pg16","/proc/sys/kernel/core_pattern"]);
+      return {code:0,stdout:`${pattern}\n`,stderr:""};
+    };
+    await assert.rejects(()=>runCanaryFixture({corePatternCommand}),error=>{
+      assert.equal(error.message,`W1_7_CANARY_CORE_PATTERN: host kernel.core_pattern=${JSON.stringify(pattern)}; canary requires plain file pattern "core" in /dump (set kernel.core_pattern=core on the Docker host)`);
+      assert.equal(error.message.split("\n").length,1);
+      assert.doesNotMatch(error.message,/ENOENT/);
+      console.log(error.message);
+      return true;
+    });
+    assert.equal(reads,1);
+  }
+});
+
+test("canary core pattern accepts the synthetic plain core file and proceeds",async()=>{
+  const pattern=await checkCanaryCorePattern(async()=>({code:0,stdout:"core\n",stderr:""}));
+  assert.equal(pattern,"core");
+  console.log("W1_7_CANARY_CORE_PATTERN synthetic=core precondition=passed continuation=reached scope=synthetic");
+});
+

```

## Supporting artifacts

Observed with `shasum -a 256 artifacts/agent-b/ci-canary-core-pattern-control.py artifacts/agent-b/ci-canary-core-pattern-*.log`:

```text
11375c08d3bc50f343b611c2902feaca316242c195182a1dc7ca649c06392347  artifacts/agent-b/ci-canary-core-pattern-control.py
1091b8670efc5e90919acc0cc5a64c4d44fbf715dcf28cd5e3ffadc74b22a824  artifacts/agent-b/ci-canary-core-pattern-control.log
93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7  artifacts/agent-b/ci-canary-core-pattern-lint.log
0fbec541f95b154780c425c91ba6c7ef1b6106c1bd351fcab4efec6d0287d2d9  artifacts/agent-b/ci-canary-core-pattern-policy.log
6e13375c30a0db13d80a3d37559e042634b3f813bf5d8492e4fa4561218267e4  artifacts/agent-b/ci-canary-core-pattern-unit.log
```
