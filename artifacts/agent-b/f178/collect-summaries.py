from pathlib import Path
import re
out=Path('artifacts/agent-b/f178')
with (out/'all-run-summaries.log').open('w') as summary:
 for label in ['22','26']:
  for mode in ['direct','npm']:
   for i in range(1,11):
    file=out/f'{label}-{mode}-{i:02}.log'
    text=file.read_text()
    assert 'EXIT=0' in text, file
    expected=5 if mode=='direct' else 24
    assert re.search(rf'^[#ℹ] pass {expected}$',text,re.M),file
    assert re.search(r'^[#ℹ] fail 0$',text,re.M),file
    for name in ['missing-option','default-budget','missing-declaration']:
     assert f'D1_CANARY_BUDGET_MUTATION {name} baseline=0 applied=t control=1 restored=0 killed=t' in text,file
    lines=[line for line in text.splitlines() if line.startswith(('NODE=','COMMAND=','EXIT=')) or re.match(r'^[#ℹ] (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ',line) or 'D1_CANARY_BUDGET' in line]
    summary.write(f'FILE={file}\n'+'\n'.join(lines)+'\n\n')
print('40 completed runs verified; 10 direct and 10 npm on each Node; all three mutations killed in every run')
