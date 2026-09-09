"""Docker-free permission fragment control; no real crash or foreign uid claim."""
from pathlib import Path
import re
import shlex
import subprocess
import tempfile

fixture = Path('tests/helpers/w1-7-canary-fixture.mjs')
source = fixture.read_text()
original = subprocess.check_output(['git', 'show', f'HEAD:{fixture}'], text=True)
addition = 'chmod a+r /dump/core || exit $?; '
comment = '  // Actions run 34368556755: root-owned cores denied host reads (EACCES); expose the dump bytes before exit.\n'
assert source.count(addition) == 2
assert source.replace(addition, '').replace(comment, '') == original
for name in ['tests/wizard-w1-7.test.mjs', '.github/workflows/verify-proof.yml']:
    assert Path(name).read_bytes() == subprocess.check_output(['git', 'show', f'HEAD:{name}'])
print('UNCHANGED assertions=byte-identical workflow=byte-identical remaining-fixture=byte-identical')
fragments = re.findall(r'crash_rc=\$\?; (.*?)exit "\$crash_rc"', source)
assert len(fragments) == 2
for branch, fragment in zip(['vulnerable', 'protected'], fragments):
    # Keep the protected wait/error handling; supply a synthetic completed signer.
    for phase, selected, expected in [('baseline', fragment, True), ('chmod-removed-mutant', fragment.replace(addition, ''), False), ('restored', fragment, True)]:
        with tempfile.TemporaryDirectory(prefix='engram-core-mode-') as temp:
            core = Path(temp) / 'core'
            payload = b'synthetic core bytes\x00\xff\n'
            core.write_bytes(payload)
            core.chmod(0o600)
            shell = selected.replace('/dump/core', shlex.quote(str(core)))
            command = '(exit 0) & sign_pid=$!; (exit 139); crash_rc=$?; ' + shell + 'exit "$crash_rc"'
            result = subprocess.run(['bash', '-c', command], capture_output=True, text=True)
            mode = core.stat().st_mode & 0o777
            readable = mode & 0o044 == 0o044
            assert result.returncode == 139, result
            assert core.read_bytes() == payload
            assert readable == expected, (branch, phase, oct(mode))
            print(f'PERMISSION branch={branch} phase={phase} mode={mode:04o} group_other_readable={str(readable).lower()} bytes_unchanged=true crash_exit={result.returncode} control_exit={0 if readable else 1}')
print('MUTATION both-branches=discriminating live-core=blocked actions=blocked')
