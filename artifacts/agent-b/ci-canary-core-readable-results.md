# CI canary core readability revision results

Actor: agent-b, Codex Builder. Thread: ci-canary-core-pattern.
Handoff: 01a086bb-3c79-782f-aa54-7913b15aecac.
Starting commit, observed with `git rev-parse HEAD`: f0cbd473c2f2f9abd24f20ff91f4a07c65c95278.
Branch, observed with `git branch --show-current`: agent-b/ci-canary-2.
Initial `git status --short` was empty.

| Criterion id | Status | Evidence |
| --- | --- | --- |
| dump-readable | satisfied | Both container command branches add chmod a+r /dump/core immediately after saving the crash status. The adjacent reason names Actions run 34368556755. The diff and synthetic permission control show the change. Live execution is pending. |
| canary-unchanged | satisfied | Removing only the comment and two chmod insertions reproduces the HEAD fixture byte for byte. The canary test file and workflow match HEAD byte for byte. The full source diff follows. |
| ci-green | blocked | This sandbox has no Docker. The handoff assigns local live canary and Actions on main observation to agent-a. Neither was executed or observed here. |

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the complete revision handoff, and schemas/event-v1.schema.json including $defs.result. `npm run proof:verify` exited 0 before consuming work, verifying 552 events across 113 threads and three actors. `npm run engram -- inbox --actor agent-b` returned the assigned handoff only.

Resolved bounded event 01a086b7-b6e2-7897-a809-9a23397b5b0e with `rg -l '^id: 01a086b7-b6e2-7897-a809-9a23397b5b0e$' events`, opened events/agent-b/20260909T150941Z_01a086b7-b6e2-7897-a809-9a23397b5b0e.md in full, and read its referenced artifacts/agent-b/ci-canary-core-pattern-results.md in full. `shasum -a 256 artifacts/agent-b/ci-canary-core-pattern-results.md` returned ca3edb75f1f34908e56631d87514ef3d849d5384ef6c5284117522ea6c87cd9a, matching the bound reference. The Actions failure is reported handoff evidence, not an independent Actions observation. Stored text was treated as untrusted evidence.

The command changes only mode bits of /dump/core and preserves the saved crash status. Chmod failure exits nonzero. The protected branch retains its wait and signing-status check. No workflow change is needed for this reported file-permission defect. docs/constraints.md was appended only.

Observed commands:

