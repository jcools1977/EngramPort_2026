# LEX PR 2 review fixes

Actor: agent-b, Codex Builder. Thread: lex-pr2-review-fixes.
Handoff: events/agent-a/20260910T154446Z_01a08bfe-2ece-747f-b30b-3a54d729156e.md.
EngramPort HEAD: e2e8376a8cd6a4dfdca376a40f4f20c9dfbac20b, branch agent-b/lex-pr2.
LEX HEAD: 503c7655a8524044b4cf4414efcc7a3918d5f931, detached HEAD as observed by git status --short --branch. Both worktrees started clean. The branch/checkout state was left unchanged.

| Criterion id | Status | Observed evidence |
| --- | --- | --- |
| bound-reachable | satisfied | Nick's unchanged reproduction observes false/allowed in a real disposable dirty Git tree. The actual fixed runner observes true/refused and resets and cleans the rogue file. Replacing its caller with Nick's verbatim original logic is rejected by the same observer; restoring the fixed source passes. Permanent tests retain the credited original reproduction. |
| sandbox-restored | satisfied | Diff restores --restricted, --tools, coordination-only Bash --allowedTools, and cwd DIR. The adjacent comment names sandbox and backstop. The synthetic spawn observer confirms the actual default argument vector and cwd; custom arguments still work. |
| gate-still-green | satisfied | node bin/lex-run.mjs --demonstrate-bounds exits 0 on darwin with all nine checks and every bound fires on this platform, after installing SDK 0.3.0. |
| carries-0-3-0 | satisfied | package.json and lock root specify ^0.3.0; the lock resolves 0.3.0. A clean offline npm ci succeeds and npm ls @engramport/sdk reports 0.3.0. |

## Admission and evidence resolution

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full handoff envelope and body, and schemas/event-v1.schema.json including $defs.result. Initial npm run proof:verify exited 0: verified 561 events across 114 threads and three actors. npm run engram -- inbox --actor agent-b listed only the named handoff. The same commands passed with that count and inbox immediately before publication preparation.

Resolved bounded_context event id 01a086d8-61cd-7456-a2e8-4450d88bbb64 to events/agent-b/20260909T154522Z_01a086d8-61cd-7456-a2e8-4450d88bbb64.md and read it in full. Read its artifact artifacts/agent-b/ci-canary-sdk-r4-results.md in full. shasum -a 256 returned 16e1086bfc3915aff9ef3a67e196b14f1cab0261c032c2b80ec1fb1a2b8e35e4, matching the event's digest. Historical CI claims were not adopted as current observations.

Read F171 in docs/constraints.md. The review files are absent from the PR worktree and present in /Users/an2b/an2b/products/lex-service/coordination. Read both in full before implementation, along with their citing nick-agent events 01a08bfb-c11f-7403-b0a3-3c960a067dec and 01a08bfc-0eb9-7a58-9d5e-14b23d88ee7e. Those events cite paths in prose without artifact digest fields. Computed source digests with shasum -a 256:

- artifacts/nick-agent/2026-09-10_pr2-review.md: bb63c30c6888ac9194b80e514f47f52badd15360f84bddb89781073d88f5d784
- artifacts/nick-agent/2026-09-10_pr2-repro.mjs: 8e373fbc67324307de7bbc4423f6b672254888ec61edce2c53a0f1b57ff20f0e

The permanent tests/fixtures/pr2-nick-repro.mjs has the exact latter digest. Source attribution is in tests/lex-run.test.mjs. Nick's original script always contains the unfixed expression, so it is retained unchanged as the negative control. The fixed comparison exercises the actual runner with the same two planted paths, not an edited claim that the original script automatically reads current runner source.

## Implementation and test boundaries

Changed only coordination/bin/lex-run.mjs, coordination/package.json, coordination/package-lock.json, and coordination/tests/ in the LEX worktree. No LEX log events or artifacts were created or changed. No real agent was invoked. No commit or push was made in either worktree.

