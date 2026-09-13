import os, subprocess, json, pathlib
out=pathlib.Path('artifacts/agent-b/f178'); tmp=pathlib.Path('/private/tmp/f178-probe'); tmp.mkdir(exist_ok=True)
child=tmp/'child.mjs'; child.write_text('''import test from "node:test"; import {setTimeout} from "node:timers/promises";
test("canary budget override", {timeout:300}, async t=>{await setTimeout(150,null,{signal:t.signal});});
test("ordinary default budget", async t=>{await setTimeout(5000,null,{signal:t.signal});});
''')
parent=tmp/'parent.mjs'; parent.write_text('''import test from "node:test"; import {spawnSync} from "node:child_process";
test("parent",()=>{const env={...process.env}; if(process.env.STRIP_CONTEXT==='1') delete env.NODE_TEST_CONTEXT; console.log('CONTEXT='+process.env.NODE_TEST_CONTEXT); const r=spawnSync(process.execPath,JSON.parse(process.env.CHILD_ARGS),{env,encoding:'utf8'}); console.log('CHILD_EXIT='+r.status+'\\n'+r.stdout+r.stderr);});
''')
with (out/'probe.log').open('w') as log:
 for node in ['/opt/homebrew/opt/node@22/bin/node','/opt/homebrew/bin/node']:
  for clean in [False,True]:
   for mode in ['direct','parent-inherit','parent-strip']:
    for isolation in ['default','process','none']:
     env={'PATH':str(pathlib.Path(node).parent)+':/usr/bin:/bin'} if clean else dict(os.environ,PATH=str(pathlib.Path(node).parent)+':'+os.environ['PATH'])
     args=['--test','--test-reporter=tap','--test-timeout=100']+([] if isolation=='default' else ['--test-isolation='+isolation])+[str(child)]
     cmd=[node]+args
     if mode!='direct':
      env.update(CHILD_ARGS=json.dumps(args),STRIP_CONTEXT=str(int(mode=='parent-strip')));cmd=[node,'--test','--test-reporter=tap',str(parent)]
     r=subprocess.run(cmd,env=env,capture_output=True,text=True,timeout=15)
     log.write(f'\nNODE={node} clean_env={clean} mode={mode} isolation={isolation}\nCOMMAND={json.dumps(cmd)}\nCHILD_ARGS={json.dumps(args)}\nEXIT={r.returncode}\n{r.stdout}{r.stderr}')
print('probe matrix complete')
