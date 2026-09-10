# LEX notifier port results

Actor: agent-b. Handoff: 01a08c95-34f9-76b6-aeec-c0d631ed7a4f.

All five criteria are satisfied by the local observations below. No Windows execution,
Task Scheduler registration, real desktop notification, deployment, or push is claimed.
The dispatcher owns commits. Neither worktree was committed.

## Admission and context

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the entire handoff,
and schemas/event-v1.schema.json $defs.result. Initial npm run proof:verify exited 0,
verifying 580 events across 120 threads and 3 actors. npm run engram -- inbox --actor
agent-b listed the specified handoff alone.

Resolved bounded event 01a08c05-e56c-7a9f-9173-865d79f10c20 to
 events/agent-b/20260910T155311Z_01a08c05-e56c-7a9f-9173-865d79f10c20.md and read it fully.
Opened its artifacts/agent-b/lex-pr2-review-fixes-results.md. Command shasum -a 256
artifacts/agent-b/lex-pr2-review-fixes-results.md returned
72e7fe745f2f3694de9bbe0d6e448f37f3a4cfcabaebc1150daf3aea28475a18, matching the reference.
Historical results were treated as context, not current proof.

## Changes and criteria

Code worktree: /Users/an2b/an2b/products/lex-service-pr2.
Observed git rev-parse HEAD: be7ff66fceffedf963351dc9031eb2729c55a51b.
Changed only coordination/bin/lex-notify.mjs, coordination/tests/lex-notify.test.mjs,
coordination/deploy/lex-notify.windows.md, and one line added to coordination/README.md.
No LEX events or artifacts were written. lex-run.mjs is unchanged, digest
1fe31fac9868da598a821e5213d31e35a5991d009166e26d8f14ce43a324aba5.

| Criterion | Status | Observation |
| --- | --- | --- |
| turn-detected | satisfied | Actual executable reads a synthetic open turn through installed SDK; PATH osascript stub records exactly one invocation across two passes. Removing the seen filter produces two calls in the mutation control. |
| no-turn-quiet | satisfied | Empty SDK inbox produces exactly one QUIET stdout/log message and no stub invocation. |
| platform-selection | satisfied | Selector run with win32, darwin, linux prints powershell.exe, osascript, notify-send respectively. Unsupported platform runs deliver and records NOTIFY_LOG_ONLY. |
| read-only | satisfied | git status --porcelain=v1 and git rev-parse HEAD before and after two passes are identical, including an untracked file. Only remote refs are fetched; no checkout fast-forward is needed because SDK reads a pinned temporary snapshot. |
| scheduler-example | satisfied | coordination/deploy/lex-notify.windows.md contains Register-ScheduledTask with interactive limited principal and five-minute trigger, plus the same USERPROFILE/.local/state/lex/STOP file used by the Node runner. Example shown, not registered. |

The notifier uses inherited PATH, validates the branch, pins a fetched commit, materializes
regular files into a temporary directory, and calls createClient(...).inbox({entries:true}).
It neither publishes nor starts a model. State lives outside the checkout under the user's
.local/state/lex. A lock serializes passes and the log retains at most 262144 bytes.
Seen IDs are scoped to repository, branch, and configured actors. Notification attempts,
including logged fallback, are remembered. A crash between delivery and the state write
can repeat a banner; hard termination can leave the documented lock requiring cleanup.
The log bound is implemented but was not separately stress-tested. Native Windows and
Linux delivery were not run. Only the macOS command was executed through a PATH stub.

## Validation

From coordination/: node --test tests/lex-notify.test.mjs tests/lex-run.test.mjs completed:
9 tests passed, 0 failed, 0 skipped. Full captured output follows. Disposable fixture
commits exist only in temporary repositories and are deleted by cleanup. No commits were
made in either task worktree. Runner tests intercept publication; reproduction prose
about commit/push is a prediction, not an observed external effect.

Initial targeted runs failed on canonical /var versus /private/var path handling, missing
fixture artifact directories, Git ls-tree's cwd-relative behavior, and a symlinked entry
point guard that skipped the mutation. Fixes canonicalize the input path, supply actor
fixture directories, use --full-tree, and canonicalize the entry point. The final combined
run exercises those fixes. No unresolved test failure is concealed.

```text
SELECT win32 {"cmd":"powershell.exe","args":["-NoProfile","-NonInteractive","-Command","Add-Type -AssemblyName System.Windows.Forms;$n=New-Object System.Windows.Forms.NotifyIcon;try {$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;$n.ShowBalloonTip(10000,'LEX','untrusted $(touch nope) '' text','Info');Start-Sleep -Seconds 6} finally {$n.Dispose()}"]}
SELECT darwin {"cmd":"osascript","args":["-e","display notification \"untrusted $(touch nope) ' text\" with title \"LEX\""]}
SELECT linux {"cmd":"notify-send","args":["LEX","untrusted $(touch nope) ' text"]}
NOTIFY_LOG_ONLY synthetic turn
NO TURN: 2026-09-10T18:33:49.799Z QUIET no open turn
✔ selectors execute each platform value and unsupported fallback logs (0.881708ms)
TURN: PATH stub called once across two passes; ["-e","display notification \"Turn for nick: synthetic from john\" with title \"LEX\""]
READ ONLY git status --porcelain=v1 / git rev-parse HEAD: {"before":{"status":"?? coordination/uncommitted.txt\n","revision":"8a5707496963fa280b8dee821b4e0f47b88dd1a2\n"},"after":{"status":"?? coordination/uncommitted.txt\n","revision":"8a5707496963fa280b8dee821b4e0f47b88dd1a2\n"}}
✔ SDK inbox, PATH toast stub, deduplication, quiet pass, STOP, and unchanged dirty checkout (585.82325ms)
MUTATION detected: duplicate notification count 2; fixed observer requires 1
✔ discriminating mutation: removing seen filter causes duplicate stub calls (516.198625ms)
REPO      /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-pr2-S3Mize/repo
DIR       /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-pr2-S3Mize/repo/coordination
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
✔ Nick's unchanged reproduction observes the unfixed port's false input and allowed verdict (93.488708ms)
✔ real runner reaches the bound, reverts Nick's rogue file, and restores the default sandbox (123.993625ms)
✔ Nick's verbatim unfixed caller mutation is detected by the same runner observer (243.552167ms)
✔ allowed event remains allowed and configurable arguments still work (118.469375ms)
✔ outside prefix lookalikes and unusual filenames are refused (580.949125ms)
✔ a staged rename from outside into an allowed prefix retains its outside source (150.951833ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1348.939083
```

git diff --check exited 0 in both worktrees. LEX git status --short showed exactly
README.md modified and the three new files listed above. Final source digests from
shasum -a 256:

```text
92bb8e7fb9d67c5699df0ae2ff39a63fa79976a2e41cc912ea94f5cda29278e9  bin/lex-notify.mjs
d1d0d43aeb491fc583f249658f6e7a6930815f066b1e2d301130d5c7ab6bcd4b  tests/lex-notify.test.mjs
69d9c6ff7378d919e469ae80457a52e25ca2b0c4e9e59a7c3825e095006b58b9  deploy/lex-notify.windows.md
ccf8afe308e7e7c6c616221ac14af6e0e4d812fd68619ad8bc66995fdb066c20  README.md
```

Post-append verification and staging outcomes are reported in the completion's delivery
response because this evidence becomes immutable when referenced. No agent-commit call
is planned: the user's final instruction reserves commits for the dispatcher.
