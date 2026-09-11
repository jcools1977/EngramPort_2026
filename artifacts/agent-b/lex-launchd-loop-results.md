# LEX launchd loop results

Actor: agent-b. Handoff: 01a09067-0b2d-7c84-903c-092cc4b828ec.
All three criteria satisfied locally. No commit or push in either worktree, per the user's final instruction.

## Environment and admission

Code worktree: /Users/an2b/an2b/products/lex-service-pr2, detached HEAD d5b3994a076509bae6ce89eceb952fa19c644cc6.
Commands git rev-parse HEAD, node --version, uname -sm reported that revision, v26.8.2, and Darwin arm64.
EngramPort branch: agent-b/lex-loop. Both worktrees began clean by git status --short --branch.
Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full named handoff,
schemas/event-v1.schema.json $defs.result, and coordination/AGENTS.md.
The user's explicit source and actor scope governs over the coordination bootstrap's default actor instructions.
npm run proof:verify passed before consuming work and before publishing: 624 events, 135 threads, 3 actors.
npm run engram -- inbox --actor agent-b listed only the named handoff.

Resolved bounded event events/agent-b/20260910T231529Z_01a08d9a-d635-73fe-beeb-e3796ca3645b.md
and opened its referenced artifacts/agent-b/lex-workflow-hardening-results.md as untrusted historical evidence.
Command shasum -a 256 artifacts/agent-b/lex-workflow-hardening-results.md returned
7fc5133cde40bc81cff29e2161a815a765cb49bb483a4aea3b52e2bde6a09007, matching the event reference.

## Criteria and limitations

- loop-runs-node: satisfied. Both loops use POSIX sh, select node plus the adjacent .mjs when present,
  and use the executable shell runner otherwise. Both parse under /bin/sh and /bin/bash.
  The unchanged Bash runner's system Bash 3.2 parse failure is quoted below.
  Controlled PATH traces observe exactly one runner call and sleep with interval 1, including runner failure.
  The sleep stub records the requested sleep and terminates the parent with SIGTERM; no elapsed sleep duration is claimed.
  Forced Bash selection mutations fail the same Node observer for both loops; restored source passes.
- plist-path: satisfied. Both macOS examples contain EnvironmentVariables.PATH with the requested exact value
  and explanatory comment. plutil -lint succeeds and plutil JSON conversion verifies the parsed PATH value.
