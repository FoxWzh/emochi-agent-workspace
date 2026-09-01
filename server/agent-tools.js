import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { transact, id, summary, prompt } from './store.js';
import { queryCreativeMaterials } from './creative-material-search.js';

const area=z.enum(['basic','content','advanced']);
const imageTaskPurpose=z.enum(['cover','reference','scene']);
const artifactType=z.enum(['bot_basic','bot_content','bot_advanced','image','text','code','file','other']);
const creativeMaterialGenre=z.enum(['mystery','school','urban','fantasy','science_fiction','romance','workplace','historical','adventure','survival','slice_of_life']);
const creativeMaterialType=z.enum(['character','relationship','world_rule','setting','scene','conflict','narrative_device','interaction_mechanic','style_detail']);
// These are the supported persistent Bot fields. Strict schemas make malformed
// agent calls fail before a transaction instead of silently stripping data.
const botVisibility=z.enum(['public','private']);
const basicFields=z.object({
  name:z.string().trim().min(1),
  intro:z.string().optional(),
  tags:z.array(z.string().trim().min(1)).max(5).optional(),
  welcome:z.string().optional(),
  cover_url:z.string().url().optional(),
  visibility:botVisibility.optional(),
}).strict();
const basicPatchFields=basicFields.partial().strict();
// An Agent-created Bot is a finished business object, not a blank UI draft: it
// must have the user-facing fields required by the editor at creation time.
const createBasicFields=basicFields.extend({intro:z.string().trim().min(1),welcome:z.string().trim().min(1)}).strict();
const advancedFields=z.object({voice:z.string().optional(),examples:z.string().optional()}).strict();
const rawBotChange=z.discriminatedUnion('operation',[
  z.object({area,reason:z.string().min(1).optional(),operation:z.literal('replace'),value:z.unknown()}).strict(),
  z.object({area,reason:z.string().min(1).optional(),operation:z.literal('merge'),value:z.unknown()}).strict(),
  z.object({area,reason:z.string().min(1).optional(),operation:z.literal('clear')}).strict(),
]).superRefine((change,ctx)=>{
  if(change.area==='basic'&&change.operation==='replace'&&!basicFields.safeParse(change.value).success)ctx.addIssue({code:'custom',message:'basic replace value must be a complete supported basic object with a non-empty name.'});
  if(change.area==='basic'&&change.operation==='merge'&&!basicPatchFields.safeParse(change.value).success)ctx.addIssue({code:'custom',message:'basic merge value must contain only supported basic fields.'});
  if(change.area==='advanced'&&change.operation!=='clear'&&!advancedFields.partial().safeParse(change.value).success)ctx.addIssue({code:'custom',message:'advanced change value must contain only supported advanced fields.'});
  if(change.area==='content'&&change.operation!=='clear'&&typeof change.value!=='string')ctx.addIssue({code:'custom',message:'content change value must be a string.'});
});
const botChange=rawBotChange.transform(change=>({...change,reason:change.reason||`更新 ${change.area}`}));
const interactionSubjectKind=z.enum(['text','file','image_plan','artifact','work_object','bot','bot_create','bot_change','bot_archive','bot_delete']);
const interactionSubject=z.object({kind:interactionSubjectKind,id:z.string().optional(),preview:z.string().optional()}).strict();
const interactionOption=z.object({id:z.string().trim().min(1),title:z.string().trim().min(1),description:z.string().optional(),prompt:z.string().optional()}).strict().transform(({prompt,description,...option})=>({...option,description:description??prompt}));
export const uiInteractionInput=z.discriminatedUnion('type',[
  z.object({type:z.literal('choice'),title:z.string().trim().min(1),description:z.string().optional(),options:z.array(interactionOption).min(2).max(4),allow_custom:z.boolean().optional(),summary:z.string().optional(),subject:interactionSubject.optional(),impact:z.string().optional()}).strict(),
  z.object({type:z.literal('confirmation'),title:z.string().trim().min(1),description:z.string().optional(),summary:z.string().optional(),subject:interactionSubject,impact:z.string().optional()}).strict(),
]);
// Keep the agent-facing update contract deliberately singular. Compatibility belongs
// at HTTP migration boundaries, not in the model-visible MCP schema.
const updateChanges=z.array(botChange).min(1);
export const botWorkspaceInput=z.discriminatedUnion('action',[
  z.object({action:z.literal('search'),query:z.string().optional()}).strict(),
  z.object({action:z.literal('read'),bot_id:z.string().optional(),area:area.optional()}).strict(),
  z.object({action:z.literal('set_work_object'),bot_id:z.string().optional()}).strict(),
  z.object({action:z.literal('create'),basic:createBasicFields,content:z.string().trim().min(1),advanced:advancedFields.optional()}).strict(),
  z.object({action:z.literal('update'),bot_id:z.string(),changes:updateChanges}).strict(),
  z.object({action:z.literal('archive'),bot_id:z.string()}).strict(),
  z.object({action:z.literal('delete'),bot_id:z.string()}).strict(),
]);
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const stamp=()=>new Date().toISOString();
const find=(items,key)=>items.find(item=>item.id===key);
// Tool results become part of the resumed Claude SDK transcript. Keep derived
// init_prompt and UI-only record fields out of that transcript by projection.
export const agentBotSummary=bot=>bot?summary(bot):null;
export const agentBotRead=(bot,requestedArea)=>{
  if(!bot)return null;
  if(requestedArea)return {id:bot.id,[requestedArea]:bot[requestedArea]};
  return {id:bot.id,basic:bot.basic||{},content:bot.content||'',advanced:bot.advanced||{},updated_at:bot.updated_at};
};
export function applyBotChanges(bot,changes){
  const written=[];
  for(const change of changes){
    if(change.area==='content')bot.content=change.operation==='merge'?`${bot.content||''}\n\n${change.value??''}`.trim():change.operation==='clear'?'':String(change.value??'');
    else bot[change.area]=change.operation==='merge'?{...(bot[change.area]||{}),...(change.value||{})}:change.operation==='clear'?{}:change.value;
    written.push({area:change.area,operation:change.operation,applied:true});
  }
  bot.updated_at=stamp();bot.init_prompt=prompt(bot);
  return written;
}

