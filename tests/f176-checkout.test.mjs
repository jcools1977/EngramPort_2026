import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { initProject } from '../packages/git-adapter/src/init.mjs';
import { appendEvent } from '../packages/git-adapter/src/event-core.mjs';
import { verifyLog } from '../packages/git-adapter/src/verify-log.mjs';

const adapter = path.resolve('packages/git-adapter/src');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const relative = 'artifacts/builder/evidence.txt';
async function fixture(fn) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'f176-'));
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await initProject({ actor: 'builder', kind: 'agent' }, cwd);
    git(['init', '-q']);
    git(['config', 'core.autocrlf', 'true']);
    git(['config', 'core.attributesFile', path.join(cwd, 'no-global-attributes')]);
    const bytes = 'first  \r\nsecond\r\n';
    await writeFile(path.join(cwd, relative), bytes);
    const ref = `${relative}#sha256=${sha(bytes)}`;
    const input = { actor: 'builder', thread: 'checkout', type: 'handoff', body: 'Fixture.', next: null, artifacts: [ref], boundedContext: [{ type: 'artifact', ref }], completionCriteria: [{ id: 'bytes', statement: 'Exact bytes', evidence_classes: ['artifact'] }] };
    await fn({ cwd, git, bytes, input });
  } finally { await rm(cwd, { recursive: true, force: true }); }
}
function refusal(result) {
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
  for (const error of result.errors) {
    assert.match(error, /CHECKOUT_ALTERED_BYTES.*artifacts\/builder\/evidence.txt.*\* -text.*\.gitattributes/);
    assert.doesNotMatch(error, /artifact hash mismatch/);
  }
}

test('F176 append refuses rewriting, attribute permits exact pin, reverse checkout and edits discriminate', async () => fixture(async ({ cwd, git, bytes, input }) => {
  await rm(path.join(cwd, '.gitattributes'));
  await assert.rejects(appendEvent(input, { cwd }), /ARTIFACT_CHECKOUT_REWRITE.*artifacts\/builder\/evidence.txt.*different bytes than were pinned.*\* -text.*\.gitattributes/);
  console.log('F176_APPEND no_attribute=ARTIFACT_CHECKOUT_REWRITE path=artifacts/builder/evidence.txt remedy=* -text in .gitattributes');
  await writeFile(path.join(cwd, '.gitattributes'), '* -text\n');
  assert.equal((await appendEvent(input, { cwd })).ok, true);
  assert.equal((await verifyLog(cwd)).ok, true);
  console.log('F176_APPEND attribute=present append=passed verify=passed');
  await rm(path.join(cwd, '.gitattributes'));
  git(['add', '.']);
  git(['-c', 'user.name=Synthetic Test', '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture']);
  git(['config', 'core.autocrlf', 'input']);
  await rm(path.join(cwd, relative));
  git(['checkout', '--', relative]);
  assert.equal(await readFile(path.join(cwd, relative), 'utf8'), bytes.replaceAll('\r\n', '\n'));
  refusal(await verifyLog(cwd));
  console.log('F176_REVERSE crlf_pin=true autocrlf=input checkout=LF both_consumers=CHECKOUT_ALTERED_BYTES');
  await writeFile(path.join(cwd, relative), 'edited\n');
  const edited = await verifyLog(cwd);
  assert.equal(edited.ok, false);
  assert.equal(edited.errors.length, 2);
  assert.ok(edited.errors.every(e => e.includes('artifact hash mismatch')));
  console.log('F176_EDIT both_consumers=artifact hash mismatch');
}));

test('F176 removing append check admits doomed pin; second checkout detects drift; original restored', async () => fixture(async ({ cwd, git, bytes, input }) => {
  const source = await readFile(path.join(adapter, 'event-core.mjs'), 'utf8');
  const start = source.indexOf('  // Candidate verification has already checked');
  const end = source.indexOf(' /* ARTIFACT_GIT_BYTES_CHECK */', start) + ' /* ARTIFACT_GIT_BYTES_CHECK */'.length;
  assert.ok(start > 0 && end > start);
  let mutant = source.slice(0, start) + source.slice(end);
  mutant = mutant.replace(/from "(\.\/[^"\n]+)"/g, (_, specifier) => `from ${JSON.stringify(pathToFileURL(path.resolve(adapter, specifier)).href)}`);
  const modulePath = path.join(cwd, 'mutant.mjs');
  await writeFile(modulePath, mutant);
  const changed = await import(pathToFileURL(modulePath));
  await rm(path.join(cwd, '.gitattributes'));
  assert.equal((await changed.appendEvent(input, { cwd })).ok, true);
  assert.equal((await verifyLog(cwd)).ok, true);
  git(['add', 'events', 'actors', 'artifacts', 'engramport.yaml']);
  git(['-c', 'user.name=Synthetic Test', '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'mutated fixture']);
  const second = path.join(cwd, 'second');
  git(['clone', '-q', '--no-checkout', '.', second]);
  const otherGit = args => execFileSync('git', args, { cwd: second, encoding: 'utf8' });
  otherGit(['config', 'core.autocrlf', 'input']);
  otherGit(['checkout', '-q', 'HEAD']);
  assert.equal(await readFile(path.join(second, relative), 'utf8'), bytes.replaceAll('\r\n', '\n'));
  refusal(await verifyLog(second));
  await assert.rejects(appendEvent({ ...input, thread: 'restored' }, { cwd }), /ARTIFACT_CHECKOUT_REWRITE/);
  console.log('F176_MUTATION executed=1 killed=1 mutant_append=passed first_verify=passed second_checkout=CHECKOUT_ALTERED_BYTES restored=ARTIFACT_CHECKOUT_REWRITE');
}));

test('F176 Git unavailable is a named refusal, never a skipped check', async () => fixture(async ({ cwd, input }) => {
  const childProcess = (await import('node:child_process')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const original = childProcess.execFileSync;
  try {
    childProcess.execFileSync = () => { throw Object.assign(new Error('synthetic Git unavailable'), { code: 'ENOENT' }); };
    syncBuiltinESMExports();
    await assert.rejects(appendEvent(input, { cwd }), /ARTIFACT_GIT_CHECK_REFUSED.*artifacts\/builder\/evidence.txt.*Git must be available/);
    console.log('F176_GIT_UNAVAILABLE synthetic_ENOENT=ARTIFACT_GIT_CHECK_REFUSED');
  } finally {
    childProcess.execFileSync = original;
    syncBuiltinESMExports();
  }
}));