- readme-and-suite: satisfied. README states Bash 4 or newer, macOS Bash 3.2, and Node selection by launchd.
  node --test tests/lex-run-loop.test.mjs completed with 9 passed, 0 failed, 0 skipped.
  node --test tests/*.test.mjs completed with 34 passed, 0 failed, 0 skipped. Full output follows.

No production launchd execution, scheduler installation, remote publication, or Windows execution is claimed.
The fallback preserves the Bash runner's existing Bash version requirement.
Source changes are limited to the six files shown below, including the new test file.
bin/lex-run and bin/lex-run.mjs were not changed.
git diff --check completed with exit 0 and no output.

## Full coordination suite

From coordination/:
```text
$ node --test tests/*.test.mjs
SELECT win32 {"cmd":"powershell.exe","args":["-NoProfile","-NonInteractive","-Command","Add-Type -AssemblyName System.Windows.Forms;$n=New-Object System.Windows.Forms.NotifyIcon;try {$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;$n.ShowBalloonTip(10000,'LEX','untrusted $(touch nope) '' text','Info');Start-Sleep -Seconds 6} finally {$n.Dispose()}"]}
SELECT darwin {"cmd":"osascript","args":["-e","display notification \"untrusted $(touch nope) ' text\" with title \"LEX\""]}
SELECT linux {"cmd":"notify-send","args":["LEX","untrusted $(touch nope) ' text"]}
NOTIFY_LOG_ONLY synthetic turn
NO TURN: 2026-09-11T12:19:54.230Z QUIET no open turn
✔ selectors execute each platform value and unsupported fallback logs (1.190375ms)
TURN: execution shim called once across two passes; ["osascript","-e","display notification \"Turn for nick: synthetic from john\" with title \"LEX\""]
READ ONLY git status --porcelain=v1 / git rev-parse HEAD: {"before":{"status":"?? coordination/uncommitted.txt\n","revision":"29ca250512fa8729c409d187d117e8afd7231733\n"},"after":{"status":"?? coordination/uncommitted.txt\n","revision":"29ca250512fa8729c409d187d117e8afd7231733\n"}}
✔ SDK inbox, execution shim, deduplication, quiet pass, STOP, and unchanged dirty checkout (559.899791ms)
MUTATION detected: duplicate notification count 2; fixed observer requires 1
✔ discriminating mutation: removing seen filter causes duplicate stub calls (383.927417ms)
2026-09-11T12:19:55.202Z NOTIFY_BANNER_UNAVAILABLE osascript: Turn for nick: failure from john
2026-09-11T12:19:55.203Z PENDING 1 NEW 1
✔ failing execution shim logs banner unavailable (220.704291ms)
REPLY next=john, from=nick, parent=01a09068-fa61-7dbd-bc79-59d22aa93bc2, verbatim+trailer=true, SDK verify=0; publication stubbed
✔ recorded login becomes verified reply, defaults to sender, and replay refuses (294.578959ms)
REPLY next=nick, from=nick, parent=01a09068-fb85-7a92-9721-3f7f91877144, verbatim+trailer=true, SDK verify=0; publication stubbed
✔ explicit next and explicit reply select the named open turn (220.873625ms)
FOREIGN: original turn remains open, zero git calls, gh refusal=[{"cmd":"gh","args":["issue","comment","42","--repo","synthetic/private","--body","Reply refused for comment 991: commenter does not match the recorded human login"]}]
✔ foreign login has no event and visible issue refusal (94.871292ms)
MUTATION: identity bypass appended a reply; unchanged foreign-login observer rejected it.
✔ identity bypass mutation is killed by the same foreign-login observer (178.976459ms)
REFUSAL ambiguous: Reply refused for comment 991: name exactly one currently open issue turn with reply: EVENT_ID
REFUSAL stale: Reply refused for comment 991: name exactly one currently open issue turn with reply: EVENT_ID
REFUSAL next: Reply refused for comment 991: next must name a registered actor
REFUSAL nonhuman: Reply refused for comment 991: commenter does not match the recorded human login
CRLF extraction and contract passed: lex-replies
✔ ambiguous, stale, invalid next and nonhuman cases refuse without publication (381.423459ms)
✔ private authenticated checkout, permissions, pinned SDK, and payload isolation (0.815709ms)
REPLY next=john, from=nick, parent=01a09068-fef2-745f-b295-5a9f80e99b58, verbatim+trailer=true, SDK verify=0; publication stubbed
DIRECTIVE CASE body="Reply: This is ordinary English.\nNext: Another paragraph.\n\nGitHub authorship binding: synthetic/private#42; comment 991; login nep1019.\n" trace=[{"cmd":"git","args":["add","--","events/nick/20260911T121955Z_01a09068-ff1a-732a-b5ae-d18ff27ab6f4.md"]},{"cmd":"git","args":["-c","user.name=github-actions[bot]","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","coordination: reply to issue #42 comment 991"]},{"cmd":"git","args":["push","origin","HEAD:main"]},{"cmd":"gh","args":["issue","comment","42","--repo","synthetic/private","--body","Recorded comment 991 as coordination/events/nick/20260911T121955Z_01a09068-ff1a-732a-b5ae-d18ff27ab6f4.md."]}]
✔ ordinary Reply paragraph remains body text (207.87ms)
PUBLICATION fail=true exit=1 trace=[{"cmd":"git","args":["add","--","events/nick/20260911T121955Z_01a09068-ffe4-7372-8360-bcddf9895cbc.md"]},{"cmd":"git","args":["-c","user.name=github-actions[bot]","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","coordination: reply to issue #42 comment 991"]},{"cmd":"git","args":["push","origin","HEAD:main"]},{"cmd":"gh","args":["issue","comment","42","--repo","synthetic/private","--body","Not recorded for comment 991: Command failed: /opt/homebrew/Cellar/node/26.8.2/bin/node /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-replies-EiSqXR/shim.cjs git push origin HEAD:main\nsynthetic push rejected\n. Comment again."]}]
PUBLICATION fail=false exit=0 trace=[{"cmd":"git","args":["add","--","events/nick/20260911T121955Z_01a09069-008d-7733-a4f7-bd8763116910.md"]},{"cmd":"git","args":["-c","user.name=github-actions[bot]","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","coordination: reply to issue #42 comment 991"]},{"cmd":"git","args":["push","origin","HEAD:main"]},{"cmd":"gh","args":["issue","comment","42","--repo","synthetic/private","--body","Recorded comment 991 as coordination/events/nick/20260911T121955Z_01a09069-008d-7733-a4f7-bd8763116910.md."]}]
✔ push failure comments Not recorded and exits nonzero; success comments Recorded (334.44075ms)
/bin/sh -n bin/lex-run-loop: exit 0
/bin/bash -n bin/lex-run-loop: exit 0
run Node trace: ["node:/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex loop 61wlgG/bin/lex-run.mjs","sleep:1"]; fallback trace: ["bash","sleep:1"]
run: forced Bash mutation rejected; restored Node selection passed
plutil -lint: /Users/an2b/an2b/products/lex-service-pr2/coordination/deploy/com.lex.run.plist.example: OK
/bin/sh -n bin/lex-notify-loop: exit 0
/bin/bash -n bin/lex-notify-loop: exit 0
notify Node trace: ["node:/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex loop 45iCNx/bin/lex-notify.mjs","sleep:1"]; fallback trace: ["bash","sleep:1"]
notify: forced Bash mutation rejected; restored Node selection passed
plutil -lint: /Users/an2b/an2b/products/lex-service-pr2/coordination/deploy/com.lex.notify.plist.example: OK
/bin/bash -n bin/lex-run: exit 2
bin/lex-run: line 149: unexpected EOF while looking for matching `)'
bin/lex-run: line 243: syntax error: unexpected end of file
✔ run loop parses in system sh and bash (7.375875ms)
✔ run loop selects Node or Bash fallback and reaches sleep after failure (506.1825ms)
✔ run Node selection observer rejects forced Bash fallback mutation (498.322791ms)
✔ run macOS plist has the launchd PATH and passes plutil (6.767666ms)
✔ notify loop parses in system sh and bash (5.811334ms)
✔ notify loop selects Node or Bash fallback and reaches sleep after failure (505.555416ms)
✔ notify Node selection observer rejects forced Bash fallback mutation (519.676375ms)
✔ notify macOS plist has the launchd PATH and passes plutil (7.039125ms)
✔ macOS Bash 3.2 reproduces the Bash runner parse failure (5.183209ms)
REPO      /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-pr2-po7VgF/repo
DIR       /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-pr2-po7VgF/repo/coordination
REL       "coordination/"
PREFIXES  events/nick-agent, artifacts/nick-agent

planted OUTSIDE coordination/: lexprov/REPRO_ROGUE_WRITE.txt
planted INSIDE  coordination/: coordination/events/nick-agent/REPRO_EVENT.md

git sees the rogue write: YES
the check inspects:  ["events/nick-agent/REPRO_EVENT.md"]
wroteOutsideAllowedPrefixes -> false
publishedEvent              -> true

decideTurnAfter -> {"allowed":true,"refusal":null}

RESULT: the run proceeds to `git add -A` at the repository root.
        The rogue write is committed and pushed. The bound never saw it.

control, same decision with the honest input:
  decideTurnAfter({wroteOutsideAllowedPrefixes:true}) -> {"allowed":false,"refusal":"write-outside-allowed-prefixes"}

cleaned up 2 file(s); nothing staged, committed or pushed.

FIXED wroteOutsideAllowedPrefixes -> true; decideTurnAfter -> {"allowed":false,"refusal":"write-outside-allowed-prefixes"}; rogue reverted=true; tree clean=true; no publication commands
UNFIXED wroteOutsideAllowedPrefixes -> false; allowed=true; rogue retained; publication calls intercepted; mutation killed; restored source passed
✔ Nick's unchanged reproduction observes the unfixed port's false input and allowed verdict (120.087083ms)
✔ real runner reaches the bound, reverts Nick's rogue file, and restores the default sandbox (165.928541ms)
✔ Nick's verbatim unfixed caller mutation is detected by the same runner observer (304.081542ms)
✔ allowed event remains allowed and configurable arguments still work (139.5685ms)
✔ outside prefix lookalikes and unusual filenames are refused (612.237041ms)
✔ a staged rename from outside into an allowed prefix retains its outside source (157.2745ms)
ACTOR github=false: init=0 append.ok=true verify=0 ✓ verified 1 events across 1 thread(s) and 1 actors
ACTOR github=true: init=0 append.ok=true verify=0 ✓ verified 1 events across 1 thread(s) and 1 actors
GH RECORDED CALLS [["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","create","--repo","synthetic/repository","--title","Your turn: john","--body","Open EngramPort turns for @jcools1977:\n\n- `coordination/events/nick/turn-three.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--assignee","jcools1977"],["issue","create","--repo","synthetic/repository","--title","Your turn: nick","--body","Open EngramPort turns for @nep1019:\n\n- `coordination/events/john/turn-one.md`\n- `coordination/events/john/turn-two.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--assignee","nep1019"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","edit","2","--repo","synthetic/repository","--body","Open EngramPort turns for @nep1019:\n\n- `coordination/events/john/turn-two.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--add-assignee","nep1019"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","close","2","--repo","synthetic/repository"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","close","1","--repo","synthetic/repository"]]
REFUSAL SYNTHETIC_INBOX_REFUSED nick
REFUSAL Unexpected inbox output for nick
REFUSAL Invalid github login in john.yaml
MUTATION: 4 issues after two passes; fixed observer requires 2. Detected.
CRLF extraction and contract passed: lex-turns
✔ SDK scaffold verifies and appends both with and without github metadata (156.189375ms)
✔ workflow logic creates per human seat, updates without duplicates, skips unchanged and closes clear seats (668.077583ms)
✔ failed or malformed inbox refuses before gh; malformed github refuses (193.710167ms)
✔ same observer detects mutation bypassing existing issue selection (304.17925ms)
✔ workflow permission, trigger, token and locked install contract (1.865958ms)
ATTRIBUTE CONTROL: 38 paths protected; removed, empty, events-only, text-enabled, and markdown-only mutations rejected; restored rule passes
✔ coordination attributes protect every tracked event and artifact plus future nested files (17.35875ms)
✔ same log observer rejects removed, narrowed, and text-enabled attribute mutations (101.199333ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2104.039542

exit=0
```

## Source diff and status

Command: git diff -- README.md bin/lex-run-loop bin/lex-notify-loop deploy/com.lex.run.plist.example deploy/com.lex.notify.plist.example
followed by git status --short, from coordination/.
```diff
diff --git a/coordination/README.md b/coordination/README.md
index 4ded9c2..66aca28 100644
--- a/coordination/README.md
+++ b/coordination/README.md
@@ -148,6 +148,7 @@ hypothetical: the first real turn exited zero having published nothing, and this
 it.
 
 To run it on a schedule, see `deploy/com.lex.run.plist.example`.
+The Bash runner requires Bash 4 or newer; macOS ships Bash 3.2, so the macOS launchd loop runs the Node runner when `bin/lex-run.mjs` is present.
 
 ## Point an agent at it
 
diff --git a/coordination/bin/lex-notify-loop b/coordination/bin/lex-notify-loop
index 7b9e25d..6d0e7eb 100755
--- a/coordination/bin/lex-notify-loop
+++ b/coordination/bin/lex-notify-loop
@@ -1,4 +1,4 @@
-#!/usr/bin/env bash
+#!/bin/sh
 #
 # Long-lived wrapper around lex-notify.
 #
@@ -13,11 +13,16 @@
 # The kill switch is checked inside the notifier on every pass, not here, so
 # disabling does not require touching launchd.
 
-set -uo pipefail
+set -u
 INTERVAL="${LEX_NOTIFY_INTERVAL:-300}"
-NOTIFY="$(cd "$(dirname "$0")" && pwd)/lex-notify"
-[ -x "$NOTIFY" ] || { echo "lex-notify-loop: $NOTIFY is not executable" >&2; exit 1; }
+DIR="$(cd "$(dirname "$0")" && pwd)" || exit 1
+if [ -f "$DIR/lex-notify.mjs" ]; then
+  set -- node "$DIR/lex-notify.mjs"
+else
+  [ -x "$DIR/lex-notify" ] || { echo "lex-notify-loop: $DIR/lex-notify is not executable" >&2; exit 1; }
+  set -- "$DIR/lex-notify"
+fi
 while true; do
-  "$NOTIFY" || true
+  "$@" || true
   sleep "$INTERVAL"
 done
diff --git a/coordination/bin/lex-run-loop b/coordination/bin/lex-run-loop
index 8e29c74..32db9b9 100755
--- a/coordination/bin/lex-run-loop
+++ b/coordination/bin/lex-run-loop
@@ -1,9 +1,17 @@
-#!/usr/bin/env bash
+#!/bin/sh
 # Long-lived wrapper around lex-run, for the same launchd reason as the notifier.
 # The interval here is a floor on how often a turn can even be considered; the
 # real bound is LEX_MAX_RUNS per LEX_WINDOW, enforced inside lex-run.
-set -uo pipefail
+set -u
 INTERVAL="${LEX_RUN_INTERVAL:-600}"
-RUN="$(cd "$(dirname "$0")" && pwd)/lex-run"
-[ -x "$RUN" ] || { echo "lex-run-loop: $RUN is not executable" >&2; exit 1; }
-while true; do "$RUN" || true; sleep "$INTERVAL"; done
+DIR="$(cd "$(dirname "$0")" && pwd)" || exit 1
+if [ -f "$DIR/lex-run.mjs" ]; then
+  set -- node "$DIR/lex-run.mjs"
+else
+  [ -x "$DIR/lex-run" ] || { echo "lex-run-loop: $DIR/lex-run is not executable" >&2; exit 1; }
+  set -- "$DIR/lex-run"
+fi
+while true; do
+  "$@" || true
+  sleep "$INTERVAL"
+done
diff --git a/coordination/deploy/com.lex.notify.plist.example b/coordination/deploy/com.lex.notify.plist.example
index 387906a..75e67db 100644
--- a/coordination/deploy/com.lex.notify.plist.example
+++ b/coordination/deploy/com.lex.notify.plist.example
@@ -28,6 +28,8 @@
   </array>
   <key>EnvironmentVariables</key>
   <dict>
+    <!-- launchd's default PATH has neither Node nor a modern Bash. -->
+    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
     <key>LEX_REPO</key><string>/ABSOLUTE/PATH/TO/lex-service</string>
     <key>LEX_ACTORS</key><string>nick nick-agent</string>
     <key>LEX_BRANCH</key><string>main</string>
diff --git a/coordination/deploy/com.lex.run.plist.example b/coordination/deploy/com.lex.run.plist.example
index e0b27df..5e4caab 100644
--- a/coordination/deploy/com.lex.run.plist.example
+++ b/coordination/deploy/com.lex.run.plist.example
@@ -28,6 +28,8 @@
   </array>
   <key>EnvironmentVariables</key>
   <dict>
+    <!-- launchd's default PATH has neither Node nor a modern Bash. -->
+    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
     <key>LEX_REPO</key><string>/ABSOLUTE/PATH/TO/lex-service</string>
     <key>LEX_ACTOR</key><string>nick-agent</string>
     <key>LEX_BRANCH</key><string>main</string>
 M README.md
 M bin/lex-notify-loop
 M bin/lex-run-loop
 M deploy/com.lex.notify.plist.example
 M deploy/com.lex.run.plist.example
?? tests/lex-run-loop.test.mjs

```

