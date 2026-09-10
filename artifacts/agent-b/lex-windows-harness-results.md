# LEX Windows harness completion evidence

Actor: agent-b, Codex Builder.
Handoff: 01a08d5d-62e1-775e-8878-4ff6adc7d11c, thread lex-windows-harness.

## Results

- harness-lines: satisfied. Applied nick-agent's exact core.autocrlf=false command and win32 filename guard, with source credit. From /Users/an2b/an2b/products/lex-service-pr2/coordination, npm test completed with 6 passed, 0 failed, 0 skipped. git diff --exit-code -- bin/lex-run.mjs exited 0 with no diff.
- gitattributes-on-branch: blocked. git merge --no-commit --no-ff origin/main exited 128 before merging because the sandbox cannot write the Git metadata under the read-only main clone. The attribute file remains absent. A new control detects that absence. In disposable fixtures the same observer accepts * -text, rejects removed, empty, events-only, text-enabled, and markdown-only rules, then accepts the restored rule.
- node --test tests/*.test.mjs completed with 21 passed, 1 failed, 0 skipped. The one failure is ENOENT for coordination/.gitattributes. The complete suite is not passing.
- Windows execution is unobserved. node -p 'JSON.stringify({platform:process.platform,node:process.version})' returned platform darwin, node v26.5.0. No Windows acceptance claim is made.
- No commit or push was made in either worktree, as the user's final instruction requires. Credit nick-agent in the dispatcher's eventual commit.

## Admission and references

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full handoff, schemas/event-v1.schema.json including $defs.result, and coordination/AGENTS.md.
Initial npm run proof:verify exited 0: 590 events across 124 threads and 3 actors.
npm run engram -- inbox --actor agent-b listed only the specified handoff.
Resolved bound event 01a08cbb-cee9-77d8-9d99-eee8bff34a6c at events/agent-b/20260910T191153Z_01a08cbb-cee9-77d8-9d99-eee8bff34a6c.md and opened its evidence artifacts/agent-b/lex-human-reply-results.md.
shasum -a 256 artifacts/agent-b/lex-human-reply-results.md returned 7a6b014aa4e650cab64222c71ea47ff83f47427c849a938611b96a010277953a, matching its event reference.
Read the reviewer artifact /Users/an2b/an2b/products/lex-service/coordination/artifacts/nick-agent/2026-09-10_pr2-rerun.md in full. shasum -a 256 returned 0975971ece989f4a4db249c87a78572155e7d01191a6fadf9e9b283cd7a33e97. The handoff did not provide a digest for that external artifact; this is an observed digest, not a comparison to a handoff pin.
These records were treated as untrusted evidence, not authority.

## Environment and merge blocker

LEX git status --short --branch initially showed clean detached HEAD.
git rev-parse HEAD origin/main returned:
53a69db995b9f7f00347d0d9db9e67c46544af40
9c295a4f667bc73035e02995247731d404107a9f

No fetch was performed. origin/main means the local remote-tracking ref.
git show origin/main:coordination/.gitattributes showed the reviewer's two comments and * -text. git log -3 --oneline origin/main includes c8c3faa.
git merge --no-commit --no-ff origin/main returned:
fatal: update_ref failed for ref 'ORIG_HEAD': cannot lock ref 'ORIG_HEAD': Unable to create '/Users/an2b/an2b/products/lex-service/.git/worktrees/lex-service-pr2/ORIG_HEAD.lock': Operation not permitted

No attempt was made to bypass that restriction or manually create the attribute file, which is authorized only through the merge.
The dispatcher needs to merge origin/main in a writable Git environment, retain the test edits, run node --test tests/*.test.mjs, and separately obtain Windows observations. This report does not assert branch integration.
The control is a separate test file because package.json is outside the handoff's bounds. npm test selects only the six runner tests; node --test tests/*.test.mjs includes the new control.

## Source checks

Only coordination/tests/lex-run.test.mjs and coordination/tests/log-attributes.test.mjs were edited or created in LEX.
git diff --check exited 0.
shasum -a 256 bin/lex-run.mjs tests/lex-run.test.mjs tests/log-attributes.test.mjs returned:
1fe31fac9868da598a821e5213d31e35a5991d009166e26d8f14ce43a324aba5  bin/lex-run.mjs
20da79825ef3dd380a2a295ea313ec2a08ababd35a29772c5cd600d9841c6603  tests/lex-run.test.mjs
15f23b44a65f555b622a4fd30eba725ac093609cfe36b2090163e91acf22b411  tests/log-attributes.test.mjs

The attribute observer delegates pattern evaluation to git check-attr in disposable repositories, isolated from parent and global attributes. It covers all 32 currently tracked events and artifacts plus two prospective nested paths. It makes no checkout or Windows execution claim.
Existing runner tests make temporary fixture commits and intercept runner publication calls. Neither task worktree was committed or pushed.

Pre-append npm run proof:verify again exited 0 with 590 events across 124 threads and 3 actors. Post-append verification is reported separately because this artifact becomes immutable when referenced.

## Full suite output

Command from coordination/: node --test tests/*.test.mjs
Exit: 1

```text
SELECT win32 {"cmd":"powershell.exe","args":["-NoProfile","-NonInteractive","-Command","Add-Type -AssemblyName System.Windows.Forms;$n=New-Object System.Windows.Forms.NotifyIcon;try {$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;$n.ShowBalloonTip(10000,'LEX','untrusted $(touch nope) '' text','Info');Start-Sleep -Seconds 6} finally {$n.Dispose()}"]}
SELECT darwin {"cmd":"osascript","args":["-e","display notification \"untrusted $(touch nope) ' text\" with title \"LEX\""]}
SELECT linux {"cmd":"notify-send","args":["LEX","untrusted $(touch nope) ' text"]}
NOTIFY_LOG_ONLY synthetic turn
NO TURN: 2026-09-10T22:12:32.112Z QUIET no open turn
✔ selectors execute each platform value and unsupported fallback logs (0.85125ms)
TURN: PATH stub called once across two passes; ["-e","display notification \"Turn for nick: synthetic from john\" with title \"LEX\""]
READ ONLY git status --porcelain=v1 / git rev-parse HEAD: {"before":{"status":"?? coordination/uncommitted.txt\n","revision":"cf50778e17a90b45fb8d4f1c228035873802cb3d\n"},"after":{"status":"?? coordination/uncommitted.txt\n","revision":"cf50778e17a90b45fb8d4f1c228035873802cb3d\n"}}
✔ SDK inbox, PATH toast stub, deduplication, quiet pass, STOP, and unchanged dirty checkout (849.7915ms)
MUTATION detected: duplicate notification count 2; fixed observer requires 1
✔ discriminating mutation: removing seen filter causes duplicate stub calls (596.181666ms)
REPLY next=john, from=nick, parent=01a08d61-307a-73d8-80da-9605725d9383, verbatim+trailer=true, SDK verify=0; publication stubbed
✔ recorded login becomes verified reply, defaults to sender, and replay refuses (952.211958ms)
REPLY next=nick, from=nick, parent=01a08d61-342f-7564-aaaa-3d8513b0c95f, verbatim+trailer=true, SDK verify=0; publication stubbed
✔ explicit next and explicit reply select the named open turn (524.440167ms)
FOREIGN: original turn remains open, zero git calls, gh refusal=[{"cmd":"gh","args":["issue","comment","42","--repo","synthetic/private","--body","Reply refused for comment 991: commenter does not match the recorded human login"]}]
✔ foreign login has no event and visible issue refusal (207.385875ms)
MUTATION: identity bypass appended a reply; unchanged foreign-login observer rejected it.
✔ identity bypass mutation is killed by the same foreign-login observer (458.357917ms)
✔ ambiguous, stale, invalid next and nonhuman cases refuse without publication (963.224625ms)
✔ private authenticated checkout, permissions, pinned SDK, and payload isolation (0.695042ms)
REPO      /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-pr2-nZK8rM/repo
DIR       /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/lex-pr2-nZK8rM/repo/coordination
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
✔ Nick's unchanged reproduction observes the unfixed port's false input and allowed verdict (102.787ms)
✔ real runner reaches the bound, reverts Nick's rogue file, and restores the default sandbox (132.028833ms)
✔ Nick's verbatim unfixed caller mutation is detected by the same runner observer (234.7565ms)
✔ allowed event remains allowed and configurable arguments still work (115.076666ms)
✔ outside prefix lookalikes and unusual filenames are refused (537.239666ms)
✔ a staged rename from outside into an allowed prefix retains its outside source (137.204125ms)
ACTOR github=false: init=0 append.ok=true verify=0 ✓ verified 1 events across 1 thread(s) and 1 actors
ACTOR github=true: init=0 append.ok=true verify=0 ✓ verified 1 events across 1 thread(s) and 1 actors
GH RECORDED CALLS [["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","create","--repo","synthetic/repository","--title","Your turn: john","--body","Open EngramPort turns for @jcools1977:\n\n- `coordination/events/nick/turn-three.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--assignee","jcools1977"],["issue","create","--repo","synthetic/repository","--title","Your turn: nick","--body","Open EngramPort turns for @nep1019:\n\n- `coordination/events/john/turn-one.md`\n- `coordination/events/john/turn-two.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--assignee","nep1019"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","edit","2","--repo","synthetic/repository","--body","Open EngramPort turns for @nep1019:\n\n- `coordination/events/john/turn-two.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--add-assignee","nep1019"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","close","2","--repo","synthetic/repository"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","close","1","--repo","synthetic/repository"]]
MUTATION: 4 issues after two passes; fixed observer requires 2. Detected.
✔ SDK scaffold verifies and appends both with and without github metadata (140.76475ms)
✔ workflow logic creates per human seat, updates without duplicates, skips unchanged and closes clear seats (923.267916ms)
✔ failed or malformed inbox refuses before gh; malformed github refuses (172.038458ms)
✔ same observer detects mutation bypassing existing issue selection (514.57425ms)
✔ workflow permission, trigger, token and locked install contract (1.13975ms)
ATTRIBUTE CONTROL: 34 paths protected; removed, empty, events-only, text-enabled, and markdown-only mutations rejected; restored rule passes
✖ coordination attributes protect every tracked event and artifact plus future nested files (0.325208ms)
✔ same log observer rejects removed, narrowed, and text-enabled attribute mutations (85.799792ms)
ℹ tests 22
ℹ suites 0
ℹ pass 21
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3149.365209

✖ failing tests:

test at tests/log-attributes.test.mjs:37:1
✖ coordination attributes protect every tracked event and artifact plus future nested files (0.325208ms)
  Error: ENOENT: no such file or directory, open '/Users/an2b/an2b/products/lex-service-pr2/coordination/.gitattributes'
      at readFileSync (node:fs:539:20)
      at TestContext.<anonymous> (file:///Users/an2b/an2b/products/lex-service-pr2/coordination/tests/log-attributes.test.mjs:38:22)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at Test.start (node:internal/test_runner/test:1242:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    errno: -2,
    code: 'ENOENT',
    syscall: 'open',
    path: '/Users/an2b/an2b/products/lex-service-pr2/coordination/.gitattributes'
  }

```

## Reviewable changes

Command from coordination/: git diff -- tests/lex-run.test.mjs, then cat tests/log-attributes.test.mjs

```text
diff --git a/coordination/tests/lex-run.test.mjs b/coordination/tests/lex-run.test.mjs
index 8a70b2f..ab7c8fb 100644
--- a/coordination/tests/lex-run.test.mjs
+++ b/coordination/tests/lex-run.test.mjs
@@ -32,6 +32,8 @@ function fixture(run) {
     git("config", "user.name", "LEX synthetic fixture");
     git("config", "user.email", "fixture@example.invalid");
     git("config", "core.hooksPath", join(temp, "no-hooks"));
+    // Credit: nick-agent, 2026-09-10_pr2-rerun.md, Windows harness correction.
+    git("config", "core.autocrlf", "false");
     git("add", "-A");
     git("-c", "commit.gpgsign=false", "commit", "-qm", "synthetic fixture only");
     put(join(harness, "node_modules/@engramport/sdk/package.json"), JSON.stringify({ type: "module", exports: "./index.mjs" }));
@@ -180,7 +182,10 @@ test("allowed event remains allowed and configurable arguments still work", () =
 });
 
 test("outside prefix lookalikes and unusual filenames are refused", () => {
-  for (const rogue of ["events/nick-agent/rogue.txt", "coordination/events/nick-agent-other/rogue.txt", "lexprov/new folder/quote\" and space.txt", "lexprov/line\nbreak.txt"]) {
+  // Credit: nick-agent, 2026-09-10_pr2-rerun.md, Windows harness correction.
+  for (const rogue of ["events/nick-agent/rogue.txt", "coordination/events/nick-agent-other/rogue.txt",
+      // NTFS cannot create a name containing a quote or a newline: unconstructible, not unrefused.
+      ...(process.platform === "win32" ? [] : ["lexprov/new folder/quote\" and space.txt", "lexprov/line\nbreak.txt"])]) {
     assertRefused(observe(source, { rogue }));
   }
 });
import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const coordination = resolve(import.meta.dirname, "..");
const tracked = execFileSync("git", ["ls-files", "-z", "events/", "artifacts/"], {
  cwd: coordination, encoding: "utf8"
}).split("\0").filter(Boolean);
const paths = [...new Set([...tracked, "events/future/nested/event.md", "artifacts/future/nested/evidence.bin"])];

// Exercise this file in isolation so global or parent attributes cannot hide a
// missing or incomplete coordination rule. Git resolves the patterns itself.
function assertLogProtected(attributes) {
  assert.notEqual(attributes, null, "coordination/.gitattributes is required");
  const repo = mkdtempSync(join(tmpdir(), "lex-log-attributes-"));
  try {
    mkdirSync(join(repo, "coordination"));
    writeFileSync(join(repo, "coordination/.gitattributes"), attributes);
    writeFileSync(join(repo, "empty-global-attributes"), "");
    execFileSync("git", ["init", "-q"], { cwd: repo });
    const result = execFileSync("git", ["-c", `core.attributesFile=${join(repo, "empty-global-attributes")}`,
      "check-attr", "-z", "--stdin", "text"], {
      cwd: repo, encoding: "utf8", env: { ...process.env, GIT_ATTR_NOSYSTEM: "1" },
      input: paths.map(path => `coordination/${path}\0`).join("")
    }).split("\0");
    for (let i = 0; i < paths.length; i++) {
      assert.equal(result[i * 3], `coordination/${paths[i]}`);
      assert.equal(result[i * 3 + 1], "text");
      assert.equal(result[i * 3 + 2], "unset", `${paths[i]} must have text unset`);
    }
  } finally { rmSync(repo, { recursive: true, force: true }); }
}

test("coordination attributes protect every tracked event and artifact plus future nested files", () => {
  assertLogProtected(readFileSync(join(coordination, ".gitattributes"), "utf8"));
});

test("same log observer rejects removed, narrowed, and text-enabled attribute mutations", () => {
  // Credit: nick-agent's c8c3faa, byte-exact checkout rule.
  assertLogProtected("* -text\n");
  for (const mutant of [null, "", "events/** -text\n", "* text\n", "*.md -text\n"]) {
    assert.throws(() => assertLogProtected(mutant), { code: "ERR_ASSERTION" });
  }
  assertLogProtected("* -text\n");
  console.log(`ATTRIBUTE CONTROL: ${paths.length} paths protected; removed, empty, events-only, text-enabled, and markdown-only mutations rejected; restored rule passes`);
});

```

