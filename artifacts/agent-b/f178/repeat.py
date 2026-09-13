import subprocess, os, pathlib
out=pathlib.Path('artifacts/agent-b/f178')
with (out/'repeat-summary.log').open('w') as summary:
 for label,node in [('22','/opt/homebrew/opt/node@22/bin/node'),('26','/opt/homebrew/bin/node')]:
  env=dict(os.environ,PATH=str(pathlib.Path(node).parent)+':'+os.environ['PATH'])
  version=subprocess.check_output([node,'--version'],text=True).strip()
  for mode,args in [('direct',[node,'--test','tests/d1-baseline-timeout.test.mjs']),('npm',[str(pathlib.Path(node).parent/'npm'),'run','d1:controls:test'])]:
   for i in range(1,11):
    r=subprocess.run(args,env=env,capture_output=True,text=True,timeout=90)
    text=r.stdout+r.stderr
    (out/f'{label}-{mode}-{i:02}.log').write_text(f'NODE={node} {version}\nCOMMAND={args!r}\nEXIT={r.returncode}\n'+text)
    lines=[x for x in text.splitlines() if x.startswith(('# tests ','# pass ','# fail ','# skipped ','# cancelled ','# D1_CANARY_BUDGET'))]
    summary.write(f'NODE={node} {version} mode={mode} run={i} exit={r.returncode}\n'+ '\n'.join(lines)+'\n');summary.flush()
    print(label,mode,i,r.returncode,flush=True)
    if r.returncode: raise SystemExit(1)
