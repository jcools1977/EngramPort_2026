# LEX turn issue workflow results

Actor: agent-b, Codex Builder.
Handoff: 01a08caf-796e-74be-a5ba-e1e7236c63e7, thread lex-turn-issues.

All four completion criteria are satisfied within the local evidence below. Hosted
workflow execution, real issue creation, assignment acceptance, and notification delivery
were not observed. No commit or push was made in either worktree. The dispatcher owns commits.

## Admission and bound context

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the entire handoff,
and schemas/event-v1.schema.json $defs.result. npm run proof:verify exited 0 and
verified 583 events across 121 threads and 3 actors. npm run engram -- inbox --actor
agent-b listed only the named handoff.

Opened bound event events/agent-b/20260910T183509Z_01a08c9a-2bc6-7f2a-958d-f4162a111584.md
in full and its referenced artifacts/agent-b/lex-notify-port-results.md. Command
shasum -a 256 artifacts/agent-b/lex-notify-port-results.md returned
9e94f84e257cb85054a7b25ff7b0ea82edcc5f460493363c91ce0544951f776e, matching the reference.
Those historical results were treated as context, not as current validation.

EngramPort git rev-parse HEAD: 4c031866f97da3db24b652e3add03cc0c9f037db.
LEX git rev-parse HEAD: 3930bc6f97c2d9e5d8c8a113f80b2bfd4fd66e92 (detached worktree).
Both worktrees were initially clean. Local runtime from node --version: v26.5.0.
Workflow specifies Node 22.13.0; that hosted environment was not executed locally.
The LEX coordination AGENTS.md was read. The user's explicit bounds authorize the
workflow, actor metadata, README, and tests despite that file's general directory restriction.

## Criteria and observed commands

| Criterion id | Status | Evidence |
| --- | --- | --- |
| actor-field-accepted | satisfied | Read installed SDK dist/event-core-B9v0rHeZ.js readActors, lines 299-336. It reads slug and actor surfaces without rejecting extra fields. node --test tests/lex-turns.test.mjs created separate SDK scaffolds with and without github, observed append.ok=true, and ran SDK CLI verify successfully in each. |
| issue-logic | satisfied | The same test command executed the workflow's inline Node code verbatim using synthetic CLI inbox output and an executable PATH gh stub. It recorded one issue for each of two human seats, assigned to their recorded logins, a changed-inbox edit on the second pass with no extra create, no edit on an unchanged pass, and close calls as each inbox cleared. Agent seats were not queried. |
| least-permission | satisfied | Workflow declares only permissions: issues: write. Static test asserts exactly one permission block and only secrets.GITHUB_TOKEN. Token is scoped to reconciliation; anonymous public source fetch precedes it. Ruby YAML parser independently read the trigger, permissions and Node script. |
| records-updated | satisfied | nick.yaml contains github: nep1019; john.yaml contains github: jcools1977. Tests confirm both agent records omit github. node bin/engram verify --actor nick exited 0 after edits: whole log verifies, 0 events open for nick. |

From LEX coordination/: node --test tests/lex-turns.test.mjs completed with
5 tests passed, 0 failed, 0 canceled, 0 skipped, 0 todo. No broader suite was run.
The tests do not make Git commits or network requests.

Observed SDK control output:

```text
ACTOR github=false: init=0 append.ok=true verify=0 verified 1 events across 1 thread(s) and 1 actors
ACTOR github=true: init=0 append.ok=true verify=0 verified 1 events across 1 thread(s) and 1 actors
```

Observed gh call sequence, all calls recorded by the stub:

1. api GET with --paginate --slurp repos/synthetic/repository/issues?state=open&per_page=100.
2. issue create: Your turn: john, --assignee jcools1977, body lists coordination/events/nick/turn-three.md.
3. issue create: Your turn: nick, --assignee nep1019, body lists coordination/events/john/turn-one.md and turn-two.md.
4. api GET; issue edit 2 with --add-assignee nep1019 and body listing only turn-two.md.
5. api GET on unchanged inboxes; no write.
6. api GET; issue close 2 when nick clears, john remains open.
7. api GET; issue close 1 when john clears.

Discriminating mutation: replacing existing-title selection with a filter that always
returns false produced 4 issues across two passes. The same count observer that requires
2 for the fixed code failed on the mutant. Output: MUTATION: 4 issues after two passes;
fixed observer requires 2. Detected.

