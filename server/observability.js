// Current Langfuse SDK: OpenTelemetry-based @langfuse/* packages.
// One root Agent observation is emitted per user query; all process details are
// nested below it and exported by the real-time Langfuse span processor.
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { propagateAttributes, setLangfuseTracerProvider, startObservation } from '@langfuse/tracing';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const config=()=>({publicKey:process.env.LANGFUSE_PUBLIC_KEY,secretKey:process.env.LANGFUSE_SECRET_KEY,baseUrl:process.env.LANGFUSE_BASE_URL||'https://cloud.langfuse.com',environment:process.env.LANGFUSE_TRACING_ENVIRONMENT||'development',agentId:process.env.LANGFUSE_AGENT_ID||'emochi-agent',agentVersion:process.env.LANGFUSE_AGENT_VERSION||'v1'});
let processor=null;let ready=false;let activeConfig=null;
const safe=value=>typeof value==='string'?value.slice(0,60000):value;
const stamp=()=>new Date().toISOString();
const digest=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,16);
// The SDK is the source of truth for billed model usage. Source-level counts below
// are deliberately labelled estimates: Agent SDK injects its own wrappers/schemas.
const tokenEstimate=value=>{
  const text=typeof value==='string'?value:JSON.stringify(value??'');
  const cjk=(text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)||[]).length;
  const words=(text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g,' ').match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g)||[]).length;
  return Math.max(0,Math.ceil(cjk+words*.75));
};
const tokenEstimateMetadata=value=>({token_estimate:tokenEstimate(value),token_estimate_method:'heuristic_cjk_plus_lexical_v1'});
const normalizeUsage=usage=>usage?{
  input:usage.input_tokens??usage.inputTokens??0,
  output:usage.output_tokens??usage.outputTokens??0,
  cache_read:usage.cache_read_input_tokens??usage.cacheReadInputTokens??0,
  cache_creation:usage.cache_creation_input_tokens??usage.cacheCreationInputTokens??0,
  total:(usage.input_tokens??usage.inputTokens??0)+(usage.output_tokens??usage.outputTokens??0)+(usage.cache_read_input_tokens??usage.cacheReadInputTokens??0)+(usage.cache_creation_input_tokens??usage.cacheCreationInputTokens??0),
}:null;
const normalizeModelUsage=usage=>Object.fromEntries(Object.entries(usage||{}).map(([model,value])=>[model,{...normalizeUsage(value),cost_usd:value?.costUSD??value?.cost_usd??null,provider:value?.provider??null,canonical_model:value?.canonicalModel??null,context_window:value?.contextWindow??null,max_output_tokens:value?.maxOutputTokens??null}]));
// Streaming snapshots may report partial or zero usage before the final
// assistant event. Token counters are cumulative for one SDK message, so never
// let a later incomplete snapshot overwrite a larger observed value.
const mergeUsage=(previous,next)=>!previous?next:!next?previous:Object.fromEntries([...new Set([...Object.keys(previous),...Object.keys(next)])].map(key=>[key,typeof previous[key]==='number'||typeof next[key]==='number'?Math.max(Number(previous[key])||0,Number(next[key])||0):(next[key]??previous[key])]));
const safeSdkEvent=(message,at=stamp())=>({
  at,
  type:message?.type||'unknown',
  subtype:message?.subtype||null,
  parent_tool_use_id:message?.parent_tool_use_id||null,
  tool_name:message?.tool_name||null,
  tool_use_id:message?.tool_use_id||null,
  outcome:message?.outcome||null,
  elapsed_time_seconds:message?.elapsed_time_seconds??null,
  assistant_blocks:(message?.message?.content||[]).filter(block=>block?.type!=='thinking').map(block=>block?.type==='tool_use'?{type:'tool_use',id:block.id,name:block.name,input:block.input}:block?.type==='text'?{type:'text',text:safe(block.text)}:{type:block?.type||'unknown'}),
  tool_result:message?.type==='user'?message?.tool_use_result??null:undefined,
});
const shouldRecordSdkEvent=event=>{
  if(event.type==='assistant'&&event.assistant_blocks.length)return true;
  if(event.type==='user'&&event.tool_result!==null&&event.tool_result!==undefined)return true;
  if(event.type==='tool_progress'&&!event.heartbeat)return true;
  return event.type==='result'||event.type==='system'&&['init','error'].includes(event.subtype);
};

