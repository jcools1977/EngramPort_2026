import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { initProject } from '../packages/git-adapter/src/init.mjs';
import { appendEvent } from '../packages/git-adapter/src/event-core.mjs';
import { verifyLog } from '../packages/git-adapter/src/verify-log.mjs';

const sourceFile = new URL('../packages/git-adapter/src/verify-log.mjs', import.meta.url);
function helperControl(source) {
  const consumers = source.slice(source.indexOf('  const artifactReferences ='));
  assert.equal((consumers.match(/await verifyArtifactDigest\(/g) ?? []).length, 2, 'both loops must call the shared helper');
  assert.doesNotMatch(consumers, /createHash\(|artifact hash mismatch/, 'digest comparison must live only in the helper');
}

test('F174 both digest consumers share one helper and restated comparisons are killed', async () => {
  const source = await readFile(sourceFile, 'utf8');
  helperControl(source);
  for (const label of ['label', 'event.relative']) {
    const anchor = `await verifyArtifactDigest(artifactPath, match[1], match[2], ${label}, errors);`;
    assert.ok(source.includes(anchor));
    const mutant = source.replace(anchor, 'const digest = createHash("sha256").update(await readFile(artifactPath)).digest("hex"); if (digest !== match[2]) errors.push("artifact hash mismatch");');
    assert.throws(() => helperControl(mutant), /both loops must call the shared helper/);
    console.log(`F174_HELPER_MUTATION consumer=${label} control=failed`);
  }
  console.log('F174_HELPER_MUTATIONS executed=2 killed=2 restored=passed');
});

test('F174 verifyLog distinguishes CRLF only from edits in both consumers before a commit', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'f174-verifier-'));
  const mutantDirectory = await mkdtemp(path.join(os.tmpdir(), 'f174-mutant-'));
  try {
    await initProject({ actor: 'builder', kind: 'agent' }, cwd);
    const relative = 'artifacts/builder/evidence.bin';
    // Non-UTF-8 byte, spaces, lone CR, and extra final LF must all survive.
    const bytes = Buffer.from([0xff, ...Buffer.from('exact  \nlone\rbyte\n\n')]);
    const digest = createHash('sha256').update(bytes).digest('hex');
    const ref = `${relative}#sha256=${digest}`;
    await writeFile(path.join(cwd, relative), bytes);
    const appended = await appendEvent({ actor: 'builder', thread: 'checkout', type: 'handoff', body: 'Fixture.\n', next: null, artifacts: [ref], boundedContext: [{ type: 'artifact', ref }], completionCriteria: [{ id: 'bytes', statement: 'Exact bytes', evidence_classes: ['artifact'] }] }, { cwd });
    assert.equal(appended.ok, true, JSON.stringify(appended));
    assert.equal((await verifyLog(cwd)).ok, true);
    const source = await readFile(sourceFile, 'utf8');
    const anchor = 'if (createHash("sha256").update(normalized).digest("hex") === expected)';
    assert.ok(source.includes(anchor));
    const mutantPath = path.join(mutantDirectory, 'verify.mjs');
    await writeFile(mutantPath, source.replace(anchor, 'if (false)'));
    const mutant = await import(pathToFileURL(mutantPath));
    for (const change of ['crlf', 'edit', 'both', 'trailing-space']) {
      let changed = Buffer.from(bytes);
      if (['crlf', 'both'].includes(change)) changed = Buffer.from(changed.toString('latin1').replaceAll('\n', '\r\n'), 'latin1');
      if (['edit', 'both'].includes(change)) changed[1] ^= 1;
      if (change === 'trailing-space') changed = Buffer.concat([changed, Buffer.from(' ')]);
      await writeFile(path.join(cwd, relative), changed);
      const observed = await verifyLog(cwd);
      assert.equal(observed.ok, false);
      assert.equal(observed.errors.length, 2, JSON.stringify(observed));
      for (const error of observed.errors) {
        assert.ok(error.includes(relative));
        assert.match(error, change === 'crlf' ? /CHECKOUT_ALTERED_BYTES.*\* -text.*\.gitattributes/ : /artifact hash mismatch/);
      }
      console.log(`F174_VERIFY case=${change} errors=${JSON.stringify(observed.errors)}`);
      if (change === 'crlf') {
        const altered = await mutant.verifyLog(cwd);
        assert.equal(altered.errors.length, 2);
        assert.ok(altered.errors.every(error => error.includes('artifact hash mismatch')));
        assert.throws(() => assert.match(altered.errors.join('\n'), /CHECKOUT_ALTERED_BYTES/));
        console.log(`F174_NORMALIZATION_MUTATION executed=1 killed=1 errors=${JSON.stringify(altered.errors)}`);
      }
    }
    await writeFile(path.join(cwd, relative), bytes);
    assert.equal((await verifyLog(cwd)).ok, true);
  } finally {
    await rm(cwd, { recursive: true, force: true });
    await rm(mutantDirectory, { recursive: true, force: true });
  }
});
