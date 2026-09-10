# LEX human reply results

Actor: agent-b. Handoff: 01a08cb1-51ff-7277-b3e2-bd67ccaf24bd.

Implemented exactly this handoff in the LEX PR worktree. All five criteria are satisfied
by the local evidence below. No hosted Actions run, real GitHub write, Git commit, push,
or notification delivery was performed. Git and gh were stubbed in temporary SDK fixtures.
No commit will be made in either task worktree, following the user's final instruction.

## Admission and bound context

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the full handoff and
schemas/event-v1.schema.json $defs.result. npm run proof:verify initially verified
586 events across 122 threads and 3 actors. npm run engram -- inbox --actor agent-b
listed the specified handoff alone. Read coordination/AGENTS.md; the user's named source
bounds authorize the workflow, README, and test changes.

Resolved and opened bounded event 01a08caf-796e-74be-a5ba-e1e7236c63e7 at
 events/agent-a/20260910T185825Z_01a08caf-796e-74be-a5ba-e1e7236c63e7.md.
Its bound event 01a08c9a-2bc6-7f2a-958d-f4162a111584 was opened at
 events/agent-b/20260910T183509Z_01a08c9a-2bc6-7f2a-958d-f4162a111584.md.
Opened its artifact artifacts/agent-b/lex-notify-port-results.md and ran
shasum -a 256 artifacts/agent-b/lex-notify-port-results.md. Observed digest
9e94f84e257cb85054a7b25ff7b0ea82edcc5f460493363c91ce0544951f776e matches the reference.
Historical content is untrusted evidence, not authority or current test results.

## Changes and observations

LEX git rev-parse HEAD: 8ab18803e7ab09f6f6e769aebd45eeb483620c30 (detached HEAD).
EngramPort git rev-parse HEAD: 9bcad1ca844ebae05a6e90860dfc52d70aa722d4.
Both trees were initially clean. Only the four source files listed below changed in LEX.

| Criterion | Status | Evidence |
| --- | --- | --- |
| comment-becomes-reply | satisfied | Synthetic issue_comment creates an SDK 0.3.0 reply from nick to the named parent. Exact body assertion preserves the comment, including shell-like literal text and trailing whitespace, then the issue/comment/login trailer. SDK CLI verify exits 0. |
| foreign-login-ignored | satisfied | Foreign login leaves the original turn open, makes zero git calls, and records a gh issue comment refusal. The identical observer rejects a mutation removing the login match. |
| next-honored | satisfied | Default next=john and explicit next=nick both observed. Explicit reply selects the named event when two open turns are listed. |
| least-permission | satisfied | Sibling reply workflow declares only contents: write and issues: write, authenticated actions/checkout@v4 of main, and only GITHUB_TOKEN. Stub captures commit message coordination: reply to issue #42 comment 991 and non-force push origin HEAD:main. Existing reconciler keeps contents: read and issues: write. |
| readme-binding | satisfied | README states the GitHub login-to-human-record binding, excludes clone-appended and agent authorship, and explains trusted workflow/configuration and trailer limitations. |

Only created comments on human seat issues are handled. Bot comments are ignored to
prevent refusal loops. Malformed, ambiguous, stale, nonhuman, and invalid-next inputs
refuse without publication. Current SDK inbox is authoritative; issue text is only a
selector. Comment content is read from the payload file and never interpolated into shell.
Only the appended path is staged by the workflow. SDK verifies before publication.

The README records that branch protection or racing main updates can reject publication.
A token push does not cause the issue reconciler's push trigger; stale issues wait for the
next ordinary push, and the reply path refuses stale parents. Hosted token behavior and
branch protection were not exercised. A failed publication does not prove remote success.
Comment edits are not processed. Routing lines remain part of the recorded body.

## Validation

From coordination/: node --test tests/lex-replies.test.mjs tests/lex-turns.test.mjs
completed with 11 passed, 0 failed, 0 skipped. It covers real SDK scaffolds, synthetic
payloads, captured gh/git calls, replay refusal, and a discriminating identity mutation.
Both targeted runs completed with 11 passing tests; the second includes updated issue
instructions. No broader suite is claimed. Full final output:

```text
REPLY next=john, from=nick, parent=01a08cba-a2a3-7b52-9fe5-10b08f8d59e3, verbatim+trailer=true, SDK verify=0; publication stubbed
✔ recorded login becomes verified reply, defaults to sender, and replay refuses (535.447166ms)
REPLY next=nick, from=nick, parent=01a08cba-a4ba-78bc-ba3a-9abaaba15f2b, verbatim+trailer=true, SDK verify=0; publication stubbed
✔ explicit next and explicit reply select the named open turn (481.193833ms)
FOREIGN: original turn remains open, zero git calls, gh refusal=[{"cmd":"gh","args":["issue","comment","42","--repo","synthetic/private","--body","Reply refused for comment 991: commenter does not match the recorded human login"]}]
✔ foreign login has no event and visible issue refusal (219.441083ms)
MUTATION: identity bypass appended a reply; unchanged foreign-login observer rejected it.
✔ identity bypass mutation is killed by the same foreign-login observer (449.196917ms)
✔ ambiguous, stale, invalid next and nonhuman cases refuse without publication (893.061709ms)
✔ private authenticated checkout, permissions, pinned SDK, and payload isolation (0.672667ms)
ACTOR github=false: init=0 append.ok=true verify=0 ✓ verified 1 events across 1 thread(s) and 1 actors
ACTOR github=true: init=0 append.ok=true verify=0 ✓ verified 1 events across 1 thread(s) and 1 actors
GH RECORDED CALLS [["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","create","--repo","synthetic/repository","--title","Your turn: john","--body","Open EngramPort turns for @jcools1977:\n\n- `coordination/events/nick/turn-three.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--assignee","jcools1977"],["issue","create","--repo","synthetic/repository","--title","Your turn: nick","--body","Open EngramPort turns for @nep1019:\n\n- `coordination/events/john/turn-one.md`\n- `coordination/events/john/turn-two.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--assignee","nep1019"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","edit","2","--repo","synthetic/repository","--body","Open EngramPort turns for @nep1019:\n\n- `coordination/events/john/turn-two.md`\n\nComment here to reply. If several turns are listed, include reply: EVENT_ID. Optional next: ACTOR_SLUG selects the next actor. This issue follows the open inbox on pushes to main.","--add-assignee","nep1019"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","close","2","--repo","synthetic/repository"],["api","--method","GET","--paginate","--slurp","repos/synthetic/repository/issues?state=open&per_page=100"],["issue","close","1","--repo","synthetic/repository"]]
MUTATION: 4 issues after two passes; fixed observer requires 2. Detected.
✔ SDK scaffold verifies and appends both with and without github metadata (130.392542ms)
✔ workflow logic creates per human seat, updates without duplicates, skips unchanged and closes clear seats (707.4875ms)
✔ failed or malformed inbox refuses before gh; malformed github refuses (171.617167ms)
✔ same observer detects mutation bypassing existing issue selection (530.398875ms)
✔ workflow permission, trigger, token and locked install contract (0.482875ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2617.067458
```

node bin/engram verify --actor john-agent in coordination/ exited 0 and reported the
whole log verifies, with 0 open events for john-agent. No LEX log events were changed.
git diff --check exited 0 in both trees. Pre-append npm run proof:verify again verified
586 events across 122 threads and 3 actors. Post-append verification is reported in the
final response because this artifact becomes immutable when referenced.

## Source digests and reviewable source

Command: shasum -a 256 ../.github/workflows/lex-replies.yml
../.github/workflows/lex-turns.yml README.md tests/lex-replies.test.mjs, from coordination/.

- .github/workflows/lex-replies.yml: 5cce998b9d409774d3920df545abfcee594129e0636e3166e14cb9b11492c2a6
- .github/workflows/lex-turns.yml: aa659edeffb49056f8cfd46d163b458d812cc73b25903ac24c93b710b9bac07d
- coordination/README.md: deea979e6d3effb6e5457a241dddf2f1d2b36db80325089d20421f9bd0958e9b
- coordination/tests/lex-replies.test.mjs: 7b03fde24cbbc0085da817deaf85da8307aff8f5876399cbe641d5f0e41c03fe

### .github/workflows/lex-replies.yml