Negative controls: failed inbox command, malformed inbox output, and malformed github
login each returned nonzero before any gh invocation. All seats are resolved before
issue writes, so failure reading a seat is not interpreted as an empty inbox.

Initial optional YAML parsing with python3 failed because PyYAML was not installed
(ModuleNotFoundError). No dependency was installed. Ruby's built-in YAML library parsed
the workflow successfully and asserted push/main, issues-only permission, and the Node
script. The targeted tests passed on their first run.

git diff --check exited 0 in both worktrees. Before appending, npm run proof:verify
again exited 0, verifying 583 events across 121 threads and 3 actors. Post-append
verification and staging outcomes are reported in the final delivery response because
this artifact is immutable once referenced.

## Implementation and limits

Only the five files captured below changed in LEX. The workflow runs on push to main,
serializes runs, and anonymously fetches current main before installing the SDK locked
to 0.3.0 with npm ci --ignore-scripts --no-audit --no-fund. Reading current main avoids
restoring a stale inbox when an older push starts later. It uses paginated open issue
listing, ignores pull requests, selects exact reserved titles, and updates changed bodies
or assignees. It also closes duplicate matching issues, although the duplicate-cleanup
and reassignment branches were not separately exercised. Closed seats get a new issue
if later turns arrive. Reserved-title collisions affect that namespace, as documented.

The only granted token permission is issues: write. GitHub documentation confirms that
unspecified permissions become none:
https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
The source fetch is unauthenticated to respect that contract. Public visibility, enabled
Actions and Issues, and assignable logins are operating prerequisites, not verified live
facts in this run. The workflow does not support private source under this permission
contract. A partial API failure may require another push. There is no periodic retry,
model invocation, package publication, or commit operation in the workflow.

Existing runner and notifier were unchanged. shasum -a 256 returned:
1fe31fac9868da598a821e5213d31e35a5991d009166e26d8f14ce43a324aba5  coordination/bin/lex-run.mjs
92bb8e7fb9d67c5699df0ae2ff39a63fa79976a2e41cc912ea94f5cda29278e9  coordination/bin/lex-notify.mjs

## Changed file digests and review snapshots

These file digests were also observed with shasum -a 256 in the LEX worktree.

### .github/workflows/lex-turns.yml

SHA-256: bf5c1109da76212d51e2951f2dbb181baeb394dd8b0a694677d78b1bfd266b63

