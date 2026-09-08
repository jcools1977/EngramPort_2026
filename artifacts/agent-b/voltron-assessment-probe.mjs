// Read-only probes. Candidate events exist only in memory and are never appended.
import { readFile } from 'node:fs/promises';
import { hashBody, hashAppendIntent, verifyLog } from '../../packages/git-adapter/src/verify-log.mjs';
import { resolveWorkInbox } from '../../packages/git-adapter/src/event-core.mjs';
import { ticksSpentOn, decide, DEFAULT_DAILY_CAP_TICKS as capTicks, DEFAULT_RESERVE_TICKS as reserveTicks } from '../../packages/agent-c-supervisor/src/spend-gate.mjs';
const body = 'Synthetic authorship assessment probe. No action requested.\n';
const id = '01a0827e-1eba-7000-8000-000000000001';
const meta = {schema_version:1,id,thread:'voltron-read-only-probe',from:'agent-a',type:'message',occurred_at:'2026-09-08T19:28:18Z',in_reply_to:null,next:'agent-b',content_sha256:hashBody(body)};
meta.intent_sha256=hashAppendIntent({actor:meta.from,thread:meta.thread,type:meta.type,next:meta.next,content_sha256:meta.content_sha256});
const source='---\n'+Object.entries(meta).map(([k,v])=>`${k}: ${v===null?'null':v}`).join('\n')+'\n---\n'+body;
const relative=`events/agent-a/20260908T192818Z_${id}.md`;
const forged=await verifyLog(process.cwd(),{candidateEvent:{relative,source}});
const changedWithoutRehash=await verifyLog(process.cwd(),{candidateEvent:{relative,source:source.replace(body,'Changed synthetic body.\n')}});
const entry={file:relative,event:{meta,body}};
const day='2026-09-08';
const row=ticks=>({relative:'synthetic-review.json',review:{measurement:{review_completed_at:day+'T12:00:00Z',provider_cost:{cost_in_usd_ticks:ticks}}}});
const gate=ticks=>decide({disabled:false,spentTicks:ticksSpentOn([row(ticks)],day),capTicks,reserveTicks});
const schema=JSON.parse(await readFile('schemas/event-v1.schema.json','utf8'));
const result={
  forged_actor_candidate:{ok:forged.ok,errors:forged.errors,accepted_file_written:false},
  changed_body_without_rehash:{ok:changedWithoutRehash.ok,errors:changedWithoutRehash.errors},
  inbox_projection:{without_candidate:resolveWorkInbox({actor:'agent-b',entries:[]}).length,with_candidate:resolveWorkInbox({actor:'agent-b',entries:[entry]}).map(e=>({from:e.from,event_id:e.event_id}))},
  spend_projection:{at_cap:gate(capTicks),changed_cost_to_zero:gate(0)},
  body_normalization:{distinct_input_bytes:true,equal_hashes:hashBody('x\r\n')===hashBody('x\n\n')},
  schema_result_status:schema.$defs.result.properties.status,
  limits:'No append, provider invocation, filesystem mutation, credential access, external authentication test, or end-to-end spend attack in this probe.'
};
console.log(JSON.stringify(result,null,2));
if(!forged.ok||changedWithoutRehash.ok||result.inbox_projection.with_candidate.length!==1||result.spend_projection.at_cap.allowed||!result.spend_projection.changed_cost_to_zero.allowed)process.exitCode=1;
