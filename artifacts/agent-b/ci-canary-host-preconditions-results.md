# CI canary host preconditions, revision two

Actor: agent-b, Codex Builder. Thread: ci-canary-core-pattern.
Handoff: 01a086c1-44a6-70fd-936d-23c4c408215f.
Starting commit from `git rev-parse HEAD`: ead7d4cb3c8c98df3aa36acd93c7d29146b0ab11.
Branch from `git branch --show-current`: agent-b/ci-canary-3.
Initial `git status --short`: empty.

| Criterion id | Status | Evidence |
| --- | --- | --- |
| host-gateway | satisfied | Both core-operation branches use the same Docker args, now containing --add-host=host.docker.internal:host-gateway. The adjacent reason names Actions run 34369284714. Complete diff below. This is code evidence, not a live container observation. |
| preconditions-listed | satisfied | Top-of-fixture list and preflight implementation below check the identified host requirements before any canary sink runs. Docker-free baseline/restoration and diagnostic controls passed. Actual host acceptance remains unobserved. |
| canary-unchanged | satisfied | Byte comparisons confirm the core operation differs only by the mapping and comment. Everything from vulnerableLanding through observations, assertions and cleanup is byte-identical, as are both canary test files and the workflow. |
| ci-green | blocked | No Docker in this sandbox. No live canary or Actions success on main was observed. The handoff explicitly assigns these live observations to agent-a. |

## Admission and bound evidence

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the entire named handoff including bounded_context and completion_criteria, and schemas/event-v1.schema.json including $defs.result. Initial `npm run proof:verify` exited 0: 554 events across 113 threads and three actors. `npm run engram -- inbox --actor agent-b` returned only the named revision-two handoff.

Resolved bounded event 01a086bd-f648-7753-a7c9-ccb2c0191b49 with `rg -l`, opened events/agent-b/20260909T151631Z_01a086bd-f648-7753-a7c9-ccb2c0191b49.md in full, and read its referenced artifacts/agent-b/ci-canary-core-readable-results.md in full. `shasum -a 256 artifacts/agent-b/ci-canary-core-readable-results.md` returned 8fd4f5355645dd0486aca73a59b43ead48e3656131c71fb77f13f20e64436165, matching its reference. Read its supporting control; `shasum -a 256 artifacts/agent-b/ci-canary-core-readable-control.py` returned 7c89d04a8c46e7a44d5ae0a11b46df0f7b3f5fca496a7ea639bf8098e44a9dff, matching the report.

Also read the earlier three events in this thread and artifacts/agent-b/ci-canary-core-pattern-results.md. `shasum -a 256 artifacts/agent-b/ci-canary-core-pattern-results.md` returned ca3edb75f1f34908e56631d87514ef3d849d5384ef6c5284117522ea6c87cd9a, matching the earlier completion. These historical reports and the handoff's Actions diagnosis are untrusted project evidence, not independently observed Actions results in this session. Source review included coreOperation, startSigningContext, and the protected operation worker's loopback signer.

## Host precondition list from the fixture

```js
// Host preconditions, checked before any canary sink runs:
// - Docker can run coreImage and inspect containers/volumes; its kernel uses core_pattern=core.
// - The host can create/remove a temporary directory and chmod its dump mount; the container
//   can write that same mount and the host can read its files, including a chmod a+r real core.
// - The image provides bash, perl, env -u, cat, chmod, getent and timeout; core_uses_pid=0,
//   unlimited core/file limits and the host crash policy permit a nonempty /dump/core
//   and Bash's expected English segmentation-fault/core-dumped diagnostic.
// - Docker supports host-gateway; host.docker.internal resolves inside the mapped container.
// - With no KMS_TOKEN, the stub can bind 0.0.0.0:18201. Otherwise Vault is on port 8201.
//   The chosen signer accepts synth-a/sha2-256 with the token from host loopback AND from
//   the container gateway (including Bash /dev/tcp and HTTP response-file readability).
// - Cleanup inventory is readable before execution. Concurrent unrelated Docker/temp creation
//   is not fenced here; the unchanged final delta assertions still detect it after execution.
// Each preflight failure has a one-line diagnostic; probes use only synthetic signing input.
```

