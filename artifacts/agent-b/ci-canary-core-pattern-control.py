"""Synthetic precondition control. No Docker commands are executed."""
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
fixture = root / "tests/helpers/w1-7-canary-fixture.mjs"
original = fixture.read_text()
anchor = 'if(pattern!=="core")throw new Error('
assert original.count(anchor) == 1
command = ["node", "--test", "--test-name-pattern=canary core pattern", "tests/wizard-w1-7.test.mjs"]
env = dict(os.environ, W1_7_CASE="core-pattern")

def run(label):
    result = subprocess.run(command, cwd=root, env=env, text=True, capture_output=True, timeout=30)
    print(f"COMMAND W1_7_CASE=core-pattern {' '.join(command)} phase={label}", flush=True)
    print(result.stdout, end="", flush=True)
    print(result.stderr, end="", flush=True)
    print(f"CONTROL phase={label} exit={result.returncode}", flush=True)
    return result

baseline = run("baseline")
assert baseline.returncode == 0
try:
    # Reject every pattern: the valid-file control must fail, without reaching Docker.
    fixture.write_text(original.replace(anchor, 'if(true /* synthetic always-reject mutation */)throw new Error('))
    mutant = run("always-reject-mutant")
    assert mutant.returncode != 0
    assert "canary core pattern accepts the synthetic plain core file and proceeds" in mutant.stdout
    assert 'host kernel.core_pattern="core"' in mutant.stdout
finally:
    fixture.write_text(original)
restored = run("restored")
assert restored.returncode == 0
assert fixture.read_text() == original
print("CORE_PATTERN_MUTATION baseline=0 mutant=1 restored=0 killed=true live_canary=blocked ci=blocked")