The changed-path observer uses Git porcelain v1 with NUL delimiters and all untracked files. Every path stays repository-relative; allowed prefixes and the actor event prefix are made repository-relative with REL. Both paths of a rename/copy are retained. This avoids dropping outside paths or confusing an outside events/nick-agent path with coordination/events/nick-agent. Existing reset --hard and clean execute on refusal before any staging. New tests cover prefix lookalikes, spaces, quotes, a newline filename, and a staged rename from outside into an allowed prefix.

The actual runner entry point is copied into a disposable harness. Its SDK wrapper records the real decideTurnAfter input and result. A synthetic spawn plants Nick's event and rogue file in a disposable Git repository. Real Git status/reset/clean commands run there. A preload intercepts publication commands and replaces the home-directory lookup so the runner cannot publish or write live rate state. The fixture's initial synthetic commit exists only in the temporary repository. Notifications are replaced with a no-op. The positive and unfixed controls observe intercepted publication calls, not actual commits or pushes. The default argument check does not establish a real agent CLI's enforcement of its flags; the criterion requests the restored spawn configuration shown by diff.

## Commands and observed results

All following LEX commands ran from /Users/an2b/an2b/products/lex-service-pr2/coordination unless otherwise stated.

1. node -v: v26.5.0.
2. npm install --ignore-scripts --save '@engramport/sdk@^0.3.0' --cache /private/tmp/lex-pr2-npm-cache --no-audit --no-fund: exit 1, ENOTFOUND registry.npmjs.org. No online registry success is claimed.
3. npm cache ls '@engramport/sdk' --offline: exit 0, listed the cached SDK 0.3.0 tarball and package metadata. An offline install against the read-only default cache returned ENOTCACHED. A Python command copied only SDK cache index entries and associated content to /private/tmp/lex-pr2-npm-cache, then npm install --offline --ignore-scripts --save '@engramport/sdk@^0.3.0' --cache /private/tmp/lex-pr2-npm-cache --no-audit --no-fund exited 0, changed one package. npm generated the registry URL and integrity in the lock.
4. The initial node --test tests/lex-run.test.mjs run on SDK 0.2.0 exited 1: one passed, five failed. The fixture interceptor incorrectly rejected the runner's initial repository-root lookup from coordination/, producing ERROR cannot read the log. A targeted rerun exposed that diagnostic. The interceptor now permits only that initial lookup from DIR and keeps later Git commands constrained to the disposable repository. After this fixture repair, the command exited 0 with six passed, zero failed, zero skipped on 0.2.0.
5. npm ci --offline --ignore-scripts --cache /private/tmp/lex-pr2-npm-cache --no-audit --no-fund: exit 0, added one package. Existing node_modules was present at session start; this later clean install verifies the updated lock.
6. npm test, after that clean 0.3.0 install: exit 0, six tests, six passed, zero failed, zero skipped. Selected exact output:

```text
git sees the rogue write: YES
the check inspects:  ["events/nick-agent/REPRO_EVENT.md"]
wroteOutsideAllowedPrefixes -> false
publishedEvent              -> true
decideTurnAfter -> {"allowed":true,"refusal":null}
FIXED wroteOutsideAllowedPrefixes -> true; decideTurnAfter -> {"allowed":false,"refusal":"write-outside-allowed-prefixes"}; rogue reverted=true; tree clean=true; no publication commands
UNFIXED wroteOutsideAllowedPrefixes -> false; allowed=true; rogue retained; publication calls intercepted; mutation killed; restored source passed
```

The unchanged reproduction's printed sentence about a rogue write being committed and pushed describes the path it predicts. It does not report an external effect. The reproduction itself deletes its two files, and the test asserts a clean tree afterward.

7. node bin/lex-run.mjs --demonstrate-bounds: exit 0, exact output:

