import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function exerciseCheckout(bin) {
  for (const dropAttribute of [false, true]) {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'f174-checkout-'));
    const run = (command, args) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      run(bin, ['init', '--actor', 'builder', '--kind', 'agent']);
      assert.equal(await readFile(path.join(cwd, '.gitattributes'), 'utf8'), '* -text\n');
      const relative = 'artifacts/builder/evidence.txt';
      const bytes = 'exact evidence  \nsecond line\n\n';
      await writeFile(path.join(cwd, relative), bytes);
      const digest = createHash('sha256').update(bytes).digest('hex');
      run(bin, ['append', '--actor', 'builder', '--thread', 'checkout', '--type', 'message', '--body', path.join(cwd, relative), '--artifacts', `${relative}#sha256=${digest}`, '--next', 'null']);
      if (dropAttribute) await rm(path.join(cwd, '.gitattributes'));
      run('git', ['init', '-q']);
      run('git', ['config', 'core.autocrlf', 'true']);
      run('git', ['config', 'core.attributesFile', '/dev/null']);
      run('git', ['add', '.']);
      run('git', ['-c', 'user.name=Synthetic Test', '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'temporary checkout fixture']);
      await rm(path.join(cwd, relative));
      run('git', ['checkout', '--', relative]);
      const observed = await readFile(path.join(cwd, relative), 'utf8');
      if (!dropAttribute) {
        assert.equal(observed, bytes);
        assert.match(run(bin, ['verify']), /verified 1 events/);
        console.log('F174_PACKED_CHECKOUT attribute=present autocrlf=true exact_bytes=true verify=passed');
      } else {
        assert.equal(observed, bytes.replaceAll('\n', '\r\n'));
        assert.throws(() => run(bin, ['verify']), error => {
          assert.match(error.stderr, /CHECKOUT_ALTERED_BYTES.*artifacts\/builder\/evidence.txt/);
          return true;
        });
        console.log('F174_PACKED_MUTATION drop_attribute=true autocrlf=true CRLF=observed verification=refused executed=1 killed=1');
      }
    } finally { await rm(cwd, { recursive: true, force: true }); }
  }
}
