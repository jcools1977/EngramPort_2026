import subprocess,os,pathlib,concurrent.futures,threading
out=pathlib.Path('artifacts/agent-b/f178'); lock=threading.Lock()
def run(item):
 label,node,i=item
 env=dict(os.environ,PATH=str(pathlib.Path(node).parent)+':'+os.environ['PATH'])
 version=subprocess.check_output([node,'--version'],text=True).strip()
 args=[str(pathlib.Path(node).parent/'npm'),'run','d1:controls:test']
 logfile=out/f'{label}-npm-{i:02}.log'
 with logfile.open('w') as log:
  log.write(f'NODE={node} {version}\nCOMMAND={args!r}\n');log.flush()
  r=subprocess.run(args,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=600)
  log.write(f'EXIT={r.returncode}\n')
 lines=[x for x in logfile.read_text().splitlines() if x.startswith(('# tests ','# pass ','# fail ','# skipped ','# cancelled ','# D1_CANARY_BUDGET'))]
 with lock:
  with (out/'npm-summary.log').open('a') as summary: summary.write(f'NODE={node} {version} run={i} exit={r.returncode}\n'+'\n'.join(lines)+'\n')
  print(label,i,r.returncode,flush=True)
 return r.returncode
jobs=[(label,node,i) for i in range(1,11) for label,node in [('22','/opt/homebrew/opt/node@22/bin/node'),('26','/opt/homebrew/bin/node')] if label!='22' or i>2]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 codes=list(pool.map(run,jobs))
raise SystemExit(int(any(codes)))