async function skillSnapshot(skill){
  const base=path.join(process.cwd(),'agent-runtime','.claude','skills',skill);
  try{const skillPath=path.join(base,'SKILL.md');const content=await readFile(skillPath,'utf8');return {skill,path:`agent-runtime/.claude/skills/${skill}/SKILL.md`,content:safe(content),sha256_16:digest(content),...tokenEstimateMetadata(content)};}
  catch(error){return {skill,path:`agent-runtime/.claude/skills/${skill}/SKILL.md`,read_error:error.message};}
}
async function readSourceSnapshot(relativePath){
  const root=path.join(process.cwd(),'agent-runtime');const absolute=path.resolve(root,String(relativePath||''));
  if(!absolute.startsWith(root+path.sep)||!absolute.includes(`${path.sep}references${path.sep}`))return null;
  try{const content=await readFile(absolute,'utf8');return {path:`agent-runtime/${path.relative(root,absolute)}`,content:safe(content),sha256_16:digest(content),...tokenEstimateMetadata(content)};}
  catch(error){return {path:String(relativePath),read_error:error.message};}
}

export function initObservability(){
  if(ready)return true;const current=config();
  if(!current.publicKey||!current.secretKey){console.warn('[langfuse] disabled: LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is not set');return false;}
  try{
    processor=new LangfuseSpanProcessor({publicKey:current.publicKey,secretKey:current.secretKey,baseUrl:current.baseUrl,environment:current.environment,flushAt:1,flushInterval:1,exportMode:'immediate',mediaUploadEnabled:false});
    const provider=new NodeTracerProvider({spanProcessors:[processor]});provider.register();setLangfuseTracerProvider(provider);
    activeConfig=current;ready=true;console.info(`[langfuse] current OTel tracing enabled (${current.environment})`);return true;
  }catch(error){console.warn('[langfuse] disabled:',error.message);return false;}
}