```text
name: LEX turn issues

on:
  push:
    branches: [main]

permissions:
  issues: write

concurrency:
  group: lex-turn-issues
  cancel-in-progress: false

jobs:
  turns:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      # Public source retrieval avoids granting contents: read to the issue token.
      - name: Read public main
        env:
          REPOSITORY: ${{ github.repository }}
        run: |
          git init .
          git remote add origin "https://github.com/${REPOSITORY}.git"
          git -c credential.helper= fetch --depth=1 origin refs/heads/main
          git checkout --detach FETCH_HEAD
      - uses: actions/setup-node@v4
        with:
          node-version: '22.13.0'
      - name: Install locked SDK
        working-directory: coordination
        run: npm ci --ignore-scripts --no-audit --no-fund
      - name: Reconcile turn issues
        working-directory: coordination
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GH_REPO: ${{ github.repository }}
        run: |
          node --input-type=module <<'NODE'
          // BEGIN TURN LOGIC: exercised verbatim by coordination/tests/lex-turns.test.mjs.
          import { readdirSync, readFileSync } from 'node:fs';
          import { execFileSync } from 'node:child_process';
          const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
          const gh = (...args) => run('gh', args);
          const repo = process.env.GH_REPO;
          if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? '')) throw new Error('Invalid GH_REPO');
          const seats = [];
          for (const name of readdirSync('actors').filter(name => name.endsWith('.yaml')).sort()) {
            const text = readFileSync(`actors/${name}`, 'utf8');
            const fields = text.split(/\r?\n/).filter(line => /^github:/.test(line));
            if (!fields.length) continue;
            const login = fields[0].slice('github:'.length).trim();
            const slug = text.match(/^slug:\s*([^\s]+)\s*$/m)?.[1];
            if (fields.length !== 1 || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(login) || login.includes('--')) throw new Error(`Invalid github login in ${name}`);
            if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(slug ?? '') || name !== `${slug}.yaml`) throw new Error(`Invalid actor in ${name}`);
            const output = run(process.execPath, ['bin/engram', 'inbox', '--actor', slug]);
            const paths = output === `Nothing open for ${slug}.` ? [] : output.split(/\r?\n/);
            if (paths.some(path => !/^events\/[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9._-]+\.md$/.test(path))) throw new Error(`Unexpected inbox output for ${slug}`);
            seats.push({ slug, login, paths: [...new Set(paths)].sort() });
          }
          // Resolve every inbox before making a write. A failed read is never a clear seat.
          const pages = JSON.parse(gh('api', '--method', 'GET', '--paginate', '--slurp', `repos/${repo}/issues?state=open&per_page=100`));
          const issues = pages.flat().filter(issue => !issue.pull_request);
          for (const { slug, login, paths } of seats) {
            const title = `Your turn: ${slug}`;
            const matches = issues.filter(issue => issue.title === title).sort((a, b) => a.number - b.number);
            if (!paths.length) {
              for (const issue of matches) gh('issue', 'close', String(issue.number), '--repo', repo);
              continue;
            }
            const body = [`Open EngramPort turns for @${login}:`, '', ...paths.map(path => `- \`coordination/${path}\``), '', 'Reply through the coordination log. This issue follows the open inbox on pushes to main.'].join('\n');
            if (matches.length) {
              const issue = matches[0];
              const assignees = issue.assignees.map(actor => actor.login);
              if (issue.body !== body || !assignees.includes(login) || assignees.length !== 1) {
                const args = ['issue', 'edit', String(issue.number), '--repo', repo, '--body', body, '--add-assignee', login];
                for (const previous of assignees.filter(value => value !== login)) args.push('--remove-assignee', previous);
                gh(...args);
              }
              for (const duplicate of matches.slice(1)) gh('issue', 'close', String(duplicate.number), '--repo', repo);
            } else {
              gh('issue', 'create', '--repo', repo, '--title', title, '--body', body, '--assignee', login);
            }
          }
          // END TURN LOGIC
          NODE
```

### coordination/README.md

SHA-256: f93293a767359c263358167300580a608af61f105da0e5f9c3c63442ef34e7ae

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

**The coordination layer lives in `coordination/`, with one GitHub notification workflow
in `.github/workflows/lex-turns.yml`.** No change to `lexprov/`, `service/`, `hq/`,
`handoff/`, or `CLAUDE.md`. Remove both the directory and that workflow to remove the layer.

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

The workflow installs the exact SDK from `package-lock.json` using `npm ci`. Its only
explicit token permission is `issues: write`, and its only secret is `GITHUB_TOKEN`,
available only to the reconciliation step. Source is fetched anonymously, so this
workflow requires a public GitHub repository with Issues and Actions enabled. It cannot
read private source under this permission contract. Runs are serialized and read current
`main` when they start, so an older queued push does not restore a stale inbox. A failed
inbox read fails the run before issue writes. Issue titles in the `Your turn: <slug>`
namespace are reserved for this workflow. A partial API failure may need another push;
there is no periodic retry. No model runs and no commits or packages are published.

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

**Authorship is not authenticated.** Anyone who can push can write an event claiming to be any
actor. Push access is the whole boundary. Stated rather than glossed: see `SECURITY.md` at
github.com/jcools1977/EngramPort_2026

**This is JavaScript in a Python repository.** Posting means running a small Node script. Real
friction, no good answer yet.

## Upstream

MIT and public: github.com/jcools1977/EngramPort_2026 — including `docs/constraints.md`, which
records where its own architecture agent was wrong, with the mechanism each time.
```

### coordination/actors/nick.yaml

SHA-256: dd67de404c05a53d27780264d275b5aa1eed66951d4223d911e8718f01a9c347

```text
schema_version: 0
slug: nick
display_name: Nicholas
kind: human
provider: none
capabilities: [product, grammar, evidence, security-review]
event_directory: events/nick
artifact_prefix: artifacts/nick
github: nep1019
```

### coordination/actors/john.yaml

SHA-256: 82a40e8a28eff748fc94e92377c83b2b15657e4cc8433bfb1844c236ee33a087

```text
schema_version: 0
slug: john
display_name: J. DeVere Cooley
kind: human
provider: none
capabilities: [product, positioning, review]
event_directory: events/john
artifact_prefix: artifacts/john
github: jcools1977
```

