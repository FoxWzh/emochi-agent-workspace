import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import { dataDir, load, transact, id, makeSession, summary, prompt, deleteSessionRecord, publicState, readImageTasks, writeImageTasks } from './store.js';
import { executeImageTask } from './image-service.js';
import { runAgent } from './agent-adapter.js';
import { startAgentTrace } from './observability.js';

const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))};
const body=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>12e6)req.destroy()});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(Error('Invalid JSON'))}});req.on('error',reject)});
const now=()=>new Date().toISOString();
const find=(items,key)=>items.find(item=>item.id===key);
const uploadDir=()=>path.join(dataDir(),'uploads');
const imageMimes=new Set(['image/png','image/jpeg','image/webp','image/gif']);
const imageExt=mime=>({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[mime]||'png');
const runningSessions=new Set();
// Every Session begins with a small, persistent orientation Artifact. It is a
// real first tab (rather than an empty-state hint), so the resource panel has
// a clear purpose before the agent creates any files or images.
const RESOURCE_GUIDE_KIND='resource_guide';
const makeResourceGuide=()=>({
  id:id('artifact'),type:'text',system_kind:RESOURCE_GUIDE_KIND,title:'资源区使用说明',
  description:'这里会汇集本次创作中可继续查看和编辑的成果。',
  data:`# 资源区

资源区用于查看和整理本次对话中真正需要继续使用的创作成果。

- **Bot 编辑**：选择 Bot 后，在这里集中编辑基础信息、内容设定和高级设置；修改需在底部确认保存。
- **图片资源**：生成图片或上传视觉参考后，会按批次汇集在这里；你可以预览，并将选中的图片设为 Bot 封面草稿。
- **文本与文件**：Agent 仅在内容需要长期查看或继续编辑时创建，不会把每条对话都变成工作页。

点击右上角的关闭按钮可随时收起资源区；需要时再从顶部“资源区”重新打开。`,
  bot_ref:null,created_at:now(),updated_at:now()
});
function ensureResourceGuide(state,session){
  const owned=(session.artifactIds||[]).map(artifactId=>find(state.artifacts,artifactId)).filter(Boolean);
  // Migrate the short-lived custom type introduced by an earlier build into
  // the normal text Artifact model. The system marker is only for lifecycle
  // bookkeeping; the UI renders it exactly like every other text page.
  const guide=owned.find(artifact=>artifact.system_kind===RESOURCE_GUIDE_KIND||artifact.type==='workspace_guide');
  if(guide){
    if(guide.type!=='text'||guide.system_kind!==RESOURCE_GUIDE_KIND){guide.type='text';guide.system_kind=RESOURCE_GUIDE_KIND;guide.updated_at=now();}
    return guide;
  }
  const artifact=makeResourceGuide();state.artifacts.push(artifact);
  // Keep the guide first so it is the initial selected tab before a Bot exists.
  session.artifactIds=[artifact.id,...(session.artifactIds||[])];
  return artifact;
}
// Each business Session owns one cancellable SDK turn. This keeps sessions independent
// while giving the UI a real escape hatch if a provider turn stalls.
const runningTurns=new Map();
const imageTasks=new Map();
let imageTasksLoaded=false;
async function loadImageTasks(){if(imageTasksLoaded)return;for(const task of await readImageTasks())imageTasks.set(task.id,task);imageTasksLoaded=true;}
const persistImageTasks=()=>writeImageTasks([...imageTasks.values()]);
function imageBatchFromArtifact(artifact){
  const images=Array.isArray(artifact.data?.images)?artifact.data.images:artifact.data?.url?[{id:artifact.id,title:artifact.title,url:artifact.data.url}]:[];
  return images.length?{id:artifact.data?.task_id||artifact.id,title:artifact.title,created_at:artifact.created_at,images}:null;
}
// Data invariant: each Session owns exactly one image_library. Old one-image
// Artifacts and accidental duplicate libraries are absorbed into it here.
function consolidateImageLibrary(state,session){
  const owned=(session.artifactIds||[]).map(id=>find(state.artifacts,id)).filter(Boolean);
  const libraries=owned.filter(item=>item.type==='image_library');
  const looseImages=owned.filter(item=>item.type==='image');
  if(!libraries.length&&!looseImages.length)return null;
  const primary=libraries[0]||{id:id('artifact'),type:'image_library',title:'图片资源',description:'本对话中的生成图片与视觉参考。',data:{batches:[]},bot_ref:null,created_at:now(),updated_at:now()};
  if(!libraries.length)state.artifacts.push(primary);
  const byId=new Map();
  for(const library of libraries){for(const batch of library.data?.batches||[])if(batch?.id&&!byId.has(batch.id))byId.set(batch.id,batch);}
  for(const artifact of looseImages){const batch=imageBatchFromArtifact(artifact);if(batch&&!byId.has(batch.id))byId.set(batch.id,batch);}
  primary.data={...(primary.data||{}),batches:[...byId.values()]};primary.description=`已收录 ${primary.data.batches.length} 组图片生成结果。`;primary.updated_at=now();
  const redundant=new Set([...libraries.slice(1).map(item=>item.id),...looseImages.map(item=>item.id)]);
  if(redundant.size){state.artifacts=state.artifacts.filter(item=>!redundant.has(item.id));session.timeline=(session.timeline||[]).filter(event=>!redundant.has(event.artifactId));}
  session.artifactIds=[...new Set([...(session.artifactIds||[]).filter(item=>!redundant.has(item)&&item!==primary.id),primary.id])];
  return primary;
}
async function backfillImageTaskAnchors(){
  let changed=false;const state=await load();
  for(const task of imageTasks.values()){
    if(!task.session_id)continue;
    const session=find(state.sessions,task.session_id);if(!session)continue;
    const taskTime=Date.parse(task.created_at||0);
    const anchored=(session.messages||[]).find(message=>message.id===task.after_message_id);
    // Never attach an in-flight current-turn task to the preceding assistant
    // reply. That was causing image batches to appear above the user's retry
    // request. Only repair missing/invalid legacy anchors when the actual next
    // assistant reply has already been persisted.
    const anchorIsBeforeTask=anchored&&Date.parse(anchored.created_at||0)<taskTime;
    if(task.after_message_id&&!anchorIsBeforeTask)continue;
    const assistant=(session.messages||[]).find(message=>message.role==='assistant'&&Date.parse(message.created_at||0)>=taskTime);
    if(assistant&&task.after_message_id!==assistant.id){task.after_message_id=assistant.id;changed=true;}
  }
  if(changed)await persistImageTasks();
}
async function createImageTask(sessionId, request, turnId=null){
  const task={id:request.job_id||id('image_task'),session_id:sessionId,turn_id:request.turn_id||turnId,after_message_id:null,status:'generating',title:String(request.title||'图片创作').slice(0,120),purpose:request.purpose||'cover',count:Math.min(4,Math.max(1,Number(request.count)||4)),variants:request.variants||[],created_at:now(),updated_at:now(),artifacts:[],error:null};
  imageTasks.set(task.id,task); await persistImageTasks();
  void (async()=>{try{
    const assets=await executeImageTask({title:task.title,purpose:task.purpose,variants:task.variants,prompt:request.prompt,size:request.size,images:request.images,style_locked:request.style_locked,count:task.count});
    const created=await transact(state=>{const session=find(state.sessions,sessionId);if(!session)return [];
      let library=consolidateImageLibrary(state,session);
      if(!library){library={id:id('artifact'),type:'image_library',title:'图片资源',description:'本对话中的生成图片与视觉参考。',data:{batches:[]},bot_ref:null,created_at:now(),updated_at:now()};state.artifacts.push(library);session.artifactIds.push(library.id);}
      const batches=Array.isArray(library.data?.batches)?library.data.batches:[];
      const batch={id:task.id,title:task.title,created_at:now(),images:assets.map((asset,index)=>({id:asset.artifact_id||`candidate_${index+1}`,title:asset.title||`候选 ${index+1}`,url:asset.url}))};
      library.data={...library.data,batches:[...batches, batch]};library.description=`已收录 ${library.data.batches.length} 组图片生成结果。`;library.updated_at=now();
      session.updated_at=now();return [library];});
    task.status='completed'; task.artifacts=created; task.updated_at=now();
  }catch(error){task.status='failed';task.error={message:error.message,code:error.code||'image_generation_failed',retryable:Boolean(error.retryable)};task.updated_at=now();}finally{await persistImageTasks();}})();
  return task;
}
function apply(bot,changes=[]){for(const change of changes){if(change.area==='content')bot.content=change.operation==='clear'?'':change.operation==='merge'?`${bot.content||''}\n\n${change.value}`.trim():String(change.value||'');else bot[change.area]=change.operation==='merge'?{...(bot[change.area]||{}),...(change.value||{})}:change.operation==='clear'?{}:change.value}bot.init_prompt=prompt(bot);bot.updated_at=now();return bot}

async function streamAgent(res,sessionId,input,attachments=[],abortController=new AbortController()){
  runningTurns.set(sessionId,abortController);
  const started=await transact(state=>{
    const session=find(state.sessions,sessionId);if(!session)return null;
    // A new natural-language message supersedes any unanswered Choice from an
    // earlier turn. Keep the historical card, but make it non-interactive so a
    // late click cannot steer a conversation the user has already moved past.
    const supersededAt=now();
    for(const interaction of session.interactions||[])if(interaction.status==='pending'){
      interaction.status='ignored';interaction.ignored_at=supersededAt;
    }
    session.messages.push({id:id('msg'),role:'user',content:input,attachments,created_at:supersededAt});session.updated_at=supersededAt;session.business_revision=(session.business_revision||0)+1;
    const bot=session.workObjectId&&find(state.bots,session.workObjectId);
    const artifactIndex=(state.artifacts||[]).filter(artifact=>(session.artifactIds||[]).includes(artifact.id)).map(({id,type,title,description,bot_ref})=>({id,type,title,description,bot_ref}));
    const context={recentMessages:(session.messages||[]).slice(-16).map(({role,content,attachments=[]})=>({role,content,attachments:attachments.map(({name,mime_type,url})=>({name,mime_type,url}))})),botSnapshot:bot?{basic:bot.basic,content:bot.content,advanced:bot.advanced}:null,pendingInteractions:(session.interactions||[]).filter(interaction=>interaction.status==='pending'),artifactIndex,attachments:attachments.map(({id,name,mime_type,url})=>({id,name,mime_type,url})),historyLimit:16,promptText:null};
    return {session,bot,context,sdkSessionId:session.sdk_session_id||null};
  });
  if(!started){runningSessions.delete(sessionId);return json(res,404,{error:'session_not_found'});}
  res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform','connection':'keep-alive','x-accel-buffering':'no'});res.flushHeaders?.();
  const emit=(type,payload)=>res.write(`event: ${type}\ndata: ${JSON.stringify({type,payload})}\n\n`);
  const turnId=id('turn'),assistantMessageId=id('msg');let text='';const trace=startAgentTrace({sessionId,bot:started.bot,input,context:started.context});const traceId=trace.traceId;await transact(state=>{const current=find(state.sessions,sessionId);if(current?.messages?.length)current.messages.at(-1).trace_id=traceId;});
  emit('status',{state:'thinking'});
  try{
    for await(const event of runAgent({messages:started.session.messages,bot:started.bot,pendingInteractions:started.context.pendingInteractions,artifactIndex:started.context.artifactIndex,sdkSessionId:started.sdkSessionId,seenToolUseIds:started.session.sdk_seen_tool_use_ids||[],abortController,onSdkSessionId:async sdkSessionId=>{await transact(state=>{const session=find(state.sessions,sessionId);if(session)session.sdk_session_id=sdkSessionId;});},onToolUseId:async toolUseId=>{await transact(state=>{const session=find(state.sessions,sessionId);if(session&&!session.sdk_seen_tool_use_ids?.includes(toolUseId))session.sdk_seen_tool_use_ids=[...(session.sdk_seen_tool_use_ids||[]),toolUseId].slice(-200);});},trace,sessionId,turnId})){
      if(event.type==='delta'){text+=event.text;emit('delta',{text:event.text})}
      else if(event.type==='image_task'){const task=await createImageTask(sessionId,event.payload,turnId);emit('image_task',{task});}
      else if(['interaction','artifact','workspace','bot','activity'].includes(event.type))emit(event.type,event.payload);
    }
    if(!text)text='本轮未返回可展示的内容.';
    const stored=await transact(state=>{
      const session=find(state.sessions,sessionId);if(!session)return false;
      const completedAt=now();session.messages.push({id:assistantMessageId,role:'assistant',content:text,trace_id:traceId,created_at:completedAt});
      for(const interaction of session.interactions||[])if(interaction.turn_id===turnId&&!interaction.after_message_id){interaction.after_message_id=assistantMessageId;interaction.display_at=completedAt;}
      for(const event of session.timeline||[])if(event.turn_id===turnId&&!event.after_message_id){event.after_message_id=assistantMessageId;event.display_at=completedAt;}
      session.updated_at=completedAt;session.business_revision=(session.business_revision||0)+1;return true;
    });
    // Anchor the asynchronous image result to the assistant turn that created it,
    // so completed candidate images appear in the conversation rather than only
    // as detached right-panel pages.
    let tasksChanged=false;
    for(const task of imageTasks.values())if(task.session_id===sessionId&&task.turn_id===turnId&&task.after_message_id!==assistantMessageId){task.after_message_id=assistantMessageId;tasksChanged=true;}
    if(tasksChanged)await persistImageTasks();
    if(!stored){emit('error',{message:'session_deleted_during_run'});return res.end()}
    emit('message',{role:'assistant',content:text,trace_id:traceId});const flushStatus=await trace.end({content:text});emit('done',{observability:flushStatus});res.end();
  }catch(error){
    await trace.end({},error);
    const cancelled=abortController.signal.aborted;
    emit('error',{message:cancelled?'已停止本轮生成。':error.message});res.end();
  }finally{
    runningSessions.delete(sessionId);
    runningTurns.delete(sessionId);
  }
}

export function createServer(){return http.createServer(async(req,res)=>{try{
  await loadImageTasks();
  await backfillImageTaskAnchors();
  const url=new URL(req.url,'http://local');const parts=url.pathname.split('/');
  if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{
    status:'ok',
    agent_gateway:process.env.KAON_GATEWAY_BASE_URL&&process.env.KAON_GATEWAY_API_KEY?'configured':'missing_configuration',
    image_gateway:process.env.IMAGE_GATEWAY_BASE_URL&&process.env.IMAGE_GATEWAY_API_KEY?'configured':'missing_configuration',
  });
  if(req.method==='GET'&&url.pathname==='/api/state'){
    // A Session is the primary canvas, not an optional empty-state action.
    // Ensure exactly one blank conversation exists on first load; the New
    // button still reuses that blank record instead of accumulating extras.
    await transact(state=>{
      if(!(state.sessions||[]).length)state.sessions.push(makeSession());
      for(const session of state.sessions){ensureResourceGuide(state,session);consolidateImageLibrary(state,session);}
    });
    return json(res,200,{...(await publicState()),running_session_ids:[...runningSessions],image_tasks:[...imageTasks.values()].map(({id,session_id,turn_id,after_message_id,status,title,purpose,count,artifacts,error,created_at,updated_at})=>({id,session_id,turn_id,after_message_id,status,title,purpose,count,artifacts,error,created_at,updated_at}))});
  }
  if(req.method==='GET'&&/^\/api\/image-tasks\/[^/]+$/.test(url.pathname)){const task=imageTasks.get(parts[3]);return task?json(res,200,task):json(res,404,{error:'image_task_not_found'});}
  if(req.method==='POST'&&url.pathname==='/api/sessions'){
    const input=await body(req);const reusableId=String(input.reuse_if_empty_session_id||'');
    const response=await transact(state=>{
      const existing=reusableId&&find(state.sessions,reusableId);
      const existingArtifacts=(existing?.artifactIds||[]).map(artifactId=>find(state.artifacts,artifactId)).filter(Boolean);
      const pristine=existing&&!runningSessions.has(existing.id)&&!existing.workObjectId&&!existing.messages?.length&&!existing.interactions?.length&&!existing.timeline?.length&&existingArtifacts.every(artifact=>artifact.system_kind===RESOURCE_GUIDE_KIND);
      if(pristine){ensureResourceGuide(state,existing);return {session:existing,reused:true};}
      const value=makeSession(input.title);ensureResourceGuide(state,value);state.sessions.unshift(value);return {session:value,reused:false};
    });
    return json(res,response.reused?200:201,response);
  }
  if(req.method==='PATCH'&&/^\/api\/sessions\/[^/]+$/.test(url.pathname)){const input=await body(req);const result=await transact(state=>{const session=find(state.sessions,parts[3]);const title=String(input.title||'').trim();if(!session)return {error:'session_not_found'};if(!title)return {error:'session_title_required'};session.title=title.slice(0,80);session.updated_at=now();session.business_revision=(session.business_revision||0)+1;return {session}});return result.error?json(res,result.error==='session_not_found'?404:400,{error:result.error}):json(res,200,result);}
  if(req.method==='DELETE'&&/^\/api\/sessions\/[^/]+$/.test(url.pathname)){const sessionId=parts[3];if(runningSessions.has(sessionId))return json(res,409,{error:'session_busy'});const deleted=await transact(state=>{if(!find(state.sessions,sessionId))return false;state.sessions=state.sessions.filter(session=>session.id!==sessionId);return true});if(!deleted)return json(res,404,{error:'session_not_found'});await deleteSessionRecord(sessionId);return json(res,200,{deleted_session_id:sessionId});}
  if(req.method==='POST'&&url.pathname==='/api/uploads/images'){const input=await body(req);if(!imageMimes.has(input.mime_type)||typeof input.data_url!=='string'||!input.data_url.startsWith(`data:${input.mime_type};base64,`))return json(res,400,{error:'unsupported_image'});const bytes=Buffer.from(input.data_url.split(',',2)[1]||'','base64');if(!bytes.length||bytes.length>8*1024*1024)return json(res,400,{error:'image_too_large'});await mkdir(uploadDir(),{recursive:true});const filename=`${id('image')}.${imageExt(input.mime_type)}`;await writeFile(path.join(uploadDir(),filename),bytes);return json(res,201,{attachment:{id:id('attachment'),kind:'image',name:String(input.name||'图片').slice(0,120),mime_type:input.mime_type,size:bytes.length,url:`/api/uploads/${filename}`,file_path:path.join(uploadDir(),filename)}});}
  if(req.method==='GET'&&/^\/api\/uploads\/[A-Za-z0-9_.-]+$/.test(url.pathname)){const filename=path.basename(url.pathname);const bytes=await readFile(path.join(uploadDir(),filename));const mime=filename.endsWith('.png')?'image/png':filename.endsWith('.jpg')?'image/jpeg':filename.endsWith('.webp')?'image/webp':'image/gif';res.writeHead(200,{'content-type':mime,'cache-control':'private, max-age=86400'});return res.end(bytes);}
  if(req.method==='POST'&&/^\/api\/sessions\/[^/]+\/cancel$/.test(url.pathname)){
    const sessionId=parts[3]; const turn=runningTurns.get(sessionId);
    if(!turn)return json(res,409,{error:'session_not_running'});
    turn.abort(); return json(res,202,{cancelled_session_id:sessionId});
  }
  if(req.method==='POST'&&/^\/api\/sessions\/[^/]+\/messages$/.test(url.pathname)){const sessionId=parts[3],input=await body(req);if(runningSessions.has(sessionId))return json(res,409,{error:'session_busy'});runningSessions.add(sessionId);const attachments=Array.isArray(input.attachments)?input.attachments.filter(item=>item?.kind==='image'&&typeof item.url==='string').slice(0,4):[];if(!String(input.content||'').trim()&&!attachments.length){runningSessions.delete(sessionId);return json(res,400,{error:'message_or_image_required'});}return streamAgent(res,sessionId,String(input.content||'').trim(),attachments);}
  if(req.method==='POST'&&/^\/api\/sessions\/[^/]+\/interactions\/[^/]+\/respond$/.test(url.pathname)){const input=await body(req);const result=await transact(state=>{const session=find(state.sessions,parts[3]);const interaction=session?.interactions?.find(item=>item.id===parts[5]);if(!session)return {error:'session_not_found'};if(!interaction)return {error:'interaction_not_found'};if(interaction.status!=='pending')return {error:'interaction_already_resolved',interaction};interaction.status='resolved';interaction.response={option_id:String(input.option_id||'custom'),title:String(input.title||'自定义方向'),description:String(input.description||'')};interaction.resolved_at=now();session.updated_at=now();session.business_revision=(session.business_revision||0)+1;return {interaction}});return result.error?json(res,result.error==='interaction_already_resolved'?409:404,result):json(res,200,result);}
  if(req.method==='POST'&&/^\/api\/sessions\/[^/]+\/work-object$/.test(url.pathname)){const input=await body(req);const result=await transact(state=>{const session=find(state.sessions,parts[3]);if(!session)return {error:'session_not_found'};if(input.bot_id&&!find(state.bots,input.bot_id))return {error:'bot_not_found'};session.workObjectId=input.bot_id||null;session.updated_at=now();session.business_revision=(session.business_revision||0)+1;return {session}});return result.error?json(res,404,result):json(res,200,result);}
  if(req.method==='POST'&&/^\/api\/sessions\/[^/]+\/artifacts$/.test(url.pathname)){const input=await body(req);if(['image','image_library'].includes(input.type))return json(res,400,{error:'image_artifacts_are_managed_by_image_task'});const result=await transact(state=>{const session=find(state.sessions,parts[3]);if(!session)return {error:'session_not_found'};if(String(input.type||'').startsWith('bot_')&&input.bot_ref?.bot_id){const existing=state.artifacts.find(artifact=>session.artifactIds?.includes(artifact.id)&&artifact.type===input.type&&artifact.bot_ref?.bot_id===input.bot_ref.bot_id);if(existing)return {artifact:existing,reused:true};}const artifact={id:id('artifact'),type:input.type,title:input.title,description:input.description||'',data:input.data??null,bot_ref:input.bot_ref||null,created_at:now(),updated_at:now()};state.artifacts.push(artifact);session.artifactIds.push(artifact.id);session.business_revision=(session.business_revision||0)+1;if(!String(artifact.type||'').startsWith('bot_'))session.timeline=[...(session.timeline||[]),{id:id('event'),kind:'artifact',artifactId:artifact.id,created_at:now()}];return {artifact}});return result.error?json(res,404,result):json(res,201,result);}
  if(req.method==='PATCH'&&/^\/api\/artifacts\/[^/]+$/.test(url.pathname)){const input=await body(req);const result=await transact(state=>{const artifact=find(state.artifacts,parts[3]);if(!artifact)return {error:'artifact_not_found'};Object.assign(artifact,input,{updated_at:now()});return {artifact}});return result.error?json(res,404,result):json(res,200,result);}
  if(req.method==='POST'&&url.pathname==='/api/bots'){const input=await body(req);const bot=await transact(state=>{const value={id:id('bot'),basic:input.basic||{},content:input.content||'',advanced:input.advanced||{},created_at:now(),updated_at:now()};value.init_prompt=prompt(value);state.bots.unshift(value);return value});return json(res,201,{bot,summary:summary(bot)});}
  if(req.method==='PATCH'&&/^\/api\/bots\/[^/]+$/.test(url.pathname)){const input=await body(req);const result=await transact(state=>{const bot=find(state.bots,parts[3]);if(!bot)return {error:'bot_not_found'};return {bot:apply(bot,input.changes)}});return result.error?json(res,404,result):json(res,200,{...result,summary:summary(result.bot)});}
  if(req.method==='DELETE'&&/^\/api\/bots\/[^/]+$/.test(url.pathname)){const botId=parts[3];const deleted=await transact(state=>{if(!find(state.bots,botId))return false;state.bots=state.bots.filter(bot=>bot.id!==botId);for(const session of state.sessions){if(session.workObjectId===botId)session.workObjectId=null;session.artifactIds=(session.artifactIds||[]).filter(artifactId=>state.artifacts.find(artifact=>artifact.id===artifactId)?.bot_ref?.bot_id!==botId)}state.artifacts=state.artifacts.filter(artifact=>artifact.bot_ref?.bot_id!==botId);return true});return deleted?json(res,200,{deleted_bot_id:botId}):json(res,404,{error:'bot_not_found'});}
  return json(res,404,{error:'not_found'});
}catch(error){json(res,500,{error:error.message})}})}
