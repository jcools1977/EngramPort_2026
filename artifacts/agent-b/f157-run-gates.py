"""Run each canonical gate independently so a known failure cannot hide later gates."""
import json
import pathlib
import shlex
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[2]
package = json.loads((root / 'package.json').read_text())
commands = package['scripts']['test'].split(' && ')
commands.extend(['npm run db:test', 'npm run kms:test', 'npm run lint'])
results = []
for command in commands:
    print('START ' + command, flush=True)
    start = time.monotonic()
    process = subprocess.run(shlex.split(command), cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    result = {'command': command, 'exit_code': process.returncode, 'seconds': round(time.monotonic() - start, 3), 'output': process.stdout}
    results.append(result)
    (root / 'artifacts/agent-b/f157-gates.json').write_text(json.dumps(results, indent=2) + '\n')
    print('DONE ' + command + ' exit=' + str(process.returncode), flush=True)
print('GATES executed=' + str(len(results)) + ' passed=' + str(sum(r['exit_code'] == 0 for r in results)), flush=True)
