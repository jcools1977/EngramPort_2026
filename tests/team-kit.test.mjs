import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '../packages/sdk/dist/index.mjs';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'packages/sdk/dist/cli.mjs');
const version = JSON.parse(readFileSync(join(root, 'packages/sdk/package.json'))).version;
const put = (file, text) => { mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, text); };
const ok = result => assert.equal(result.status, 0, result.stdout + result.stderr);
const invoke = (cwd, args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
const extract = (text, type) => text.replace(/\r\n/g, '\n').split(`          // BEGIN ${type} LOGIC`)[1].split('\n').slice(1).join('\n').split(`          // END ${type} LOGIC`)[0].replace(/^ {10}/gm, '');
async function temporary(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'engram-team-kit-'));
  try { await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
function scaffold(dir, sub = '.') {
  mkdirSync(join(dir, '.git'));
  const cwd = join(dir, sub);
  mkdirSync(cwd, { recursive: true });
  ok(invoke(cwd, ['init', '--actor', 'human', '--kind', 'human', '--github-login', 'Example-Login', '--github', '--mode', 'strict_relay']));
  return { cwd, workflows: Object.fromEntries(['turns', 'replies'].map(name => [name, readFileSync(join(dir, `.github/workflows/engram-${name}.yml`), 'utf8')])) };
}

test('init opt-in, actor login, repository-root and nested paths, CRLF and ported workflow contracts', async () => {
  await temporary(async dir => {
    ok(invoke(dir, ['init', '--actor', 'human', '--kind', 'human']));
    assert.equal(existsSync(join(dir, '.github')), false);
    assert.doesNotMatch(readFileSync(join(dir, 'actors/human.yaml'), 'utf8'), /^github:/m);
  });
  for (const sub of ['.', 'coordination', 'logs/team.v1']) await temporary(async dir => {
    const { cwd, workflows } = scaffold(dir, sub);
    ok(invoke(cwd, ['verify']));
    assert.match(readFileSync(join(cwd, 'actors/human.yaml'), 'utf8'), /^github: Example-Login$/m);
    for (const [name, workflow] of Object.entries(workflows)) for (const input of [workflow, workflow.replace(/\n/g, '\r\n')]) {
      const text = input.replace(/\r\n/g, '\n');
      assert.equal(extract(input, name === 'turns' ? 'TURN' : 'REPLY'), extract(workflow, name === 'turns' ? 'TURN' : 'REPLY'));
      assert.deepEqual([...text.matchAll(/^permissions:\n((?: {2}.+\n)+)/gm)].map(m => m[1]), [`  contents: ${name === 'turns' ? 'read' : 'write'}\n  issues: write\n`]);
      assert.equal((text.match(/permissions:/g) ?? []).length, 1);
      assert.deepEqual([...text.matchAll(/secrets\.([A-Za-z_]+)/g)].map(m => m[1]), ['GITHUB_TOKEN']);
      assert.deepEqual([...text.matchAll(/uses: (.+)/g)].map(m => m[1]), [
        'actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4',
        'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4',
      ]);
      assert.ok(text.includes(`@engramport/sdk@${version}\n`));
      assert.match(text, /npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund/);
      assert.match(text, /--prefix \. @engramport\/sdk@/);
      assert.ok(text.includes(`working-directory: "${sub}"`));
      assert.match(text, /cancel-in-progress: false/);
      assert.doesNotMatch(text, /\$\{\{[^}]*comment\.body/);
      assert.doesNotMatch(text, /LEX_EXEC_SHIM|__LOG_|__SDK_/);
    }
    assert.match(workflows.turns, /on:\n {2}push:\n {4}branches: \[main\]/);
    assert.match(workflows.replies, /issue_comment:\n {4}types: \[created\]/);
    assert.match(workflows.replies, /group: engram-reply-\$\{\{ github.event.comment.id \}\}/);
    assert.match(workflows.replies, /JSON.parse\(readFileSync\(process.env.GITHUB_EVENT_PATH, 'utf8'\)\)/);
    console.log(`INIT sub=${sub} workflows=2 login=verified contracts=passed`);
  });
});

test('standalone root, worktree marker and login-only scaffolds are supported', async () => {
  for (const scenario of ['standalone', 'worktree', 'login-only']) await temporary(async dir => {
    let cwd = dir;
    if (scenario === 'worktree') { put(join(dir, '.git'), 'gitdir: /synthetic/git-metadata\n'); cwd = join(dir, 'log'); mkdirSync(cwd); }
    const args = ['init', '--actor', 'human', '--kind', 'human', '--github-login', 'example'];
    if (scenario !== 'login-only') args.push('--github');
    ok(invoke(cwd, args)); ok(invoke(cwd, ['verify']));
    assert.equal(existsSync(join(dir, '.github/workflows/engram-turns.yml')), scenario !== 'login-only');
    assert.match(readFileSync(join(cwd, 'actors/human.yaml'), 'utf8'), /^github: example$/m);
  });
});

test('init refuses unsafe login, workflow collision and symlink without writing a log', async () => {
  for (const login of ['', '--bad', 'x\ngithub: injected', 'two--hyphens']) await temporary(async dir => {
    const result = invoke(dir, ['init', '--actor', 'human', '--kind', 'human', '--github-login', login]);
    assert.notEqual(result.status, 0); assert.match(result.stderr, /INIT_GITHUB_LOGIN_REFUSED/); assert.deepEqual(readdirSync(dir), []);
  });
  for (const scenario of ['collision', 'symlink']) await temporary(async dir => {
    mkdirSync(join(dir, '.git')); mkdirSync(join(dir, 'log'));
    if (scenario === 'collision') put(join(dir, '.github/workflows/engram-replies.yml'), 'preserve');
    else { mkdirSync(join(dir, 'outside')); symlinkSync(join(dir, 'outside'), join(dir, '.github'), 'dir'); }
    const result = invoke(join(dir, 'log'), ['init', '--actor', 'human', '--kind', 'human', '--github']);
    assert.notEqual(result.status, 0); assert.match(result.stderr, /INIT_GITHUB_PATH_EXISTS/); assert.deepEqual(readdirSync(join(dir, 'log')), []);
  });
});

async function replyFixture(sub, fn) {
  await temporary(async dir => {
    const { cwd, workflows } = scaffold(dir, sub);
    put(join(cwd, 'actors/builder.yaml'), 'schema_version: 0\nslug: builder\ndisplay_name: Builder\nkind: agent\nprovider: local\ncapabilities: []\nevent_directory: events/builder\nartifact_prefix: artifacts/builder\n');
    mkdirSync(join(cwd, 'events/builder')); mkdirSync(join(cwd, 'artifacts/builder'));
    symlinkSync(join(root, 'node_modules'), join(cwd, 'node_modules'), 'dir');
    const client = createClient({ actor: 'builder', cwd });
    const parent = await client.append({ thread: 'control', type: 'message', body: 'Synthetic turn', next: 'human' });
    assert.equal(parent.ok, true, JSON.stringify(parent));
    put(join(cwd, 'shim.cjs'), `const fs=require('node:fs');const [cmd,...args]=process.argv.slice(2);if(!['gh','git'].includes(cmd))throw Error('unexpected command');fs.appendFileSync('trace',JSON.stringify({cmd,args})+'\\n');if(cmd==='git'&&args[0]==='push'&&fs.existsSync('fail-push')){console.error('synthetic push rejected');process.exit(1);}`);
    const prefix = sub === '.' ? '' : `${sub}/`;
    const payload = { action: 'created', issue: { number: 42, title: 'Your turn: human', body: `- \`${prefix}${parent.relative}\`` }, comment: { id: 991, user: { login: 'example-LOGIN', type: 'User' }, body: 'Approved. Literal $(touch BAD), `code`, and ${{ secrets.NO }}.' } };
    const logic = extract(workflows.replies, 'REPLY');
    const run = (source = logic) => {
      put(join(cwd, 'payload.json'), JSON.stringify(payload));
      return spawnSync(process.execPath, ['--input-type=module', '-e', source], { cwd, encoding: 'utf8', env: { ...process.env, GH_REPO: 'synthetic/repository', GITHUB_EVENT_PATH: join(cwd, 'payload.json'), ENGRAM_EXEC_SHIM: join(cwd, 'shim.cjs') } });
    };
    const calls = () => existsSync(join(cwd, 'trace')) ? readFileSync(join(cwd, 'trace'), 'utf8').trim().split('\n').map(JSON.parse) : [];
    await fn({ cwd, payload, logic, run, calls, prefix });
  });
}
const refusal = 'Reply refused for comment 991: commenter does not match the recorded human login';
const observeForeign = f => assert.equal(f.calls().at(-1).args.at(-1), refusal);

test('written reply logic records a synthetic human event with literal payload, verifies and refuses replay', async () => {
  for (const sub of ['.', 'coordination', 'logs/team.v1']) await replyFixture(sub, async f => {
    ok(f.run()); ok(invoke(f.cwd, ['verify']));
    const files = readdirSync(join(f.cwd, 'events/human')).filter(n => n.endsWith('.md'));
    assert.equal(files.length, 1);
    const event = readFileSync(join(f.cwd, 'events/human', files[0]), 'utf8');
    assert.match(event, /from: human/); assert.match(event, /next: builder/);
    assert.ok(event.includes(f.payload.comment.body)); assert.equal(existsSync(join(f.cwd, 'BAD')), false);
    assert.equal(f.calls().at(-1).args.at(-1), `Recorded comment 991 as ${f.prefix}events/human/${files[0]}.`);
    assert.equal(f.run().status, 1); assert.match(f.calls().at(-1).args.at(-1), /Not recorded for comment 991: name exactly one currently open issue turn/);
    assert.equal(f.calls().filter(c => c.cmd === 'git' && c.args.includes('commit')).length, 1);
  });
});

test('foreign login exact refusal, nonhuman and duplicate login refusal; login-check mutation killed by same observer', async () => {
  for (const scenario of ['foreign', 'nonhuman', 'duplicate', 'mutation']) await replyFixture('.', async f => {
    const actor = join(f.cwd, 'actors/human.yaml');
    if (scenario === 'nonhuman') writeFileSync(actor, readFileSync(actor, 'utf8').replace('kind: human', 'kind: agent'));
    else if (scenario === 'duplicate') writeFileSync(actor, readFileSync(actor, 'utf8') + 'github: example-login\n');
    else f.payload.comment.user.login = 'foreign-login';
    let source = f.logic;
    if (scenario === 'mutation') { source = source.replace('logins[0].toLowerCase() !== login.toLowerCase()', 'false'); assert.notEqual(source, f.logic); }
    ok(f.run(source));
    if (scenario === 'mutation') {
      assert.throws(() => observeForeign(f), { name: 'AssertionError' });
      assert.match(f.calls().at(-1).args.at(-1), /^Recorded comment 991 as events\/human\//);
      console.log('LOGIN_MUTATION baseline=exact-refusal mutant=recorded observer=failed killed=true');
    } else {
      observeForeign(f); assert.equal(f.calls().filter(c => c.cmd === 'git').length, 0);
      assert.equal(readdirSync(join(f.cwd, 'events/human')).filter(n => n.endsWith('.md')).length, 0);
    }
  });
});

test('push failure produces visible Not recorded comment and nonzero status', async () => replyFixture('.', async f => {
  put(join(f.cwd, 'fail-push'), 'yes');
  assert.equal(f.run().status, 1);
  assert.match(f.calls().at(-1).args.at(-1), /^Not recorded for comment 991: [\s\S]*synthetic push rejected[\s\S]*Comment again\.$/);
}));

test('written turn logic opens, updates, skips unchanged and closes issues through ENGRAM_EXEC_SHIM', async () => {
  for (const sub of ['.', 'coordination']) await temporary(async dir => {
    const { cwd, workflows } = scaffold(dir, sub);
    put(join(cwd, 'issues.json'), '[]');
    put(join(cwd, 'shim.cjs'), `
const fs=require('node:fs');const [cmd,...args]=process.argv.slice(2);
fs.appendFileSync('trace',JSON.stringify({cmd,args})+'\\n');
if(cmd===process.execPath){if(JSON.stringify(args)!==JSON.stringify(['node_modules/@engramport/sdk/dist/cli.mjs','inbox','--actor','human']))throw Error('wrong SDK invocation');console.log(JSON.parse(fs.readFileSync('inbox.json')).join('\\n'));process.exit(0);}
if(cmd!=='gh')throw Error('unexpected command');
const value=k=>args[args.indexOf(k)+1];const issues=JSON.parse(fs.readFileSync('issues.json'));
if(args[0]==='api'){console.log(JSON.stringify([issues.filter(i=>i.state==='open')]));process.exit(0);}
if(args[1]==='create')issues.push({number:issues.length+1,title:value('--title'),body:value('--body'),assignees:[{login:value('--assignee')}],state:'open'});
else {const issue=issues.find(i=>String(i.number)===args[2]);if(args[1]==='close')issue.state='closed';else if(args[1]==='edit'){issue.body=value('--body');issue.assignees=[{login:value('--add-assignee')}];}else throw Error('unexpected action');}
fs.writeFileSync('issues.json',JSON.stringify(issues));`);
    const run = paths => {
      put(join(cwd, 'inbox.json'), JSON.stringify(paths));
      return spawnSync(process.execPath, ['--input-type=module', '-e', extract(workflows.turns, 'TURN')], { cwd, encoding: 'utf8', env: { ...process.env, GH_REPO: 'synthetic/repository', ENGRAM_EXEC_SHIM: join(cwd, 'shim.cjs') } });
    };
    const issues = () => JSON.parse(readFileSync(join(cwd, 'issues.json'), 'utf8'));
    const calls = () => readFileSync(join(cwd, 'trace'), 'utf8').trim().split('\n').map(JSON.parse);
    ok(run(['events/builder/one.md', 'events/builder/two.md']));
    assert.equal(issues().length, 1); assert.deepEqual(issues()[0].assignees, [{ login: 'Example-Login' }]);
    assert.ok(issues()[0].body.includes(`\`${sub === '.' ? '' : sub + '/'}events/builder/one.md\``));
    ok(run(['events/builder/two.md'])); assert.equal(issues().length, 1); assert.ok(!issues()[0].body.includes('one.md'));
    ok(run(['events/builder/two.md'])); assert.equal(calls().filter(c => c.args[1] === 'edit').length, 1);
    ok(run([])); assert.equal(issues()[0].state, 'closed');
    console.log(`TURN sub=${sub} create=1 edit=1 close=1`);
  });
});