### coordination/tests/lex-turns.test.mjs

SHA-256: 01a7185e7b583635681d6aa07d81947ba0a0cfb64a20f4ac640a1acf64451d76

```text
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@engramport/sdk';

const workflow = readFileSync(resolve(import.meta.dirname, '../../.github/workflows/lex-turns.yml'), 'utf8');
const logic = workflow.split('          // BEGIN TURN LOGIC:')[1].split('\n').slice(1).join('\n').split('          // END TURN LOGIC')[0].replace(/^          /gm, '');
const sdkCLI = resolve(import.meta.dirname, '../node_modules/@engramport/sdk/dist/cli.mjs');
const put = (file, content) => { mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, content); };

async function temporary(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'lex-turn-issues-'));
  try { await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('SDK scaffold verifies and appends both with and without github metadata', async () => {
  for (const github of [false, true]) await temporary(async dir => {
    const init = spawnSync(process.execPath, [sdkCLI, 'init', '--actor', 'seat', '--kind', 'human', '--project', 'fixture', '--mode', 'free_form'], { cwd: dir, encoding: 'utf8' });
    assert.equal(init.status, 0, init.stdout + init.stderr);
    if (github) {
      const actor = join(dir, 'actors/seat.yaml');
      writeFileSync(actor, readFileSync(actor, 'utf8') + 'github: example-login\n');
    }
    const client = createClient({ actor: 'seat', cwd: dir });
    assert.deepEqual(await client.inbox(), []);
    const result = await client.append({ thread: 'control', type: 'message', body: 'Synthetic metadata acceptance control.', next: null });
    assert.equal(result.ok, true, JSON.stringify(result));
    const verify = spawnSync(process.execPath, [sdkCLI, 'verify'], { cwd: dir, encoding: 'utf8' });
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    console.log(`ACTOR github=${github}: init=0 append.ok=${result.ok} verify=0 ${verify.stdout.trim()}`);
  });
});

async function issuesFixture(fn) {
  await temporary(async dir => {
    for (const [slug, login] of [['nick', 'nep1019'], ['john', 'jcools1977'], ['nick-agent', null], ['john-agent', null]]) {
      put(join(dir, `actors/${slug}.yaml`), `slug: ${slug}\n${login ? `github: ${login}\n` : ''}`);
    }
    put(join(dir, 'bin/engram'), `const fs=require('node:fs');const actor=process.argv.at(-1);fs.appendFileSync('inbox-trace',actor+'\\n');const data=JSON.parse(fs.readFileSync('inboxes.json'));if(data[actor]==='FAIL')process.exit(1);console.log(data[actor]?.length?data[actor].join('\\n'):'Nothing open for '+actor+'.');`);
    put(join(dir, 'stub/gh'), `#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2);const value=key=>args[args.indexOf(key)+1];