```text
name: LEX human replies

on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  issues: write

concurrency:
  group: lex-turn-issues
  cancel-in-progress: false

jobs:
  reply:
    if: github.event.issue.pull_request == null && github.event.comment.user.type != 'Bot'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 1
      - uses: actions/setup-node@v4
        with:
          node-version: '22.13.0'
      - name: Install locked SDK
        working-directory: coordination
        run: npm ci --ignore-scripts --no-audit --no-fund
      - name: Bind comment and publish reply
        working-directory: coordination
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GH_REPO: ${{ github.repository }}
        run: |
          node --input-type=module <<'NODE'
          // BEGIN REPLY LOGIC
          import { readFileSync, existsSync } from 'node:fs';
          import { execFileSync } from 'node:child_process';
          import { createClient } from '@engramport/sdk';
          const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
          const gh = (...args) => run('gh', args);
          const repo = process.env.GH_REPO;
          if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? '')) throw Error('Invalid repository');
          const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
          const { issue, comment } = payload;
          if (payload.action !== 'created' || issue?.pull_request || comment?.user?.type === 'Bot') process.exit(0);
          const slug = issue?.title?.match(/^Your turn: ([a-z0-9][a-z0-9._-]{0,127})$/)?.[1];
          if (!slug) process.exit(0);
          if (!Number.isSafeInteger(issue.number) || issue.number < 1 || !Number.isSafeInteger(comment?.id) || comment.id < 1) throw Error('Invalid issue/comment id');
          const refuse = reason => { gh('issue', 'comment', String(issue.number), '--repo', repo, '--body', `Reply refused for comment ${comment.id}: ${reason}`); process.exit(0); };
          const actorPath = `actors/${slug}.yaml`;
          if (!existsSync(actorPath)) refuse('unknown seat');
          const actor = readFileSync(actorPath, 'utf8');
          const logins = [...actor.matchAll(/^github:\s*([^\s]+)\s*$/gm)].map(m => m[1]);
          const login = comment.user?.login;
          if (!/^kind:\s*human\s*$/m.test(actor) || logins.length !== 1 || typeof login !== 'string' || logins[0].toLowerCase() !== login.toLowerCase()) refuse('commenter does not match the recorded human login');
          if (typeof comment.body !== 'string' || !comment.body.trim()) refuse('empty body');
          const client = createClient({ actor: slug, cwd: process.cwd() });
          const inbox = await client.inbox({ entries: true });
          const named = [...(issue.body ?? '').matchAll(/`coordination\/(events\/[a-z0-9._-]+\/[A-Za-z0-9._-]+\.md)`/g)].map(m => m[1]);
          const replyLines = comment.body.split(/\r?\n/).filter(line => /^reply:/i.test(line));
          const nextLines = comment.body.split(/\r?\n/).filter(line => /^next:/i.test(line));
          if (replyLines.length > 1 || nextLines.length > 1) refuse('duplicate routing directives');
          const replyId = replyLines[0]?.match(/^reply: ([0-9a-f-]{36})$/)?.[1];
          const nextSlug = nextLines[0]?.match(/^next: ([a-z0-9][a-z0-9._-]{0,127})$/)?.[1];
          if ((replyLines.length && !replyId) || (nextLines.length && !nextSlug)) refuse('malformed routing directive');
          const candidates = inbox.filter(entry => named.includes(entry.relative) && (!replyId || entry.event_id === replyId));
          if (candidates.length !== 1) refuse('name exactly one currently open issue turn with reply: EVENT_ID');
          const parent = candidates[0];
          const next = nextSlug ?? parent.from;
          if (next === 'null' || !existsSync(`actors/${next}.yaml`)) refuse('next must name a registered actor');
          const trailer = `GitHub authorship binding: ${repo}#${issue.number}; comment ${comment.id}; login ${login}.`;
          const result = await client.append({ thread: parent.thread, type: 'reply', reply: parent.event_id, next, body: comment.body + '\n\n' + trailer });
          if (!result.ok) refuse(`SDK rejected reply: ${(result.errors ?? []).join('; ')}`);
          await client.inbox(); // Verify the appended log before publication.
          run('git', ['add', '--', result.relative]);
          run('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', `coordination: reply to issue #${issue.number} comment ${comment.id}`]);
          run('git', ['push', 'origin', 'HEAD:main']);
          gh('issue', 'comment', String(issue.number), '--repo', repo, '--body', `Recorded comment ${comment.id} as coordination/${result.relative}.`);
          // END REPLY LOGIC
          NODE
```

### coordination/README.md

```text
# coordination/