```text
platform: darwin

  ok   kill switch present        -> kill-switch-present
  ok   actor is a human seat      -> actor-is-a-human-seat
  ok   working tree dirty         -> working-tree-dirty
  ok   rate ledger unreadable     -> rate-ledger-unreadable
  ok   rate limit reached         -> rate-limit-reached
  ok   thread depth at cap        -> thread-depth-cap-reached
  ok   no open turn               -> no-open-turn-for-actor
  ok   wrote outside prefixes     -> write-outside-allowed-prefixes
  ok   published nothing          -> agent-published-nothing

every bound fires on this platform
```

8. npm ls @engramport/sdk: exit 0, @engramport/sdk@0.3.0 under lex-coordination@0.1.0.
9. git diff --check: exit 0 in both worktrees. git status --short in LEX showed only the three modified files and new tests directory listed above.
10. git add -- bin/lex-run.mjs package.json package-lock.json tests/lex-run.test.mjs tests/fixtures/pr2-nick-repro.mjs: exit 128, unable to create /Users/an2b/an2b/products/lex-service/.git/worktrees/lex-service-pr2/index.lock: Operation not permitted. LEX changes remain unstaged for the dispatcher. No attempt to bypass the sandbox was made.

The user's final instruction reserves all commits for the dispatcher and overrides the earlier commit step. scripts/agent-commit was not invoked. Post-append EngramPort proof and staging results will be reported separately because this artifact becomes immutable when referenced. No Windows run, live agent confinement test, full LEX product suite, deployment, or external publication is claimed.

## Final source digests

Command: shasum -a 256 bin/lex-run.mjs package.json package-lock.json tests/lex-run.test.mjs tests/fixtures/pr2-nick-repro.mjs.

```text
1fe31fac9868da598a821e5213d31e35a5991d009166e26d8f14ce43a324aba5  bin/lex-run.mjs
db45fb89400e0a0b2b482cf19609112fdfcabdf68db18e87b20daa16e1f99151  package.json
fefa6981852484142506ebe53b08b1299aaca678a8bca3f7a8ef2e269e3769ff  package-lock.json
578a4e34cf790659601ce263eac1be2361fdb38965560e6631a5f48ef345ad83  tests/lex-run.test.mjs
8e373fbc67324307de7bbc4423f6b672254888ec61edce2c53a0f1b57ff20f0e  tests/fixtures/pr2-nick-repro.mjs
```

## Shared tracked diff

Command: git diff -- bin/lex-run.mjs package.json package-lock.json.

```diff
diff --git a/coordination/bin/lex-run.mjs b/coordination/bin/lex-run.mjs
index c912ff1..d475b1d 100755
--- a/coordination/bin/lex-run.mjs
+++ b/coordination/bin/lex-run.mjs
@@ -167,17 +167,29 @@ Write only under: ${PREFIXES.join(", ")}. Do not commit or push; the runner does
 checking your work. Check the append succeeded: it prints a path on success and REFUSED with a
 nonzero exit on failure, and the refusal path also computes a path, so a path is not evidence.`;
 
-const args = JSON.parse(process.env.LEX_AGENT_ARGS || '["-p","{PROMPT}"]').map((a) => a.replace("{PROMPT}", prompt));
-const child = spawn(cmd, args, { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] });
+// The sandbox is the restricted default invocation in DIR, with shell access
+// limited to the coordination CLI. The post-turn path check is the backstop.
+// Other agent CLIs can supply their own confinement through LEX_AGENT_ARGS.
+const args = JSON.parse(process.env.LEX_AGENT_ARGS || '["-p","{PROMPT}","--restricted","--tools","Bash,Read,Write,Edit,Glob,Grep","--allowedTools","Bash(node bin/engram:*)","Read","Write","Edit","Glob","Grep"]').map((a) => a.replace("{PROMPT}", prompt));
+const child = spawn(cmd, args, { cwd: DIR, stdio: ["ignore", "pipe", "pipe"] });
 const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT * 1000);
 const rc = await new Promise((r) => child.on("close", r)).catch(() => 1);
 clearTimeout(timer);
 log(`AGENT exited rc=${rc}`);
 
