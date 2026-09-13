import subprocess,os,pathlib
out=pathlib.Path('artifacts/agent-b/f178')
for label,node in [('22','/opt/homebrew/opt/node@22/bin/node'),('26','/opt/homebrew/bin/node')]:
 env=dict(os.environ,PATH=str(pathlib.Path(node).parent)+':'+os.environ['PATH'])
 version=subprocess.check_output([node,'--version'],text=True).strip()
 for i in range(1,11):
  args=[str(pathlib.Path(node).parent/'npm'),'run','d1:controls:test']
  logfile=out/f'{label}-npm-{i:02}.log'
  with logfile.open('w') as log:
   log.write(f'NODE={node} {version}\nCOMMAND={args!r}\n');log.flush()
   r=subprocess.run(args,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=600)
   log.write(f'EXIT={r.returncode}\n')
  lines=[x for x in logfile.read_text().splitlines() if x.startswith(('# tests ','# pass ','# fail ','# skipped ','# cancelled ','# D1_CANARY_BUDGET'))]
  with (out/'npm-summary.log').open('a') as summary: summary.write(f'NODE={node} {version} run={i} exit={r.returncode}\n'+'\n'.join(lines)+'\n')
  print(label,i,r.returncode,flush=True)
  if r.returncode: break