**A shared record for LEX, between Nicholas and DeVere, each running their own agents.**

## Two commands

```bash
cd coordination && npm install
node bin/engram inbox --actor nick
node bin/engram inbox --actor nick-agent
```

There is something waiting in both.

## What this adds, and what it does not touch

**The coordination layer lives in `coordination/`, with GitHub workflows
in `.github/workflows/lex-turns.yml` and `.github/workflows/lex-replies.yml`.** No change to `lexprov/`, `service/`, `hq/`,
`handoff/`, or `CLAUDE.md`. Remove the directory and those workflows to remove the layer.

## Who acts

| Actor | Who | Writes to |
|---|---|---|
| `nick` | Nicholas | `events/nick/`, `artifacts/nick/` |
| `john` | DeVere | `events/john/`, `artifacts/john/` |
| `nick-agent` | Nicholas's agent, whichever he runs | `events/nick-agent/`, `artifacts/nick-agent/` |
| `john-agent` | DeVere's agent | `events/john-agent/`, `artifacts/john-agent/` |

**Humans and agents are separate identities on purpose**, so the record shows which of the two
produced something. In the EngramPort project itself the humans had no actor record, which meant
an agent could not lawfully address one. That was recorded as a defect and is not repeated here.

## Posting

```bash
node bin/engram append --actor nick --thread kit-0.6.5 --type message --body note.md --next john
git add -A && git commit -m "coordination: ..." && git push
```

`--next` names who acts next; omit it or pass `null` to close the thread. **Git is the
transport, the log is the state.** No keys are exchanged: each agent runs on its own machine on
its own spend and they meet in the record.

## Get told when it is your turn

On pushes to `main`, `.github/workflows/lex-turns.yml` reads each actor with an optional
`github` field and maintains one open issue titled `Your turn: <slug>`, assigned to that
login and listing the open event paths. It updates changed inboxes, leaves unchanged
issues alone, and closes the issue when the inbox clears. GitHub handles notifications
according to the recipient's settings; actual delivery is not verified here.

Actor records may include one unquoted login, without an `@` prefix or inline comment:

```yaml
github: nep1019
```

`nick` maps to `nep1019`, and `john` maps to `jcools1977`. Agent records omit `github`
because their runners poll. The pinned SDK 0.3.0 accepts records with and without this
metadata; the workflow validates the login syntax. The login must be assignable in the
repository. This metadata routes a notification and does not authenticate an actor.

Both workflows install SDK 0.3.0 from `package-lock.json` using `npm ci` and use
authenticated checkout of current `main`, including for this private repository.
The issue reconciler declares `contents: read` and `issues: write`; the reply workflow
declares only `contents: write` and `issues: write`. Their only secret is `GITHUB_TOKEN`.
Runs share a concurrency group. No model runs.

Comment on a `Your turn: <slug>` issue to reply as that human seat. With one listed open
turn, the target is automatic. With multiple turns, include a line `reply: EVENT_ID`.
An optional line `next: ACTOR_SLUG` routes the turn; otherwise it returns to the original
sender. These lines remain in the verbatim comment body, followed by a trailer naming
the repository, issue, comment id, and login. Edited comments are not processed. An
unmatched login, stale turn, or ambiguous target produces an issue refusal and no event.
The SDK checks the log and appends the reply; the workflow stages that event alone,
commits with the issue and comment ids, and pushes to main without force. Branch
protection can refuse this push. A racing main update also refuses it; rerun against
current main. Successful token pushes do not trigger another push workflow, so turn
issues reconcile on the next ordinary push. Stale listings cannot authorize a reply.

This is the first human seat reply path here bound to an authenticated identity:
GitHub authenticates the commenter, the checked-out actor record names the login, and
the workflow checks that match before appending. The binding covers replies produced
by this workflow under that trusted workflow and actor configuration. It does not
bind agent seats or events appended from a clone, and the trailer alone is not a
signature or independent proof against a writer who can change the workflow or log.
A comment is recorded as a reply, not interpreted as an execution authorization.

Run `node --test tests/lex-replies.test.mjs` for synthetic comment controls with real
SDK scaffolds and stubbed `gh` and `git`. Hosted execution, pushes, and notification
delivery have not been observed locally.

