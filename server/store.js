import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// The local demo keeps JSON in ./data. On Vercel, Function source is read-only,
// so demo state is isolated in the writable but intentionally ephemeral /tmp.
export const dataDir=()=>process.env.EMOCHI_DATA_DIR||path.join(process.cwd(),'data');
const projectRoot=()=>process.cwd();
const workspaceFile=()=>path.join(dataDir(),'workspace.json');
const sessionFile=id=>path.join(dataDir(),'sessions',`${id}.json`);
const botSeedFile=()=>path.join(projectRoot(),'demo-seed','bot-library.seed.json');
const imageTasksFile=()=>path.join(dataDir(),'image-tasks.json');
const blank=()=>({sessions:[],bots:[],artifacts:[]});
// Explicit custom data directories are isolated test/local workspaces and begin
// empty. The bundled seed is for the public Vercel demo only.
const seedBots=async()=>process.env.EMOCHI_DATA_DIR?[]:(await readJson(botSeedFile())||[]);
const publicAttachment=attachment=>{const {file_path,...publicValue}=attachment||{};return publicValue};
const publicSession=session=>{const {sdk_session_id,sdk_seen_tool_use_ids,...publicData}=session;return {...publicData,messages:(session.messages||[]).map(message=>({...message,attachments:(message.attachments||[]).map(publicAttachment)}))};};
const sessionSummary=({messages,interactions,timeline,...session})=>session;
// Persist upload locations relative to the data directory so a checked-out
// snapshot works on another machine or deployment. Hydrate only in memory for
// the Agent SDK, which needs a concrete local path to read an attached image.
const uploadRelativePath=value=>{
  if(typeof value!=='string'||!value)return null;
  if(!path.isAbsolute(value))return value.replace(/^\.\//,'');
  const marker=`${path.sep}uploads${path.sep}`;
  const index=value.lastIndexOf(marker);
  return index>=0?`uploads/${value.slice(index+marker.length)}`:null;
};
const normalizeAttachmentForDisk=attachment=>{
  if(!attachment?.file_path)return attachment;
  const relative=uploadRelativePath(attachment.file_path);
  if(!relative)return (({file_path,...rest})=>rest)(attachment);
  return {...attachment,file_path:relative};
};
const hydrateAttachment=attachment=>attachment?.file_path&&!path.isAbsolute(attachment.file_path)
  ? {...attachment,file_path:path.join(dataDir(),attachment.file_path)}
  : attachment;
const normaliseSession=session=>({messages:[],artifactIds:[],timeline:[],interactions:[],sdk_session_id:null,sdk_seen_tool_use_ids:[],business_revision:0,...session,messages:(session?.messages||[]).map(message=>({...message,attachments:(message.attachments||[]).map(hydrateAttachment)}))});
const serialiseSession=session=>({...session,messages:(session.messages||[]).map(message=>({...message,attachments:(message.attachments||[]).map(normalizeAttachmentForDisk)}))});
// Compatibility migration for Bots written before the field contract was
// canonicalised. Current UI/runtime only consume these canonical field names.
function normaliseBot(bot){
  const source=bot?.basic&&typeof bot.basic==='object'&&!Array.isArray(bot.basic)?bot.basic:{};
  const sourceAdvanced=bot?.advanced&&typeof bot.advanced==='object'&&!Array.isArray(bot.advanced)?bot.advanced:{};
  const basic={name:source.name};
  const intro=source.intro??source.description;
  const welcome=source.welcome??source.greeting;
  const coverUrl=source.cover_url??source.cover;
  if(intro!==undefined)basic.intro=intro;
  if(Array.isArray(source.tags))basic.tags=source.tags;
  if(welcome!==undefined)basic.welcome=welcome;
  if(coverUrl!==undefined)basic.cover_url=coverUrl;
  if(source.visibility!==undefined)basic.visibility=source.visibility;
  if(typeof bot?.basic==='string'){basic.name='未命名 Bot';basic.welcome=bot.basic;}
  const advanced={};
  const voice=sourceAdvanced.voice??sourceAdvanced.tone;
  if(voice!==undefined)advanced.voice=voice;
  const legacyExamples=[sourceAdvanced.examples,sourceAdvanced.example_dialogue,sourceAdvanced.response_rules,sourceAdvanced.character_dynamics,sourceAdvanced.rules].filter(value=>value!==undefined&&value!==null&&value!=='');
  if(legacyExamples.length)advanced.examples=legacyExamples.map(value=>typeof value==='string'?value:JSON.stringify(value,null,2)).join('\n\n');
  return {...bot,basic,advanced};
}
const normaliseBots=bots=>(bots||[]).map(normaliseBot);

async function readJson(file){try{return JSON.parse(await readFile(file,'utf8'))}catch{return null}}

// Conversation records live in one file per Session. The workspace index only owns
// navigation metadata and global Bot/Artifact collections, keeping conversation state isolated.
export async function load(){
  const workspace=await readJson(workspaceFile())||blank();
  const beforeNormalisation=JSON.stringify(workspace.bots||[]);
  workspace.bots=normaliseBots(workspace.bots);
  if(beforeNormalisation!==JSON.stringify(workspace.bots||[])){await mkdir(path.dirname(workspaceFile()),{recursive:true});await writeFile(workspaceFile(),JSON.stringify(workspace,null,2),'utf8');}
  // Demo-only one-time import: production samples are reduced to local
  // display-safe fields, then persisted with the workspace. Existing local
  // Bots remain intact and deleted sample Bots do not reappear on later loads.
  if(!workspace.bot_samples_imported){
    const samples=await seedBots(); const existing=new Set((workspace.bots||[]).map(bot=>bot.id));
    if(samples.length){
      workspace.bots=[...samples.filter(bot=>!existing.has(bot.id)),...(workspace.bots||[])];
      workspace.bot_samples_imported=true;
      await mkdir(path.dirname(workspaceFile()),{recursive:true});
      await writeFile(workspaceFile(),JSON.stringify(workspace,null,2),'utf8');
    }
  }
  const sessions=await Promise.all((workspace.sessions||[]).map(async meta=>{
    const stored=await readJson(sessionFile(meta.id));
    // A metadata entry carrying messages is the legacy single-file format.
    // Prefer it once; save() will immediately split it into the isolated layout.
    const legacyRecord=Object.hasOwn(meta,'messages')||Object.hasOwn(meta,'interactions')||Object.hasOwn(meta,'timeline');
    return normaliseSession(legacyRecord?meta:(stored||meta));
  }));
  return {...blank(),...workspace,sessions};
}

let transactionTail=Promise.resolve();
// JSON is only a demo repository, but mutations still need database-like serial
// semantics: concurrent Session turns must not overwrite each other's snapshots.
export function transact(mutator){
  const run=transactionTail.then(async()=>{const state=await load();const result=await mutator(state);await save(state);return result;});
  transactionTail=run.catch(()=>{});
  return run;
}

export async function publicState(){const state=await load();return {...state,sessions:state.sessions.map(publicSession)}}

export async function deleteSessionRecord(sessionId){try{await unlink(sessionFile(sessionId))}catch(error){if(error.code!=='ENOENT')throw error}}

export async function save(data){
  await mkdir(path.join(dataDir(),'sessions'),{recursive:true});
  const sessions=(data.sessions||[]).map(normaliseSession);
  await Promise.all(sessions.map(session=>writeFile(sessionFile(session.id),JSON.stringify(serialiseSession(session),null,2),'utf8')));
  const index={...data,sessions:sessions.map(sessionSummary)};
  await writeFile(workspaceFile(),JSON.stringify(index,null,2),'utf8');
  return {...data,sessions};
}

export const id=(prefix)=>`${prefix}_${randomUUID()}`;
export function summary(bot){return {id:bot.id,title:bot.basic?.name||'未命名 Bot',description:bot.basic?.intro||bot.basic?.description||'',cover_url:bot.basic?.cover_url||bot.basic?.cover||'',updated_at:bot.updated_at}}
export function prompt(bot){return [bot.basic?.name&&`# ${bot.basic.name}`,bot.basic?.intro||bot.basic?.description,(bot.basic?.welcome||bot.basic?.greeting)&&`欢迎语：${bot.basic.welcome||bot.basic.greeting}`,bot.content,(bot.advanced?.voice||bot.advanced?.tone)&&`语气：${bot.advanced.voice||bot.advanced.tone}`,(bot.advanced?.examples||bot.advanced?.example_dialogue)&&`示例对话：${bot.advanced.examples||bot.advanced.example_dialogue}`].filter(Boolean).join('\n\n')}
export function makeSession(title='新的创作对话'){const now=new Date().toISOString();return {id:id('session'),title,workObjectId:null,messages:[],artifactIds:[],timeline:[],interactions:[],sdk_session_id:null,sdk_seen_tool_use_ids:[],business_revision:0,created_at:now,updated_at:now}}

export async function readImageTasks(){return await readJson(imageTasksFile())||[];}
export async function writeImageTasks(tasks){await mkdir(dataDir(),{recursive:true});await writeFile(imageTasksFile(),JSON.stringify(tasks,null,2));}