export function startAgentTrace({sessionId,bot,input,context={}}){
  if(!initObservability())return {traceId:null,onSdkMessage(){},recordStage(){},end:async()=> 'disabled'};
  let loop;
  propagateAttributes({traceName:`agent:${activeConfig.agentId}:query`,sessionId,environment:activeConfig.environment,version:activeConfig.agentVersion,tags:[`agent:${activeConfig.agentId}`],metadata:{agentId:activeConfig.agentId,botId:bot?.id||'',runtime:'claude-agent-sdk'}},()=>{
    loop=startObservation('agent_query_loop',{input:{
      user_query:safe(input),
      conversation_context:context.recentMessages||[],
      active_bot_snapshot:context.botSnapshot||null,
      pending_interactions:context.pendingInteractions||[],
      artifact_index:context.artifactIndex||[],
      attachments:context.attachments||[],
      context_metrics:{history_message_count:context.recentMessages?.length||0,bot_injected:Boolean(context.botSnapshot),pending_interaction_count:context.pendingInteractions?.length||0,artifact_index_count:context.artifactIndex?.length||0,attachment_count:context.attachments?.length||0,history_limit:context.historyLimit||null}
    },metadata:{sdk:'claude-agent-sdk',run_contract:'one_trace_per_query'}},{asType:'agent'});
  });
  const contextAssembly=loop.startObservation('context_assembly',{input:{user_message:safe(input),conversation_context:context.recentMessages||[],active_bot_snapshot:context.botSnapshot||null,pending_interactions:context.pendingInteractions||[],artifact_index:context.artifactIndex||[],attachments:context.attachments||[]},metadata:{historyMessageCount:context.recentMessages?.length||0,pendingInteractionCount:context.pendingInteractions?.length||0,artifactIndexCount:context.artifactIndex?.length||0,attachmentCount:context.attachments?.length||0,botInjected:Boolean(context.botSnapshot),historyLimit:context.historyLimit||null}});contextAssembly.update({output:{included:['user_message','conversation_context','active_bot_snapshot','pending_interactions','artifact_index','attachments'],truncated:Boolean(context.truncated)}});contextAssembly.end();
  let turn=0;const pendingTools=new Map();const stages=new Map();const visibleOutputs=[];const assistantGenerations=new Map();
  const thinking={last_estimated_tokens:0,peak_estimated_tokens:0,update_count:0};
  const process={stages:[],tools:[],assistant_turns:[],skill_sources:[],sdk_event_log:[]};
  const backgroundFlush=()=>processor.forceFlush().catch(error=>console.warn('[langfuse] background flush failed:',error.message));backgroundFlush();
  return {
    traceId:loop.traceId,
    recordStage(stage,{input,output,metadata}={}){const previous=stages.get(stage);if(previous){const stageMetadata={...(metadata||{}),input_token_estimate:tokenEstimate(input),output_token_estimate:output===undefined?null:tokenEstimate(output),token_estimate_method:'heuristic_cjk_plus_lexical_v1'};previous.span.update({output:safe(output),metadata:stageMetadata});previous.span.end();process.stages[previous.index].output=safe(output);process.stages[previous.index].metadata=stageMetadata;process.stages[previous.index].status='completed';stages.delete(stage);backgroundFlush();return;}const stageMetadata={...(metadata||{}),input_token_estimate:tokenEstimate(input),output_token_estimate:output===undefined?null:tokenEstimate(output),token_estimate_method:'heuristic_cjk_plus_lexical_v1'};const record={name:stage,input:safe(input),output:output===undefined?null:safe(output),metadata:stageMetadata,status:output===undefined?'running':'completed'};const index=process.stages.push(record)-1;const span=loop.startObservation(stage,{input:record.input,metadata:stageMetadata});if(output!==undefined){span.update({output:record.output,metadata:stageMetadata});span.end();}else stages.set(stage,{span,index});backgroundFlush();},
    async recordSkillSource(skill,input){
      const snapshot=await skillSnapshot(skill);const source={at:stamp(),input:safe(input),...snapshot};process.skill_sources.push(source);const span=loop.startObservation(`skill:${skill}`,{input:{request:safe(input),source_path:snapshot.path,content:snapshot.content},metadata:{...tokenEstimateMetadata(snapshot.content),source_sha256_16:snapshot.sha256_16,source_kind:'skill_instruction'}},{asType:'retriever'});span.end();backgroundFlush();
    },
    async recordReadSource(input){
      const source=await readSourceSnapshot(input?.file_path||input?.path);if(!source)return;process.reference_sources??=[];process.reference_sources.push({at:stamp(),request:safe(input),...source});const span=loop.startObservation(`reference:${path.basename(source.path)}`,{input:{request:safe(input),source_path:source.path,content:source.content},metadata:{...tokenEstimateMetadata(source.content||''),source_sha256_16:source.sha256_16||null,source_kind:'reference_read'}},{asType:'retriever'});span.end();backgroundFlush();
    },
    recordPromptBreakdown(breakdown){const input=safe(breakdown);const span=loop.startObservation('prompt_breakdown',{input,metadata:{...tokenEstimateMetadata(input),label:'context source estimates; SDK usage remains authoritative'}},{asType:'chain'});span.end();process.prompt_breakdown=input;backgroundFlush();},
    onSdkMessage(message){
      if(message?.type==='system'&&message.subtype==='thinking_tokens'){
        thinking.update_count+=1;thinking.last_estimated_tokens=message.estimated_tokens??thinking.last_estimated_tokens;thinking.peak_estimated_tokens=Math.max(thinking.peak_estimated_tokens,thinking.last_estimated_tokens);
      }else{const event=safeSdkEvent(message);if(shouldRecordSdkEvent(event))process.sdk_event_log.push(event);}
      if(message?.type==='assistant'&&message.message){
        const blocks=message.message.content||[];
        // includePartialMessages re-emits snapshots for one assistant message.
        // Keep one live generation per sdk_message_id, then backfill output and
        // usage from later snapshots instead of counting it again.
        const messageKey=message.message.id||digest(JSON.stringify({model:message.message.model,blocks}));
        const usage=normalizeUsage(message.message.usage);
        const output=blocks.filter(block=>block?.type!=='thinking').map(block=>block?.type==='text'?block.text:block?.type==='tool_use'?{tool_use:{id:block.id,name:block.name,input:block.input}}:block);
        let entry=assistantGenerations.get(messageKey);
        if(!entry){
          const turnRecord={turn:++turn,model:message.message.model||null,input:{sdk_message_id:message.message.id||null,parent_tool_use_id:message.parent_tool_use_id||null,stop_reason:message.message.stop_reason||null},output:safe(output),usage};process.assistant_turns.push(turnRecord);
          const generation=loop.startObservation(`assistant_turn_${turnRecord.turn}`,{input:turnRecord.input,model:turnRecord.model||undefined,metadata:{turn:turnRecord.turn,parentToolUseId:message.parent_tool_use_id,usage_source:'SDK assistant message; deduplicated by sdk_message_id and updated from streaming snapshots'}},{asType:'generation'});
          entry={generation,turn:turnRecord.turn,record:turnRecord};assistantGenerations.set(messageKey,entry);
        }
        entry.record.model=message.message.model||entry.record.model;
        entry.record.input.stop_reason=message.message.stop_reason||entry.record.input.stop_reason;
        entry.record.output=safe(output);
        entry.record.usage=mergeUsage(entry.record.usage,usage);
        entry.generation.update({output:entry.record.output,usageDetails:entry.record.usage||undefined,metadata:{turn:entry.turn,parentToolUseId:message.parent_tool_use_id,usage_source:'SDK assistant message; one generation per sdk_message_id; output and usage backfilled from later snapshots'}});
        for(const block of blocks){
          if(block?.type==='text'&&block.text)visibleOutputs.push(block.text);
          else if(block?.type==='tool_use'){
            const existing=pendingTools.get(block.id);
            // Partial assistant snapshots can first expose only part of a tool
            // input. Keep the first span, then overwrite it with the latest
            // complete snapshot before recording its actual tool result.
            if(existing){
              existing.record.input=block.input;
              existing.record.input_token_estimate=tokenEstimate(block.input);
              existing.span.update({input:block.input,metadata:{toolUseId:block.id,turn:existing.record.turn,...tokenEstimateMetadata(block.input),input_snapshot:'latest_streamed'}});
            }else if(!process.tools.some(record=>record.tool_use_id===block.id)){
              const record={tool_use_id:block.id,name:block.name,input:block.input,input_token_estimate:tokenEstimate(block.input),output:null,output_token_estimate:null,status:'running',turn:entry.turn};process.tools.push(record);
              pendingTools.set(block.id,{span:loop.startObservation(`tool:${block.name}`,{input:block.input,metadata:{toolUseId:block.id,turn:record.turn,...tokenEstimateMetadata(block.input),input_snapshot:'initial'}},{asType:'tool'}),record});
            }
          }
        }
        backgroundFlush();
      }else if(message?.type==='user'){for(const block of Array.isArray(message.message?.content)?message.message.content:[]){if(block?.type==='tool_result'&&pendingTools.has(block.tool_use_id)){const tool=pendingTools.get(block.tool_use_id);const output=block.content??message.tool_use_result;const failed=Boolean(block.is_error);const errorText=failed?(typeof output==='string'?output:JSON.stringify(output)):'';const errorType=failed?(/validation|invalid|unrecognized|expected|received/i.test(errorText)?'validation':/not[_ ]found|missing/i.test(errorText)?'not_found':/permission|denied|unauthori/i.test(errorText)?'permission':'runtime'):null;const priorAttempts=process.tools.filter(item=>item.name===tool.record.name&&item.status==='failed').length;const outputMetadata={output_token_estimate:tokenEstimate(output),token_estimate_method:'heuristic_cjk_plus_lexical_v1',status:failed?'failed':'completed',error_type:errorType,retry_index:priorAttempts};tool.span.update({output,metadata:outputMetadata,level:failed?'ERROR':'DEFAULT',statusMessage:failed?errorText.slice(0,800):undefined});tool.span.end();tool.record.output=output;tool.record.output_token_estimate=outputMetadata.output_token_estimate;tool.record.status=failed?'failed':'completed';tool.record.error_type=errorType;tool.record.retry_index=priorAttempts;pendingTools.delete(block.tool_use_id);backgroundFlush();}}}
      if(message?.type==='result'){const usageSummary={main_loop_usage:normalizeUsage(message.usage),model_usage:normalizeModelUsage(message.modelUsage),total_cost_usd:message.total_cost_usd??null,duration_ms:message.duration_ms??null,duration_api_ms:message.duration_api_ms??null,ttft_ms:message.ttft_ms??null,num_turns:message.num_turns??null};process.sdk_usage_summary=usageSummary;const summary=loop.startObservation('query_usage_summary',{input:{source:'SDK result event'},output:usageSummary,metadata:{usage_source:'SDK result.modelUsage is authoritative cumulative accounting for this query() call'}},{asType:'event'});summary.end();backgroundFlush();}
    },
    async end(output,error){for(const entry of assistantGenerations.values())entry.generation.end();for(const tool of pendingTools.values()){tool.span.update({level:'ERROR',statusMessage:error?.message});tool.span.end();tool.record.status=error?'failed':'unfinished';}for(const stage of stages.values()){stage.span.update({level:error?'ERROR':'DEFAULT',statusMessage:error?.message});stage.span.end();process.stages[stage.index].status=error?'failed':'unfinished';}const finalText=output&&typeof output==='object'&&'content'in output?output.content:output;loop.update({output:{status:error?'failed':'completed',final_response:safe(finalText),assistant_turns:process.assistant_turns,tool_calls:process.tools,skill_sources:process.skill_sources,reference_sources:process.reference_sources||[],stages:process.stages,sdk_event_log:process.sdk_event_log,prompt_breakdown:process.prompt_breakdown||null,sdk_usage_summary:process.sdk_usage_summary||null,thinking_token_summary:thinking,summary:{assistant_turn_count:turn,tool_call_count:process.tools.length,skill_count:process.skill_sources.length,stage_count:process.stages.length,meaningful_sdk_event_count:process.sdk_event_log.length,filtered_sdk_event_count:thinking.update_count}},level:error?'ERROR':'DEFAULT',statusMessage:error?.message});loop.end();try{await processor.forceFlush();return 'flushed';}catch(flushError){console.warn('[langfuse] flush failed:',flushError.message);return 'flush_failed';}},
  };
}
export async function flushObservability(){if(processor)await processor.forceFlush();}