fs.appendFileSync('gh-trace',JSON.stringify(args)+'\\n');
let issues=JSON.parse(fs.readFileSync('issues.json'));
if(args[0]==='api') { console.log(JSON.stringify([issues.filter(i=>i.state==='open')]));process.exit(0); }
if(args[1]==='create') issues.push({number:issues.length+1,title:value('--title'),body:value('--body'),assignees:[{login:value('--assignee')}],state:'open'});
else {const issue=issues.find(i=>String(i.number)===args[2]);if(!issue)throw Error('missing issue');
if(args[1]==='close')issue.state='closed';
else if(args[1]==='edit'){issue.body=value('--body');issue.assignees=[{login:value('--add-assignee')}];}
else throw Error('unexpected command');}
fs.writeFileSync('issues.json',JSON.stringify(issues));
`);
    chmodSync(join(dir, 'stub/gh'), 0o755);
    put(join(dir, 'issues.json'), '[]');
    const inbox = data => put(join(dir, 'inboxes.json'), JSON.stringify(data));
    const run = (source = logic) => spawnSync(process.execPath, ['--input-type=module', '-e', source], { cwd: dir, encoding: 'utf8', env: { ...process.env, GH_REPO: 'synthetic/repository', PATH: `${join(dir, 'stub')}:${process.env.PATH}` } });
    const calls = () => readFileSync(join(dir, 'gh-trace'), 'utf8').trim().split('\n').map(JSON.parse);
    const issues = () => JSON.parse(readFileSync(join(dir, 'issues.json'), 'utf8'));
    await fn({ dir, inbox, run, calls, issues });
  });
}

const first = { nick: ['events/john/turn-one.md', 'events/john/turn-two.md'], john: ['events/nick/turn-three.md'] };
const ok = result => assert.equal(result.status, 0, result.stdout + result.stderr);

test('workflow logic creates per human seat, updates without duplicates, skips unchanged and closes clear seats', async () => issuesFixture(async ({ dir, inbox, run, calls, issues }) => {
  inbox(first); ok(run());
  assert.equal(issues().length, 2);
  for (const [slug, login] of [['nick', 'nep1019'], ['john', 'jcools1977']]) {
    const issue = issues().find(i => i.title === `Your turn: ${slug}`);
    assert.deepEqual(issue.assignees, [{ login }]);
    for (const path of first[slug]) assert.ok(issue.body.includes(path));
  }
  assert.deepEqual(readFileSync(join(dir, 'inbox-trace'), 'utf8').trim().split('\n'), ['john', 'nick']);
  inbox({ ...first, nick: ['events/john/turn-two.md'] }); ok(run());
  assert.equal(issues().length, 2);
  assert.equal(calls().filter(c => c[1] === 'create').length, 2);
  assert.equal(calls().filter(c => c[1] === 'edit').length, 1);
  assert.ok(!issues().find(i => i.title.endsWith('nick')).body.includes('turn-one.md'));
  ok(run()); assert.equal(calls().filter(c => c[1] === 'edit').length, 1);
  inbox({ nick: [], john: first.john }); ok(run());
  assert.equal(issues().find(i => i.title.endsWith('nick')).state, 'closed');
  assert.equal(issues().find(i => i.title.endsWith('john')).state, 'open');
  inbox({ nick: [], john: [] }); ok(run());
  assert.ok(issues().every(i => i.state === 'closed'));
  console.log('GH RECORDED CALLS ' + JSON.stringify(calls()));
}));

test('failed or malformed inbox refuses before gh; malformed github refuses', async () => issuesFixture(async ({ dir, inbox, run }) => {
  for (const value of ['FAIL', ['unexpected output']]) {
    inbox({ john: first.john, nick: value }); assert.notEqual(run().status, 0);
    assert.throws(() => readFileSync(join(dir, 'gh-trace')), { code: 'ENOENT' });
  }
  put(join(dir, 'actors/john.yaml'), 'slug: john\ngithub: --bad\n');
  inbox(first); assert.notEqual(run().status, 0);
  assert.throws(() => readFileSync(join(dir, 'gh-trace')), { code: 'ENOENT' });
}));

test('same observer detects mutation bypassing existing issue selection', async () => issuesFixture(async ({ inbox, run, issues }) => {
  const mutant = logic.replace('issues.filter(issue => issue.title === title)', 'issues.filter(() => false)');
  assert.notEqual(mutant, logic);
  inbox(first); ok(run(mutant)); ok(run(mutant));
  assert.throws(() => assert.equal(issues().length, 2));
  assert.equal(issues().length, 4);
  console.log('MUTATION: 4 issues after two passes; fixed observer requires 2. Detected.');
}));

test('workflow permission, trigger, token and locked install contract', () => {
  assert.match(workflow, /on:\n  push:\n    branches: \[main\]/);
  assert.deepEqual([...workflow.matchAll(/^permissions:\n((?:  .+\n)+)/gm)].map(m => m[1]), ['  issues: write\n']);
  assert.equal((workflow.match(/permissions:/g) ?? []).length, 1);
  assert.deepEqual([...workflow.matchAll(/secrets\.([A-Za-z_]+)/g)].map(m => m[1]), ['GITHUB_TOKEN']);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.match(workflow, /cancel-in-progress: false/);
  const lock = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package-lock.json')));
  assert.equal(lock.packages['node_modules/@engramport/sdk'].version, '0.3.0');
  for (const [slug, login] of [['nick', 'nep1019'], ['john', 'jcools1977']]) assert.match(readFileSync(resolve(import.meta.dirname, `../actors/${slug}.yaml`), 'utf8'), new RegExp(`^github: ${login}$`, 'm'));
  for (const slug of ['nick-agent', 'john-agent']) assert.doesNotMatch(readFileSync(resolve(import.meta.dirname, `../actors/${slug}.yaml`), 'utf8'), /^github:/m);
});
```