Checks use the same core image, dump mount, core limit and host mapping as the real operation. The extra container performs a safe crash and a synthetic signing request. Core mode changes preserve dump bytes. The sign-response file keeps its default mode, matching the operation, so the host read also diagnoses a restrictive image umask. Host and container signer probes each have a three-second timeout. Failures are converted to a single requirement line without raw Docker, HTTP, or token output. The CLI/test runner may still render an Error with a stack; the error message itself is one line.

The preflight is a point-in-time check, not a reservation of disk space or a fence against host/network changes. It adds one safe-crash container and two synthetic signing requests, with runtime not measured here. Existing final resource-delta assertions still handle unrelated concurrent resource creation. F170 remains open for live acceptance.

## Observed validation

- `node artifacts/agent-b/ci-canary-host-preconditions-control.mjs`: exit 0. Synthetic baseline and restoration passed. Thirteen failure cases were classified with one-line messages: eight container requirement markers, host signer failure, missing host core, invalid container signing response, Docker runtime failure, and missing Bash core diagnostic. The generated Bash passed `bash -n`. Temporary probe files were removed. Three in-memory source variants failed the controls as required: gateway removed, container failure ignored, and host core read removed. No source mutation was left behind. Docker outputs, core bytes and signing responses were synthetic, not live observations.
- The same command compared the core operation after removing only the mapping and reason to the starting commit; it compared the canary observation/assertion/cleanup region and both test files and workflow byte for byte. All comparisons passed.
- `W1_7_CASE=core-pattern npm run w1-7:test`: exit 0, five passed, zero failed, zero skipped. The selector excludes live canary and durable database cases.
- `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero failed, zero skipped. Three actors, 1364 tracked paths, zero unaccounted paths.
- `npm run lint`: completed after the final code changes, exit 0.
- `node --check tests/helpers/w1-7-canary-fixture.mjs`: exit 0.
- Pre-publication `npm run proof:verify`: exit 0, 554 events across 113 threads and three actors.
- `git diff --check`: exit 0 after the constraints append.
- This artifact's Python generation command compared docs/constraints.md with `git show ead7d4cb3c8c98df3aa36acd93c7d29146b0ab11:docs/constraints.md` and verified that the original bytes are an unchanged prefix. The docs edit is append only.

Control artifact digest from `shasum -a 256 artifacts/agent-b/ci-canary-host-preconditions-control.mjs`: ca8bbba25424eb9beb1c87d34e2845bce5efe012957c2d411c3caa868869fe90.

```text
UNCHANGED core-operation=identical-except-gateway-and-reason canary-observations=byte-identical tests-and-workflow=byte-identical preflight-before-sinks=true
PRECONDITIONS synthetic-baseline=passed diagnostic-failures=13 single-line=true shell-syntax=passed cleanup=passed
MUTATION name=gateway-removed control=failed-as-required
MUTATION name=container-failure-ignored control=failed-as-required
MUTATION name=host-dump-check-removed control=failed-as-required
RESTORED synthetic-controls=passed live-canary=blocked actions=blocked
```

No Docker command, live canary, full npm test, Actions request, or push was performed. Post-append proof and commit outcome are reported separately because this artifact becomes immutable when referenced.

## Complete bounded source diff

Command: `git diff --unified=0 -- tests/helpers/w1-7-canary-fixture.mjs docs/constraints.md`.

```diff
diff --git a/docs/constraints.md b/docs/constraints.md
index 7ec38d5..13377b8 100644
--- a/docs/constraints.md
+++ b/docs/constraints.md
@@ -3545,0 +3546,8 @@ The revision handoff reports Actions run 34368556755 reaching core creation and
+
+### F170 revision two: container gateway and host preconditions
+
+The handoff attributes Actions run 34369284714 on `137e348` to missing container resolution of host.docker.internal. Agent-b added `--add-host=host.docker.internal:host-gateway` to the shared Docker argument list used by both canary core-operation branches. The fixture's top comment now lists the host preconditions, with checks before any canary sink runs: Docker/image and inventory access, temporary-directory and bind-mount permissions, required image tools, core pattern and PID suffix behavior, resource limits and an actual safe core dump, host readability and removal, expected Bash crash diagnostics, gateway resolution, stub port binding, and authenticated signing from both host loopback and the container. Signer probes have three-second timeouts and synthetic input. Failures have one-line requirement messages without raw transport output. The response-file probe retains the operation's default permissions so a restrictive container umask is detected.
+
+`node artifacts/agent-b/ci-canary-host-preconditions-control.mjs` exited 0: synthetic baseline and restoration passed, 13 diagnostic failure cases were classified with single-line messages, and gateway-removal, ignored-container-failure, and removed-host-core-read mutations each failed the control. The same command checked the extracted Bash syntax, confirmed the core operation is unchanged except for the mapping and its reason, and confirmed canary observations, tests, and workflow are byte-identical to starting commit `ead7d4cb3c8c98df3aa36acd93c7d29146b0ab11`. `W1_7_CASE=core-pattern npm run w1-7:test` completed with five passed, zero failed, and zero skipped, excluding live canary and database cases. `node --test tests/repository-surface-policy.test.mjs` completed with four passed, zero failed, and zero skipped. `npm run lint`, `node --check tests/helpers/w1-7-canary-fixture.mjs`, and `git diff --check` exited 0.
+
+These controls use synthetic Docker outputs and files. No live core dump, container connectivity, live canary, or Actions result was observed by agent-b. The extra safe-crash/signing preflight adds runtime that has not been measured on a Docker host. Preconditions describe the host at probe time; they cannot reserve disk capacity or prevent later host/network changes. Concurrent unrelated resource creation is still judged by the unchanged final cleanup assertions. F170 remains open and ci-green is blocked pending the dispatcher's live canary and Actions-on-main observation. Evidence: `artifacts/agent-b/ci-canary-host-preconditions-results.md`.
diff --git a/tests/helpers/w1-7-canary-fixture.mjs b/tests/helpers/w1-7-canary-fixture.mjs
index 530887d..3556552 100644
--- a/tests/helpers/w1-7-canary-fixture.mjs
+++ b/tests/helpers/w1-7-canary-fixture.mjs
@@ -0,0 +1,14 @@
+// Host preconditions, checked before any canary sink runs:
+// - Docker can run coreImage and inspect containers/volumes; its kernel uses core_pattern=core.
+// - The host can create/remove a temporary directory and chmod its dump mount; the container
+//   can write that same mount and the host can read its files, including a chmod a+r real core.
+// - The image provides bash, perl, env -u, cat, chmod, getent and timeout; core_uses_pid=0,
+//   unlimited core/file limits and the host crash policy permit a nonempty /dump/core
+//   and Bash's expected English segmentation-fault/core-dumped diagnostic.
+// - Docker supports host-gateway; host.docker.internal resolves inside the mapped container.
+// - With no KMS_TOKEN, the stub can bind 0.0.0.0:18201. Otherwise Vault is on port 8201.
+//   The chosen signer accepts synth-a/sha2-256 with the token from host loopback AND from
+//   the container gateway (including Bash /dev/tcp and HTTP response-file readability).
+// - Cleanup inventory is readable before execution. Concurrent unrelated Docker/temp creation
+//   is not fenced here; the unchanged final delta assertions still detect it after execution.
+// Each preflight failure has a one-line diagnostic; probes use only synthetic signing input.
@@ -56 +70 @@ export async function checkCanaryCorePattern(run=runCommand){
-  const {stdout}=await run("docker",["run","--rm","--entrypoint","cat",coreImage,"/proc/sys/kernel/core_pattern"]);
+  const {stdout}=await precondition("DOCKER_IMAGE","Docker must run the canary image and read kernel.core_pattern",()=>run("docker",["run","--rm","--entrypoint","cat",coreImage,"/proc/sys/kernel/core_pattern"]));
@@ -60,0 +75,43 @@ export async function checkCanaryCorePattern(run=runCommand){
+async function precondition(code,requirement,operation){
+  try{return await operation();}catch{throw new Error(`W1_7_CANARY_${code}: ${requirement}`);}
+}
+export async function checkCanaryHostPreconditions({directory,signing,containers,run=runCommand,fetchSigning=fetch}){
+  const dump=path.join(directory,"host-preflight");
+  await precondition("DUMP_DIRECTORY","host must create, chmod and remove files in its temporary dump directory",async()=>{
+    await mkdir(dump);await chmod(dump,0o777);
+    const probe=path.join(dump,"host-probe");await writeFile(probe,"host-probe");await rm(probe);
+  });
+  const body=JSON.stringify({input:Buffer.from(digest("synthetic-host-preflight")).toString("base64")});
+  await precondition("HOST_SIGNER","signer must accept synth-a/sha2-256 on host loopback with the configured token",async()=>{
+    const response=await fetchSigning(`http://127.0.0.1:${signing.port}/v1/transit/sign/synth-a/sha2-256`,{method:"POST",headers:{"x-vault-token":signing.token,"content-type":"application/json"},body,signal:AbortSignal.timeout(3000)});
+    if(!response.ok||!/^vault:v\d+:/.test((await response.json())?.data?.signature??""))throw new Error("signer refused");
+  });
+  // Run a safe crash and signing probe on the same mount, image, limits and gateway as coreOperation.
+  const command=String.raw`fail(){ printf 'W1_7_PREFLIGHT:%s\n' "$1"; exit 1; }
+for tool in perl env cat chmod getent timeout; do command -v "$tool" >/dev/null || fail TOOLS; done
+env -u KMS_TOKEN -u KMS_PORT -u SIGN_BODY perl -e 'exit 0' || fail TOOLS
+test "$(cat /proc/sys/kernel/core_uses_pid)" = 0 || fail CORE_USES_PID
+test "$(ulimit -c)" = unlimited && test "$(ulimit -f)" = unlimited || fail CORE_LIMITS
+getent hosts host.docker.internal >/dev/null || fail HOST_RESOLUTION
+printf mount-probe > /dump/mount-probe || fail DUMP_MOUNT
+chmod a+r /dump/mount-probe || fail DUMP_READABILITY
+env -u KMS_TOKEN -u KMS_PORT -u SIGN_BODY perl -e '$held="synthetic-host-preflight"; kill 11,$$; sleep 1'
+crash_rc=$?
+test "$crash_rc" -ne 0 && test -s /dump/core || fail CORE_DUMP
+chmod a+r /dump/core || fail DUMP_READABILITY
+timeout 3 bash -c 'exec 3<>/dev/tcp/host.docker.internal/$KMS_PORT || exit 1; printf "POST /v1/transit/sign/synth-a/sha2-256 HTTP/1.1\r\nHost: host.docker.internal:%s\r\nX-Vault-Token: %s\r\ncontent-type: application/json\r\nContent-Length: %s\r\nConnection: close\r\n\r\n%s" "$KMS_PORT" "$KMS_TOKEN" "${"${#SIGN_BODY}"}" "$SIGN_BODY" >&3; cat <&3 > /dump/sign-response' || fail CONTAINER_SIGNER`;
+  const requirements={TOOLS:"image must provide bash, perl, env -u, cat, chmod, getent and timeout",CORE_USES_PID:"host kernel.core_uses_pid must be 0 for /dump/core",CORE_LIMITS:"container core and file size limits must be unlimited",HOST_RESOLUTION:"host.docker.internal must resolve through the Docker host-gateway mapping",DUMP_MOUNT:"container must write the host temporary directory mounted at /dump",DUMP_READABILITY:"container must make dump files readable by the host user",CORE_DUMP:"host crash policy and dump storage must allow a nonempty /dump/core",CONTAINER_SIGNER:"container Bash /dev/tcp must reach the host signer and read its HTTP response within 3 seconds"};
+  const name=`engram-canary-preflight-${process.pid}-${Math.random().toString(16).slice(2)}`;
+  containers.add(name);
+  const result=await precondition("CONTAINER_RUNTIME","Docker must start bash with the dump mount, core limit and host-gateway mapping",()=>run("docker",["run","--rm","--name",name,"--add-host=host.docker.internal:host-gateway","--ulimit","core=-1","-v",`${dump}:/dump`,"-w","/dump","-e",`KMS_TOKEN=${signing.token}`,"-e",`KMS_PORT=${signing.port}`,"-e",`SIGN_BODY=${body}`,"--entrypoint","bash",coreImage,"-c",command],{allowFailure:true}));
+  if(result.code!==0){const code=result.stdout.match(/^W1_7_PREFLIGHT:([A-Z_]+)$/m)?.[1];throw new Error(`W1_7_CANARY_${code&&requirements[code]?code:"CONTAINER_RUNTIME"}: ${requirements[code]??"Docker must run the preflight image with bash, mount, limits and host-gateway"}`);}
+  containers.delete(name);
+  if(!/Segmentation fault\s+\(core dumped\)/.test(result.stderr))throw new Error("W1_7_CANARY_CORE_DIAGNOSTIC: Bash must report Segmentation fault (core dumped) for the forced crash");
+  await precondition("HOST_DUMP_READ","host must read the mounted marker, nonempty real core and successful container signing response",async()=>{
+    if(await readFile(path.join(dump,"mount-probe"),"utf8")!=="mount-probe")throw new Error("mount mismatch");
+    if(!(await readFile(path.join(dump,"core"))).length)throw new Error("empty core");
+    const response=await readFile(path.join(dump,"sign-response"),"utf8");
+    if(!/^HTTP\/1\.[01] 200\b/.test(response)||!/vault:v\d+:[^"\\]+/.test(response))throw new Error("signer refused");
+  });
+  await precondition("DUMP_CLEANUP","host must remove container-created dump files",()=>rm(dump,{recursive:true}));
+}
@@ -65 +122,2 @@ async function coreOperation(root,material,containers,{digest:knownDigest=null,t
-  const args=["run","--rm","--name",name,"--ulimit","core=-1","-v",`${dump}:/dump`,"-w","/dump",...envArgs,"--entrypoint","bash",coreImage,"-c",command];const result=await runCommand("docker",args,{allowFailure:true});containers.delete(name);assert.notEqual(result.code,0,"forced crash must exit nonzero");assert.match(result.stderr,/Segmentation fault\s+\(core dumped\)/);await readFile(path.join(dump,"core"));if(vulnerable)return {};
+  // Actions run 34369284714: Linux Docker needs this mapping for the protected KMS request.
+  const args=["run","--rm","--name",name,"--add-host=host.docker.internal:host-gateway","--ulimit","core=-1","-v",`${dump}:/dump`,"-w","/dump",...envArgs,"--entrypoint","bash",coreImage,"-c",command];const result=await runCommand("docker",args,{allowFailure:true});containers.delete(name);assert.notEqual(result.code,0,"forced crash must exit nonzero");assert.match(result.stderr,/Segmentation fault\s+\(core dumped\)/);await readFile(path.join(dump,"core"));if(vulnerable)return {};
@@ -73,2 +131,2 @@ export async function runCanaryFixture({moduleRoot,boundary,corePatternCommand=r
-  const cleanupBefore=await cleanupSnapshot();
-  const directory=await mkdtemp(path.join(os.tmpdir(),"engram-canary-"));
+  const cleanupBefore=await precondition("CLEANUP_INVENTORY","Docker container/volume lists and host temporary directory must be readable",cleanupSnapshot);
+  const directory=await precondition("TEMP_DIRECTORY","host temporary directory must be writable",()=>mkdtemp(path.join(os.tmpdir(),"engram-canary-")));
@@ -86 +144,2 @@ export async function runCanaryFixture({moduleRoot,boundary,corePatternCommand=r
-    signing=await startSigningContext();
+    signing=await precondition("SIGNER_LISTENER","local stub must bind 0.0.0.0:18201 when KMS_TOKEN is absent",startSigningContext);
+    await checkCanaryHostPreconditions({directory,signing,containers});
```
