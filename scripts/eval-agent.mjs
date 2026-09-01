#!/usr/bin/env node
/**
 * Run reproducible, multi-turn black-box evaluations against the local Emochi API.
 * It writes the full request/response/SSE evidence plus Langfuse trace IDs to disk.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root=process.cwd();
const args=process.argv.slice(2);
const valueFor=(flag,fallback=null)=>{const index=args.indexOf(flag);return index>=0?args[index+1]??fallback:fallback};
const has=flag=>args.includes(flag);
const usage=()=>console.log(`\n用法：\n  npm run eval:agent -- --scenario <id>\n  npm run eval:agent -- --file evals/agent-scenarios.json --scenario <id>\n  npm run eval:agent -- --list\n\n可选：--base-url http://127.0.0.1:8789  --out-dir evals/runs  --keep-fixtures\n`);
const scenariosPath=path.resolve(root,valueFor('--file','evals/agent-scenarios.json'));
const baseUrl=(valueFor('--base-url',process.env.EMOCHI_EVAL_BASE_URL||'http://127.0.0.1:8789')).replace(/\/$/,'');
const outDir=path.resolve(root,valueFor('--out-dir','evals/runs'));
const projectId=process.env.LANGFUSE_PROJECT_ID||'';
const langfuseBase=(process.env.LANGFUSE_BASE_URL||'https://cloud.langfuse.com').replace(/\/$/,'');
const now=()=>new Date().toISOString();
const request=async(url,options={})=>{const response=await fetch(`${baseUrl}${url}`,{headers:{'content-type':'application/json',...(options.headers||{})},...options});const raw=await response.text();let body=null;try{body=raw?JSON.parse(raw):null}catch{body={raw}};if(!response.ok)throw Error(`${options.method||'GET'} ${url} → ${response.status}: ${body?.error||raw}`);return body};
const langfuseUrl=traceId=>projectId?`${langfuseBase}/project/${projectId}/traces?searchType=id&search=${encodeURIComponent(traceId)}`:null;
async function workspaceBotCount(){
  try{const raw=await readFile(path.join(root,'data','workspace.json'),'utf8');const w=JSON.parse(raw);return (w.bots||[]).length;}catch{return -1;}
}

async function sendMessage(sessionId,content){
  const startedAt=Date.now();
  const response=await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content})});
  if(!response.ok)throw Error(`POST message → ${response.status}: ${await response.text()}`);
  const reader=response.body?.getReader();if(!reader)throw Error('SSE response body missing');
  const decoder=new TextDecoder();let buffer='',text='',traceId=null,interaction=null;const events=[];
  let firstEventAt=null,firstDeltaAt=null;
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const chunks=buffer.split('\n\n');buffer=chunks.pop()||'';for(const chunk of chunks){const data=chunk.split('\n').find(line=>line.startsWith('data: '));if(!data)continue;let event;try{event=JSON.parse(data.slice(6))}catch{continue};if(firstEventAt===null)firstEventAt=Date.now();events.push(event);if(event.type==='delta'){if(firstDeltaAt===null)firstDeltaAt=Date.now();text+=event.payload?.text||'';}if(event.type==='interaction')interaction=event.payload;if(event.type==='message'){text=event.payload?.content||text;traceId=event.payload?.trace_id||traceId;}if(event.type==='error')throw Error(event.payload?.message||'agent stream error');}}
  const completedAt=Date.now();
  return {content,assistant_text:text,trace_id:traceId,langfuse_url:traceId?langfuseUrl(traceId):null,interaction,events,
    started_at:new Date(startedAt).toISOString(),first_event_at:firstEventAt?new Date(firstEventAt).toISOString():null,first_text_at:firstDeltaAt?new Date(firstDeltaAt).toISOString():null,completed_at:new Date(completedAt).toISOString(),
    ttft_ms:firstDeltaAt?firstDeltaAt-startedAt:null,duration_ms:completedAt-startedAt};
}
const choiceMessage=option=>`我选择「${option.title}」${option.description?`：${option.description}`:''}`;
const confirmationMessage=option=>`我确认：${option.title}${option.description?`（${option.description}）`:''}`;
async function resolveInteraction(sessionId,interaction,step){
  const options=interaction.type==='confirmation'?[{id:'confirm',title:'确认创建',description:'按当前方案继续执行。'},{id:'revise',title:'暂不创建',description:'保留方案，继续调整。'}]:interaction.options||[];
  const option=step.option_id?options.find(item=>item.id===step.option_id):options[step.option_index??0];
  if(!option)throw Error(`找不到要自动选择的选项：${JSON.stringify(step)}`);
  await request(`/api/sessions/${sessionId}/interactions/${interaction.id}/respond`,{method:'POST',body:JSON.stringify({option_id:option.id,title:option.title,description:option.description||''})});
  return {interaction_id:interaction.id,type:interaction.type,selected:option,next_message:interaction.type==='confirmation'?confirmationMessage(option):choiceMessage(option)};
}

const catalog=JSON.parse(await readFile(scenariosPath,'utf8'));
const scenarios=catalog.scenarios||[];
if(has('--list')){for(const scenario of scenarios)console.log(`${scenario.id}\t${scenario.title||''}`);process.exit(0)}
const scenarioId=valueFor('--scenario');if(!scenarioId){usage();process.exit(1)}
const scenario=scenarios.find(item=>item.id===scenarioId);if(!scenario)throw Error(`未找到场景 ${scenarioId}。使用 --list 查看。`);
const run={id:`eval_${new Date().toISOString().replace(/[:.]/g,'-')}_${randomUUID().slice(0,8)}`,scenario_id:scenario.id,scenario_title:scenario.title||scenario.id,started_at:now(),base_url:baseUrl,fixture_bot_ids:[],turns:[],status:'running'};
await mkdir(outDir,{recursive:true});const resultPath=path.join(outDir,`${run.id}.json`);
const save=async()=>writeFile(resultPath,JSON.stringify(run,null,2));
try{
  await request('/api/health');
  for(const fixture of scenario.fixtures?.bots||[]){const created=await request('/api/bots',{method:'POST',body:JSON.stringify(fixture)});run.fixture_bot_ids.push(created.bot.id);fixture.runtime_id=created.bot.id;}
  const createdSession=await request('/api/sessions',{method:'POST',body:JSON.stringify({title:`[Eval] ${scenario.title||scenario.id}`})});run.session_id=createdSession.session.id;
  if(scenario.work_object_fixture){const fixture=scenario.fixtures?.bots?.[scenario.work_object_fixture];if(!fixture?.runtime_id)throw Error(`work_object_fixture 不存在：${scenario.work_object_fixture}`);await request(`/api/sessions/${run.session_id}/work-object`,{method:'POST',body:JSON.stringify({bot_id:fixture.runtime_id})});}
  let latestInteraction=null;
  for(const step of scenario.steps||[]){
    if(step.type==='message'){
      const turn=await sendMessage(run.session_id,step.content);latestInteraction=turn.interaction||null;run.turns.push({at:now(),kind:'message',...turn});await save();continue;
    }
    if(step.type==='message_until_bot'){
      const maxAttempts=step.max_attempts||8;
      const botsBefore=await workspaceBotCount();
      let turn=await sendMessage(run.session_id,step.content);latestInteraction=turn.interaction||null;run.turns.push({at:now(),kind:'message',...turn});await save();
      let attempts=0;
      while(attempts<maxAttempts){
        if(latestInteraction){
          const resolved=await resolveInteraction(run.session_id,latestInteraction,{option_index:0});
          run.turns.push({at:now(),kind:'interaction_response',...resolved});await save();
          const next=await sendMessage(run.session_id,resolved.next_message);latestInteraction=next.interaction||null;
          run.turns.push({at:now(),kind:'message',synthetic_from_interaction:resolved.interaction_id,...next});await save();
        }else{
          if((await workspaceBotCount())>botsBefore){run.bot_created=true;break;}
          const nudge=await sendMessage(run.session_id,'我确认：确认创建（按当前方案继续执行。）');latestInteraction=nudge.interaction||null;
          run.turns.push({at:now(),kind:'message',nudge:true,...nudge});await save();
        }
        attempts++;
      }
      if(!run.bot_created&&(await workspaceBotCount())>botsBefore)run.bot_created=true;
      run.bot_created_before=run.bot_created_before??botsBefore;
      continue;
    }
    if(step.type==='respond_pending'){
      if(!latestInteraction)throw Error('当前没有可处理的 interaction');
      const resolved=await resolveInteraction(run.session_id,latestInteraction,step);run.turns.push({at:now(),kind:'interaction_response',...resolved});await save();
      if(step.send_response!==false){const turn=await sendMessage(run.session_id,resolved.next_message);latestInteraction=turn.interaction||null;run.turns.push({at:now(),kind:'message',synthetic_from_interaction:resolved.interaction_id,...turn});await save();}
      continue;
    }
    throw Error(`未知 step.type：${step.type}`);
  }
  run.status='completed';run.completed_at=now();run.duration_ms=Date.now()-new Date(run.started_at).getTime();if(run.bot_created===undefined){const c=await workspaceBotCount();run.bot_created=c>(run.bot_created_before??-1);}await save();
  console.log(`\n评测完成：${resultPath}`);console.log(`Session: ${run.session_id}`);for(const turn of run.turns.filter(item=>item.trace_id))console.log(`Trace: ${turn.trace_id}${turn.langfuse_url?`\n${turn.langfuse_url}`:'  (在 Langfuse 的 Trace 搜索中粘贴此 ID；配置 LANGFUSE_PROJECT_ID 后会输出直达链接)'}`);
  for(const turn of run.turns.filter(item=>item.ttft_ms!==undefined))console.log(`Turn ${turn.kind}: ttft=${turn.ttft_ms}ms duration=${turn.duration_ms}ms first_event=${turn.first_event_at?turn.first_event_at.slice(11,19):'-'} first_text=${turn.first_text_at?turn.first_text_at.slice(11,19):'-'}`);
  if(run.duration_ms)console.log(`Scenario total: ${run.duration_ms}ms`);
} catch(error){run.status='failed';run.error={message:error.message};run.completed_at=now();run.duration_ms=Date.now()-new Date(run.started_at).getTime();await save();console.error(`\n评测失败，证据已保存：${resultPath}\n${error.stack||error.message}`);process.exitCode=1;
} finally {
  if(!has('--keep-fixtures'))for(const botId of run.fixture_bot_ids){try{await request(`/api/bots/${botId}`,{method:'DELETE'})}catch(error){run.cleanup_error=error.message;}}
  await save();
}