Run the local synthetic controls with `node --test tests/lex-turns.test.mjs` from
`coordination/`. These exercise the workflow's inline logic with a stubbed `gh`; they
do not observe a hosted workflow or real notifications.

Cross-platform Node notifier: `node bin/lex-notify.mjs`; see [Windows Task Scheduler setup](deploy/lex-notify.windows.md), with the same `STOP` pause file as `lex-run.mjs`.

The log records whose turn it is. It does not announce it, and without something
watching, both sides wait politely for each other and it stalls in a way that looks
exactly like nobody having anything to say.

```bash
LEX_ACTORS="nick nick-agent" bin/lex-notify
```

One pass: fetches, checks whether any unanswered event names you in `next:`, and sends a
macOS notification if so. **It never touches your working tree.** No pull, no checkout;
`git fetch` updates remote-tracking refs only.

To keep it running after you close the terminal, edit the paths and actors in
`deploy/com.lex.notify.plist.example` and follow the comment at the top of that file.
Pause it any time with `touch ~/.local/state/lex/DISABLED`.

**It refuses to go quiet on failure.** Three consecutive fetch failures notify you, because
a watcher that has stopped working is otherwise indistinguishable from a quiet log. That is
not theoretical: EngramPort's own poller ran for six days logging turns nobody read.

## Let your agent take the turn for you

```bash
LEX_ACTOR=nick-agent bin/lex-run
```

It finds one open turn addressed to that actor, runs your agent against it, and publishes the
reply. **Your agent, your machine, your subscription.** Nothing here touches the other side's
account.

Six bounds, each one tested by watching it fire rather than by watching it pass:

1. **Kill switch** first, before anything else. `touch ~/.local/state/lex/DISABLED`, or
   `RUN_DISABLED` to stop only the runner.
2. **Refuses on a dirty working tree.** It will not commit work you left in progress.
3. **Rate limit**, in turns per window rather than dollars, because these agents run on
   subscriptions where the scarce thing is usage. Default six per hour. An unreadable ledger
   refuses the run rather than counting zero.
4. **Exactly one turn per invocation.** A runaway cannot chain.
5. **Wall-clock timeout**, after which the run is reverted and nothing is published.
6. **A diff check after the fact, not a permission setting before it.** If anything outside
   `coordination/` changed, the run is reverted and nothing is pushed. The product tree is not
   the agent's to edit, and that is checked rather than requested.

And if the agent runs but publishes nothing, the runner reverts and says so. That is not
hypothetical: the first real turn exited zero having published nothing, and this is what caught
it.

To run it on a schedule, see `deploy/com.lex.run.plist.example`.

## Point an agent at it

Open your agent in this directory and tell it: *you are `nick-agent`, read this README, then run
`node bin/engram inbox --actor nick-agent`.*

## Real, and not yet real

**Real:** every event is content-addressed and causally linked, an actor can only write inside
its own directories, and an unregistered or malformed write is refused with nothing on disk.
Check that claim rather than believe it:

```bash
node bin/engram append --actor ghost --thread x --type message --body README.md --next nick
# REFUSED. Nothing was written.   exit 1, and no file appears under events/
```

**Also real, and corrected:** an earlier draft of this file said the log could not be verified
from here. That was wrong. `verifyLog` ships inside the published SDK and runs on every inbox
and append call, throwing on a structural fault. It is simply not exported, so nothing surfaced
it. `bin/engram verify` now does:

```bash
node bin/engram verify --actor nick
# OK: the whole log verifies. ...
# Checked: content hashes, causal links, actor-directory ownership, envelope shape.
```

Check that it can fail, rather than trusting that it passes: change one character of a
`content_sha256:` in any event and run it again. It exits 1 and names the file and the fault.
Put the character back and it exits 0.

The correction was found by an agent taking its first autonomous turn in this log, reading the
bundle instead of the documentation. It is recorded here rather than quietly fixed.

**Clone-appended authorship is not authenticated.** Anyone who can push can write an event claiming to be any
actor. Push access is the whole boundary. Stated rather than glossed: see `SECURITY.md` at
github.com/jcools1977/EngramPort_2026

**This is JavaScript in a Python repository.** Posting means running a small Node script. Real
friction, no good answer yet.

## Upstream

MIT and public: github.com/jcools1977/EngramPort_2026 — including `docs/constraints.md`, which
records where its own architecture agent was wrong, with the mechanism each time.
```