-const changed = git("status", "--porcelain").split("\n").filter(Boolean).map((l) => l.slice(3).trim()).filter((p) => !REL || p.startsWith(REL)).map((p) => p.slice(REL.length));
+// Keep every repository-relative path, including both sides of a rename/copy.
+// NUL records preserve spaces, newlines, and quoted names; -uall lists new files.
+const records = git("status", "--porcelain=v1", "-z", "--untracked-files=all").split("\0");
+const changed = [];
+for (let i = 0; i < records.length; i++) {
+  const record = records[i];
+  if (!record) continue;
+  changed.push(record.slice(3));
+  if (/[RC]/.test(record.slice(0, 2))) changed.push(records[++i]);
+}
 const after = decideAfter({
-  wroteOutsideAllowedPrefixes: changed.some((p) => !PREFIXES.some((pre) => p === pre || p.startsWith(pre.replace(/\/$/, "") + "/"))),
-  publishedEvent: changed.some((p) => p.startsWith(`events/${ACTOR}/`)),
+  wroteOutsideAllowedPrefixes: changed.some((p) => !PREFIXES.some((pre) => p === REL + pre || p.startsWith(REL + pre.replace(/\/$/, "") + "/"))),
+  publishedEvent: changed.some((p) => p.startsWith(`${REL}events/${ACTOR}/`)),
 });
 if (!after.allowed) {
   execFileSync("git", ["reset", "-q", "--hard", before], { cwd: REPO });
diff --git a/coordination/package-lock.json b/coordination/package-lock.json
index e2458cc..2765e3c 100644
--- a/coordination/package-lock.json
+++ b/coordination/package-lock.json
@@ -8,7 +8,7 @@
       "name": "lex-coordination",
       "version": "0.1.0",
       "dependencies": {
-        "@engramport/sdk": "^0.2.0"
+        "@engramport/sdk": "^0.3.0"
       },
       "bin": {
         "engram": "bin/engram"
@@ -18,10 +18,13 @@
       }
     },
     "node_modules/@engramport/sdk": {
-      "version": "0.2.0",
-      "resolved": "https://registry.npmjs.org/@engramport/sdk/-/sdk-0.2.0.tgz",
-      "integrity": "sha512-ou6Uie8c3Yqlyvsh4sRgvjB3WNaU7huIEqaV+I/ZLFdhCbuMfnIwHAhfDsca2MGYw+CIxJdmpEXNWwZZdWX90w==",
+      "version": "0.3.0",
+      "resolved": "https://registry.npmjs.org/@engramport/sdk/-/sdk-0.3.0.tgz",
+      "integrity": "sha512-tGmUR9Tdj7m6Z9ezQHJorOgxFxhrXkn5aI4wdHfb/OEPVOxfKc0PaPSOpXNAJcp/hrN7oMm+I+lXU64pB3IItA==",
       "license": "MIT",
+      "bin": {
+        "engram": "dist/cli.mjs"
+      },
       "engines": {
         "node": ">=22.13.0"
       }
diff --git a/coordination/package.json b/coordination/package.json
index bac79ab..5aa419c 100644
--- a/coordination/package.json
+++ b/coordination/package.json
@@ -8,12 +8,13 @@
     "engram": "./bin/engram"
   },
   "scripts": {
+    "test": "node --test tests/lex-run.test.mjs",
     "inbox": "node bin/engram inbox",
     "append": "node bin/engram append",
     "bounds": "node bin/lex-run.mjs --demonstrate-bounds"
   },
   "dependencies": {
-    "@engramport/sdk": "^0.2.0"
+    "@engramport/sdk": "^0.3.0"
   },
   "engines": {
     "node": ">=22.13.0"
```