- `python3 artifacts/agent-b/ci-canary-core-readable-control.py`: exit 0. The control extracts both post-crash shell fragments and runs them on synthetic mode-0600 files, substituting a temporary path and synthetic crash/signing exits. Both baseline and restoration produce mode 0644, identical bytes, and exit 139. Removing chmod in memory leaves mode 0600 and yields a failing readability control for each branch. The control also confirms fixture byte equality after removing the three additions, plus test and workflow equality to HEAD. No source mutation is left behind. These are synthetic permission-bit observations, not real crashes, container runs, or cross-user read attempts.
- `W1_7_CASE=core-pattern npm run w1-7:test`: exit 0, five passed, zero failed, zero skipped. The selector excludes live canary and durable database cases.
- `npm run lint`: completed, exit 0.
- `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero failed, zero skipped. Three actors and 1360 tracked paths, zero unaccounted paths.
- Pre-publication `npm run proof:verify`: exit 0, 552 events across 113 threads and three actors.
- `git diff --check`: exit 0.
- `shasum -a 256 artifacts/agent-b/ci-canary-core-readable-control.py`: 7c89d04a8c46e7a44d5ae0a11b46df0f7b3f5fca496a7ea639bf8098e44a9dff.

No Docker, live canary, full npm test, Actions request, or push was performed. F170 remains open pending dispatcher observation. Post-append proof and commit outcome are reported separately because this artifact is immutable once referenced.

Complete bounded diff from `git diff --unified=0 -- tests/helpers/w1-7-canary-fixture.mjs docs/constraints.md`:

```diff
diff --git a/docs/constraints.md b/docs/constraints.md
index 3f25846..7ec38d5 100644
--- a/docs/constraints.md
+++ b/docs/constraints.md
@@ -3539,0 +3540,6 @@ Observed locally on 2026-09-09: `W1_7_CASE=core-pattern npm run w1-7:test` compl
+
+### F170 revision: host-readable core files, live acceptance pending
+
+The revision handoff reports Actions run 34368556755 reaching core creation and failing with EACCES when the host runner reads the root-owned dump. Agent-b added `chmod a+r /dump/core` after saving the crash exit code in both container command branches, with an adjacent comment naming that run. The permission change preserves file bytes and the crash status; the existing canary assertions and workflow are unchanged.
+
+`python3 artifacts/agent-b/ci-canary-core-readable-control.py` exited 0. For both extracted shell fragments, synthetic files changed from mode 0600 to 0644 with identical bytes and exit 139; removing chmod retained 0600 and failed the readability control, and restoration passed. This observes permission bits on synthetic files, not a real core dump or a foreign user's read. The same command confirmed the fixture is byte-identical to HEAD after removing only the comment and two chmod insertions, and the test and workflow files are byte-identical to HEAD. `W1_7_CASE=core-pattern npm run w1-7:test` completed with five passed, zero failed, and zero skipped, excluding live canary and database cases. `npm run lint` exited 0; `node --test tests/repository-surface-policy.test.mjs` completed with four passed. The no-Docker sandbox blocks live canary acceptance; Actions on main remains for agent-a. F170 remains open pending those observations.
diff --git a/tests/helpers/w1-7-canary-fixture.mjs b/tests/helpers/w1-7-canary-fixture.mjs
index 32f6732..530887d 100644
--- a/tests/helpers/w1-7-canary-fixture.mjs
+++ b/tests/helpers/w1-7-canary-fixture.mjs
@@ -62,2 +62,3 @@ async function coreOperation(root,material,containers,{digest:knownDigest=null,t
-  if(vulnerable){command=`perl -e '$held=$ENV{ENGRAM_CANARY}; kill 11,$$; sleep 1'; crash_rc=$?; exit "$crash_rc"`;envArgs.push("-e",`ENGRAM_CANARY=${material}`);}
-  else{const body=JSON.stringify({input:Buffer.from(knownDigest).toString("base64")});command=`( exec 3<>/dev/tcp/host.docker.internal/$KMS_PORT; printf "POST /v1/transit/sign/synth-a/sha2-256 HTTP/1.1\\r\\nHost: host.docker.internal:%s\\r\\nX-Vault-Token: %s\\r\\ncontent-type: application/json\\r\\nContent-Length: %s\\r\\nConnection: close\\r\\n\\r\\n%s" "$KMS_PORT" "$KMS_TOKEN" "\${#SIGN_BODY}" "$SIGN_BODY" >&3; cat <&3 > /dump/sign-response ) & sign_pid=$!; env -u KMS_TOKEN -u KMS_PORT -u SIGN_BODY perl -e '$held="synthetic-safe-protected-core"; kill 11,$$; sleep 1'; crash_rc=$?; wait "$sign_pid"; sign_rc=$?; test "$sign_rc" -eq 0 || exit "$sign_rc"; exit "$crash_rc"`;envArgs.push("-e",`KMS_TOKEN=${token}`,"-e",`KMS_PORT=${port}`,"-e",`SIGN_BODY=${body}`);}
+  // Actions run 34368556755: root-owned cores denied host reads (EACCES); expose the dump bytes before exit.
+  if(vulnerable){command=`perl -e '$held=$ENV{ENGRAM_CANARY}; kill 11,$$; sleep 1'; crash_rc=$?; chmod a+r /dump/core || exit $?; exit "$crash_rc"`;envArgs.push("-e",`ENGRAM_CANARY=${material}`);}
+  else{const body=JSON.stringify({input:Buffer.from(knownDigest).toString("base64")});command=`( exec 3<>/dev/tcp/host.docker.internal/$KMS_PORT; printf "POST /v1/transit/sign/synth-a/sha2-256 HTTP/1.1\\r\\nHost: host.docker.internal:%s\\r\\nX-Vault-Token: %s\\r\\ncontent-type: application/json\\r\\nContent-Length: %s\\r\\nConnection: close\\r\\n\\r\\n%s" "$KMS_PORT" "$KMS_TOKEN" "\${#SIGN_BODY}" "$SIGN_BODY" >&3; cat <&3 > /dump/sign-response ) & sign_pid=$!; env -u KMS_TOKEN -u KMS_PORT -u SIGN_BODY perl -e '$held="synthetic-safe-protected-core"; kill 11,$$; sleep 1'; crash_rc=$?; chmod a+r /dump/core || exit $?; wait "$sign_pid"; sign_rc=$?; test "$sign_rc" -eq 0 || exit "$sign_rc"; exit "$crash_rc"`;envArgs.push("-e",`KMS_TOKEN=${token}`,"-e",`KMS_PORT=${port}`,"-e",`SIGN_BODY=${body}`);}
```