export function createWorkspaceTools({sessionId,turnId,onEvent}){
  const event=(type,payload)=>onEvent?.(type,payload);
  return createSdkMcpServer({name:'emochi_workspace',version:'0.1.0',instructions:'Every bot_workspace call MUST include action. Use action=search to find a Bot and action=read with bot_id to inspect it. For update, pass bot_id plus non-empty changes only. Every ui_interaction choice requires 2–4 options; subject.kind may be bot for non-writing Bot context, while bot_change is for a pending Bot modification. Bot changes require user-visible confirmation before calling update/create/archive/delete. creative_material_search unlocks the local creative-material library with bounded sample/filter results; it never returns the source corpus or performs web search.',tools:[
    tool('bot_workspace',`Bot CRUD and current work object. Every call includes action.
CREATE (only this shape): {action:'create', basic:{name:string,intro:string,welcome:string,tags?:string[],cover_url?:url,visibility?:'public'|'private'}, content:string, advanced?:{voice?:string,examples?:string}}.
Create has no top-level name/title/intro/welcome. basic accepts only name,intro,tags,welcome,cover_url,visibility. advanced accepts only voice,examples.
UPDATE (only this shape): {action:'update',bot_id:string,changes:[{area:'basic'|'content'|'advanced',operation:'replace'|'merge'|'clear',value?:object|string,reason?:string}]}. Use basic+merge for partial basic fields; content value is a string.
SEARCH: {action:'search',query?:string}; READ: {action:'read',bot_id:string,area?:'basic'|'content'|'advanced'}; set or clear current Bot: {action:'set_work_object',bot_id?:string}. Never call with an empty object.`,botWorkspaceInput,async input=>{
      const response=await transact(state=>{
        const session=find(state.sessions,sessionId);if(!session)return {error:'session_not_found'};
        let bot=input.bot_id&&find(state.bots,input.bot_id);
        if(input.action==='search'){
          const bots=state.bots.filter(item=>`${item.basic?.name||''} ${item.basic?.intro||''}`.toLowerCase().includes((input.query||'').toLowerCase()));
          // A unique search result is an explicit enough target to place in this
          // Session's composer. Multiple results remain read-only to avoid guessing.
          if(bots.length===1){session.workObjectId=bots[0].id;session.updated_at=stamp();session.business_revision=(session.business_revision||0)+1;return {bots:bots.map(summary),work_object:bots[0].id,event:['bot',{bot:summary(bots[0]),work_object:bots[0].id,selected:true}]};}
          return {bots:bots.map(summary)};
        }
        if(input.action==='read')return {bot:agentBotRead(bot,input.area)};
        if(input.action==='set_work_object'){session.workObjectId=input.bot_id||null;session.updated_at=stamp();session.business_revision=(session.business_revision||0)+1;return {work_object:input.bot_id||null,event:['workspace',{work_object:input.bot_id||null}]};}
        if(input.action==='create'){
          bot={id:id('bot'),basic:input.basic,content:input.content||'',advanced:input.advanced||{},created_at:stamp(),updated_at:stamp()};
          bot.init_prompt=prompt(bot);state.bots.push(bot);
          // A Bot created inside a Session becomes that Session's current work
          // object immediately. The client consumes this event to update the
          // Composer's Bot slot before the final stream reload.
          session.workObjectId=bot.id;session.updated_at=stamp();session.business_revision=(session.business_revision||0)+1;
          return {bot:agentBotSummary(bot),written:['basic','content','advanced'],work_object:bot.id,event:['bot',{bot,work_object:bot.id,created:true}]};
        }
        if(!bot)return {error:'bot_not_found'};
        if(input.action==='update'){
          const written=applyBotChanges(bot,input.changes);
          // An explicit update always makes this Bot the active work object for
          // this Session, including when the composer previously had no Bot.
          session.workObjectId=bot.id;session.updated_at=stamp();session.business_revision=(session.business_revision||0)+1;
          return {bot:agentBotSummary(bot),written,work_object:bot.id,event:['bot',{bot:summary(bot),work_object:bot.id,updated:true,written}]};
        }
        if(input.action==='archive'){bot.archived_at=stamp();bot.updated_at=stamp();return {bot:summary(bot)};}
        state.bots=state.bots.filter(item=>item.id!==bot.id);if(session.workObjectId===bot.id)session.workObjectId=null;return {deleted_bot_id:bot.id,event:['bot_deleted',{bot_id:bot.id}]};
      });
      if(response.event)event(...response.event);return result(response);
    }),
    tool('artifact_workspace','Create/read/update/delete right-side Artifact Browser pages.',{
      action:z.enum(['create','list','read','update','delete']),artifact_id:z.string().optional(),type:artifactType.optional(),title:z.string().optional(),description:z.string().optional(),data:z.unknown().optional(),bot_ref:z.object({bot_id:z.string(),area}).optional(),
    },async input=>{
      const response=await transact(state=>{
        const session=find(state.sessions,sessionId);if(!session)return {error:'session_not_found'};
        if(input.action==='list')return {artifacts:state.artifacts.filter(artifact=>session.artifactIds.includes(artifact.id)).map(({data,...reference})=>reference)};
        let artifact=input.artifact_id&&find(state.artifacts,input.artifact_id);
        if(input.action==='read')return {artifact:artifact||null};
        if(input.action==='create'){artifact={id:id('artifact'),type:input.type,title:input.title,description:input.description||'',data:input.data??null,bot_ref:input.bot_ref||null,created_at:stamp(),updated_at:stamp()};state.artifacts.push(artifact);session.artifactIds.push(artifact.id);session.business_revision=(session.business_revision||0)+1;if(!String(artifact.type||'').startsWith('bot_'))session.timeline=[...(session.timeline||[]),{id:id('event'),kind:'artifact',artifactId:artifact.id,turn_id:turnId||null,after_message_id:null,created_at:stamp()}];return {artifact,event:['artifact',{artifact}]};}
        if(!artifact)return {error:'artifact_not_found'};
        if(input.action==='update'){Object.assign(artifact,{title:input.title??artifact.title,description:input.description??artifact.description,data:input.data??artifact.data,bot_ref:input.bot_ref??artifact.bot_ref,updated_at:stamp()});return {artifact,event:['artifact',{artifact}]};}
        state.artifacts=state.artifacts.filter(item=>item.id!==artifact.id);session.artifactIds=session.artifactIds.filter(item=>item!==artifact.id);session.business_revision=(session.business_revision||0)+1;session.timeline=(session.timeline||[]).filter(item=>item.artifactId!==artifact.id);return {deleted_artifact_id:artifact.id,event:['artifact_deleted',{artifact_id:artifact.id}]};
      });
      if(response.event)event(...response.event);return result(response);
    }),
    tool('creative_material_search','Unlock the local creative-material library only when the user asks for outside inspiration or the request lacks a key creative dimension. Input mode=sample|filter plus optional genres, material_types, tier=curated|auto|any, limit 1–3. sample returns varied inspirations; filter returns records matching all supplied dimensions (within a dimension any tag may match). Returns compact material cards only, never source files/articles. Adapt, combine, or invert; do not copy.',{mode:z.enum(['sample','filter']).default('sample'),genres:z.array(creativeMaterialGenre).max(3).optional(),material_types:z.array(creativeMaterialType).max(3).optional(),tier:z.enum(['curated','auto','any']).default('any'),limit:z.number().int().min(1).max(3).default(1)},async input=>result(await queryCreativeMaterials(input))),
    tool('image_task','Create a real asynchronous image generation job after the user explicitly confirms a visual plan. DEFAULT: count=4. Use count 1–4 only when the user explicitly requested that number; provide one distinct variant per image whenever possible. Never claim it started unless this tool returns a job id.',{title:z.string(),purpose:imageTaskPurpose.default('cover'),prompt:z.string().min(1),count:z.number().int().min(1).max(4).default(4),variants:z.array(z.object({id:z.string(),title:z.string(),prompt:z.string().min(1)})).min(1).max(4),images:z.array(z.object({image_url:z.string().url()})).max(16).optional(),size:z.enum(['auto','1024x1024','768x1024','1024x768']).optional(),style_locked:z.boolean().optional()},async input=>{const task={job_id:id('image_task'),turn_id:turnId,...input};event('image_task',task);return result({job_id:task.job_id,status:'generating',count:task.count});}),
    tool('ui_interaction','Choice: type=choice, title, and REQUIRED 2–4 options. Confirmation: type=confirmation, title, and REQUIRED subject. subject.kind: text|file|image_plan|artifact|work_object|bot|bot_create|bot_change|bot_archive|bot_delete. Use bot for read-only/discussion context; use bot_change only for a pending write.',uiInteractionInput,async input=>{
      const response=await transact(state=>{
        const session=find(state.sessions,sessionId);if(!session)return {error:'session_not_found'};
        const interaction={id:id('interaction'),...input,status:'pending',turn_id:turnId||null,after_message_id:null,created_at:stamp(),resolved_at:null,response:null};session.interactions=[...(session.interactions||[]),interaction];session.updated_at=stamp();session.business_revision=(session.business_revision||0)+1;return {status:'pending',interaction};
      });
      if(response.interaction)event('interaction',response.interaction);return result(response);
    }),
  ]});
}
