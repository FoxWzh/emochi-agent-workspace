import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDown,Bot,Check,ChevronDown,ChevronUp,Copy,Image as ImageIcon,LoaderCircle,Pencil,Sparkles,X} from 'lucide-react';
import {api,streamMessage} from '../api';
import {ConversationSidebar} from '../components/ConversationSidebar';
import {WorkspaceHeader} from '../components/WorkspaceHeader';
import {ArtifactCard} from '../components/ArtifactCard';
import {Composer} from '../components/Composer';
import {RightViewer} from '../components/RightViewer';
import {BotLibrary} from '../components/BotLibrary';
import {BotContextBar} from '../components/BotContextBar';

const THINKING_MARK_SRC='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAFH0lEQVRYCe2Xy0vtVRTHl+/34+jxmVc09WpIdsmuGkkOsvCa0UyRBA0F0QbRxH8gAyc2qFDCiQMJByoa6UjIgRn5QkJR0VSume+3Ht/n1/e7dZ+OejwaBTW4Cz7+fmc/fnvttddjK/JC/mMLuDxwfRPGvQwSQQKIBEHAHZyBPbAKFsAs+A1sgHvFmQJemP0G+ADkgCQQDNzAXWJFxy6YBz+BH8DPYB84FEcKsO1N8Al4Bkw+Pj4SFxcnKSkpkpiYKNHR0RIcHCyenp5ydnYmOzs7sry8LHNzczI1NaWeh4eHmCoHYAA0gm5AazkVb/R+BpaBERsba1RXVxs9PT3G0tKScXp6ajiT8/NzY2VlxWhtbTVKS0uN+Ph4g98BtMDXIArcKTT55+DE399fLTw+Pm5YrVZnazrs29/fN4aHh42uri6jqqrKCAsL04rwSGLv0qASHUehoaFGU1OTAdM6/PhDGjl3YmLCGBwcVDQ2NhrJyclaie+wToBWQjsUvfsbnHVEXV2dVFZWiqurqx7zt5+ce3JyInt7DA6RmJgYgQIyMjLCthQ0PQej7NOrfIj3x3l5eVJWVsb2fywBAQHi5na5v4uLC0lNTZWSkhJxd3f3wMc/BqFchAowtAo8PDykqKhI6PH/hnh7e3Mx26dwdJKTkyNJSYxmeR28zRcq8AS8yo7s7Gy22YShtLm5KZz8ENna2pKDA0YekgV2z03puXzCv5QS6KbDv89hVICahGRlZUlU1F9RwrguLy+X3Nxc6ezsxBDn0tvbKzxCmnlhYUHt3t4CenZmZqYEBgby51vgERXIAi4ZGRnXHG9oaEja2tpkbGxMENfCc3Qm7e3twjkIPenv71dDXVyu5zlaAblFJTUMeASeUIHHiHvlpWrW1R+TySR0JEpkZKTNoa66bz3MZrNq8/PzE/2uza8H8zfXSkhIYJMveI1eEs5J4eHhbLQJLdLQ0KDMWVxcbGu/64WhS4UjIiLUOdNiyIy3htM3aAUIzZNIBfyZ06mZvXh5eclDFtZzGOs1NTX6pxwfH6s6cfMY+Jt15ErCeQTIttZ7z1jPeOjz6OhIKeBovJ1zutIC2xhsZgiheNwaz3NDEbrVfrOBO6Mltezu7nJnctMC/B6tcyUWKjCP9GiemZmR9PR03aGeHFhfXy8DAwO3PmQ/kB9lzFdUVEhBQYEtDd9cnHM4FhVTT/+dCgzAWZ729fVJYWHhtVDc3t6W5uZmmZ3lJed+YaJhLkDptt/ltYmsEdwshB76KxX4HnzU3d1tRvmVtLQ0/LwUlFGpra1Vce1oN3ocn7RAfn6+ihoepyNhkWKCm56eZjevcEMMBabFb0EpvR6lU4KCeN27Xxhq9A+mX545n9yhI2W5OM1Pi3INvHPjxSxXTHHPwbuTk5OmxcVF5YwMS07glYuL0B8sFovgsiE8mvX1dXWWPE/umH32TkcluKheeHV1VTo6OqSlpYXfOsJ6tWDMPlfy8vkViGNNYM5mMmKR4tn6+vpey4aOdkmFCS1DhajY/Py8jI6OqjTNdyhpwRpfgi/Asb0C+C1PwafgPRDGrMXjYHZjOqZPhISEqKTFss1zpzDjMe61dTY2NmRtbU1ZiBdWWhHCMjkCeEFldTsBKh3yaS8MZnriO4AV6xUQBpgqL28YeLlHrOjntXgTMIR+AT+CYcBru01uWsDWcfVCB2WRYPJ+CfAfkgjAXMpiojMPMxXPdQdw0T/AElgEa4DKvJD/pwX+BPs7sOCPU9ofAAAAAElFTkSuQmCC';
const WAITING_MESSAGES=['正在整理你的创作想法','正在捕捉这个念头里的火花','正在把零散线索编织起来','正在寻找更不寻常的切入角度','正在推敲人物、世界与选择之间的关系','正在让这个想法长出可以进入的入口','正在校准故事的张力与留白','正在为下一步准备几个更有差异的方向','正在把模糊感觉翻译成可互动的体验','正在检查它是否足够新鲜、可玩且能继续发展','正在收束这一轮最值得保留的部分','正在为你的创作留出更多可能'];
const byId=(xs,id)=>xs.find(x=>x.id===id);
const displayBot=b=>b?{...b,name:b.basic?.name||'未命名 Bot',intro:b.basic?.intro||'',tags:b.basic?.tags||[],cover:b.basic?.cover_url||'',welcome:b.basic?.welcome||'',voice:b.advanced?.voice||'',examples:b.advanced?.examples||'',visibility:b.basic?.visibility||'public'}:null;
const activityText=activity=>activity?.label||'正在处理中';
function AgentRunStatus({activityLog=[],waitingText,hasVisibleContent=false}){
  // This is only a pre-answer bridge. Once the agent has begun producing
  // user-visible Markdown, its content is the progress signal; never leave
  // Skill/Tool activity rows competing with the actual reply.
  if(hasVisibleContent)return null;
  const current=[...activityLog].reverse().find(item=>['started','running'].includes(item.state));
  const entries=activityLog.filter(item=>item.state!=='running'||item.id===current?.id).slice(-5);
  return <section className="agent-run-status" role="status" aria-live="polite">
    <div className="agent-run-heading"><i/><b>{current?'正在处理中…':'正在思考中…'}</b><span>{current?activityText(current):waitingText}</span></div>
    {entries.length>0&&<div className="agent-run-activities">{entries.map((item,index)=><div className={`agent-run-activity ${item.state||'started'}`} key={`${item.id}_${index}`}><em>{item.state==='completed'?'✓':item.state==='failed'?'!':'⌘'}</em><span>{item.state==='completed'?'已完成：':item.state==='failed'?'未完成：':'正在执行：'}{activityText(item)}</span></div>)}</div>}
  </section>;
}

function confirmationCopy(subjectKind){
  const labels={
    bot_create:{confirm:'确认创建',revise:'暂不创建',confirmDescription:'按当前方案创建这个 Bot。',reviseDescription:'保留方案，继续调整。',confirmed:'已确认创建',revised:'暂不创建',confirmedHint:'已授权创建。',revisedHint:'方案保留，可继续调整。'},
    bot_change:{confirm:'确认修改',revise:'暂不修改',confirmDescription:'按当前差异更新这个 Bot。',reviseDescription:'保留草稿，继续调整。',confirmed:'已确认修改',revised:'暂不修改',confirmedHint:'已授权修改。',revisedHint:'草稿保留，可继续调整。'},
    bot_archive:{confirm:'确认归档',revise:'暂不归档',confirmDescription:'归档这个 Bot。',reviseDescription:'保留当前 Bot。',confirmed:'已确认归档',revised:'暂不归档',confirmedHint:'已授权归档。',revisedHint:'当前 Bot 保持不变。'},
    bot_delete:{confirm:'确认删除',revise:'取消删除',confirmDescription:'永久删除这个 Bot 及关联工作页。',reviseDescription:'保留这个 Bot，不做删除。',confirmed:'已确认删除',revised:'已取消删除',confirmedHint:'已授权删除。',revisedHint:'当前 Bot 已保留。'},
    artifact:{confirm:'确认操作',revise:'取消操作',confirmDescription:'按当前方案继续执行。',reviseDescription:'保留当前内容，不执行此操作。',confirmed:'已确认操作',revised:'已取消操作',confirmedHint:'已授权继续执行。',revisedHint:'当前内容保持不变。'},
    work_object:{confirm:'确认切换',revise:'暂不切换',confirmDescription:'切换当前正在编辑的 Bot。',reviseDescription:'保持当前 Bot。',confirmed:'已确认切换',revised:'暂不切换',confirmedHint:'已授权切换。',revisedHint:'当前 Bot 保持不变。'},
  };
  return labels[subjectKind]||{confirm:'确认执行',revise:'暂不执行',confirmDescription:'按当前方案继续执行。',reviseDescription:'保留当前内容，继续调整。',confirmed:'已确认执行',revised:'暂不执行',confirmedHint:'已授权继续执行。',revisedHint:'当前内容保持不变。'};
}

function Interaction({item,onChoose,disabled}) {
  const confirmation=item.type==='confirmation';
  const [custom,setCustom]=useState('');
  const [customOpen,setCustomOpen]=useState(false);
  const [editingOption,setEditingOption]=useState(null);
  const [expanded,setExpanded]=useState(item.status!=='resolved');
  useEffect(()=>{if(item.status==='resolved')setExpanded(false)},[item.status]);
  const confirmationLabels=confirmationCopy(item.subject?.kind);
  const choices=confirmation?[
    {id:'confirm',title:confirmationLabels.confirm,description:confirmationLabels.confirmDescription},
    {id:'revise',title:confirmationLabels.revise,description:confirmationLabels.reviseDescription},
  ]:item.options||[];
  const openCustom=()=>{setEditingOption(null);setCustom('');setCustomOpen(true);};
  const openInlineEditor=option=>{setCustomOpen(false);setEditingOption(option);setCustom(option.description||option.title||'');};
  const closeInlineEditor=()=>{setEditingOption(null);setCustom('');};
  const submitCustom=()=>{const value=custom.trim();if(!value||disabled||item.status==='resolved')return;const title=editingOption?.title||'自定义方向';onChoose(item,{id:editingOption?`custom_${editingOption.id}`:'custom',title,description:value});};
  const confirmed=confirmation&&item.response?.option_id==='confirm';
  const ignored=item.status==='ignored';
  const decisionLabel=ignored?'已忽略':confirmation?(confirmed?confirmationLabels.confirmed:confirmationLabels.revised):'已选择';
  if((item.status==='resolved'||ignored)&&!expanded)return <button className="interaction-history" onClick={()=>setExpanded(true)}><span>{decisionLabel}</span><b>{item.response?.title||'已完成选择'}</b><small>{confirmation?(confirmed?confirmationLabels.confirmedHint:confirmationLabels.revisedHint):item.response?.option_id==='custom'?'自定义方向':'查看当时的决策'}</small><ChevronDown className="interaction-history-icon" size={15}/></button>;
  return <section className={`agent-interaction ${confirmation?'confirmation':''} ${ignored?'is-ignored':''}`}>
    {item.status==='resolved'&&<button type="button" className="interaction-collapse" aria-label="收起历史决策" onClick={()=>setExpanded(false)}><ChevronUp size={15}/></button>}
    <span>{confirmation?'请确认这项操作':'请选择一个方向'}</span>
    <b>{item.title}</b>
    {ignored&&<small className="interaction-ignored-note">已继续发送新消息，此选择不会再影响当前对话。</small>}
    {item.description&&<Markdown className="interaction-copy">{item.description}</Markdown>}
    {item.summary&&<Markdown className="interaction-copy">{item.summary}</Markdown>}
    {confirmation&&item.subject?.preview&&<div className="confirmation-preview"><span>方案摘要</span><Markdown>{item.subject.preview}</Markdown></div>}
    {confirmation&&item.impact&&<div className="confirmation-impact"><span>影响</span><Markdown>{item.impact}</Markdown></div>}
    <div className={confirmation?'confirmation-actions':'choice-actions'}>
      {choices.map(option=>{
        const selected=item.status==='resolved'&&item.response?.option_id===option.id;
        const editing=!confirmation&&editingOption?.id===option.id;
        if(editing)return <div className="choice-option-row is-editing" key={option.id}>
          <div className="choice-option-inline-editor">
            <b>{option.title}</b>
            <textarea autoFocus value={custom} onChange={event=>setCustom(event.target.value)} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter')submitCustom();}} aria-label={`编辑「${option.title}」`}/>
            <div><button type="button" onClick={closeInlineEditor}>取消</button><button type="button" className="custom-choice-submit" disabled={!custom.trim()||disabled} onClick={submitCustom}>按此继续</button></div>
          </div>
        </div>;
        return <div className={`choice-option-row ${confirmation?'is-confirmation':''}`} key={option.id}>
          <button className={`${confirmation&&option.id==='confirm'?'confirm-action':''} ${selected?'selected-choice':''}`} disabled={disabled||item.status==='resolved'||ignored} onClick={()=>onChoose(item,option)}>
            <span className="choice-option-title">{option.title}{selected&&<span className="selected-mark">已选</span>}{!confirmation&&item.status!=='resolved'&&<span role="button" tabIndex={disabled?-1:0} className="choice-option-edit" aria-label={`编辑「${option.title}」后继续`} title="编辑这个方向" onClick={event=>{event.preventDefault();event.stopPropagation();openInlineEditor(option);}} onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&!disabled){event.preventDefault();event.stopPropagation();openInlineEditor(option);}}}><Pencil size={12}/></span>}</span>
            {!confirmation&&option.description&&<Markdown className="interaction-option-copy">{option.description}</Markdown>}
            {confirmation&&option.description&&<small>{option.description}</small>}
          </button>
        </div>;
      })}
    </div>
    {!confirmation&&item.status!=='resolved'&&!customOpen&&!editingOption&&<button className="custom-choice-trigger" disabled={disabled} onClick={openCustom}>＋ 自定义一个方向</button>}
    {!confirmation&&item.status!=='resolved'&&customOpen&&<div className="custom-choice"><b>自定义一个方向</b><textarea autoFocus value={custom} onChange={event=>setCustom(event.target.value)} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter')submitCustom();}} placeholder="写下你真正想要的设定、情绪或限制…"/><div><button onClick={()=>{setCustomOpen(false);setCustom('')}}>取消</button><button className="custom-choice-submit" disabled={!custom.trim()||disabled} onClick={submitCustom}>按这个方向继续</button></div></div>}
  </section>;
}


function ImageTaskCard({task,onCompleted,onPreview,onSetCover,canSetCover}){
  const [current,setCurrent]=useState(task); const [now,setNow]=useState(Date.now());
  useEffect(()=>setCurrent(task),[task]);
  const started=Date.parse(current?.created_at||0)||Date.now();
  const elapsed=Math.max(0,now-started); const timedOut=elapsed>=60_000&&['queued','generating'].includes(current?.status);
  const terminal=['completed','failed','cancelled'].includes(current?.status);
  useEffect(()=>{if(terminal||timedOut)return;let dead=false;const poll=async()=>{try{const next=await api.imageTask(current.id);if(dead)return;setCurrent(next);if(['completed','failed','cancelled'].includes(next.status))onCompleted?.();}catch{}};poll();const timer=window.setInterval(()=>{setNow(Date.now());poll();},1800);return()=>{dead=true;window.clearInterval(timer)};},[current?.id,terminal,timedOut]);
  const showLoading=['queued','generating'].includes(current?.status)&&(elapsed<2000||!terminal)&&!timedOut;
  const artifacts=current?.artifacts||[];
  const placeholderCount=Math.min(4,Math.max(1,Number(current?.count) || (Array.isArray(current?.variants) ? current.variants.length : 4)));
  // A task stores its output in the Session's single image_library Artifact.
  // Read the batch matching this task ID; older direct-image artifacts remain
  // supported so historical conversations continue to render.
  const candidates=artifacts.flatMap(artifact=>{
    const batches=Array.isArray(artifact.data?.batches)?artifact.data.batches:[];
    const taskBatch=batches.find(batch=>batch.id===current?.id);
    if(taskBatch?.images)return taskBatch.images;
    if(Array.isArray(artifact.data?.images))return artifact.data.images;
    return artifact.data?.url?[{id:artifact.id,title:artifact.title,url:artifact.data.url}]:[];
  });
  return <section className={'chat-image-task '+(showLoading?'is-loading':'') }>
    <header><span className="chat-image-task-mark">{showLoading?<LoaderCircle size={15}/>:<ImageIcon size={15}/>}</span><div><b>{current?.title||'图片生成任务'}</b><small>{showLoading?'正在生成图片…':timedOut?'生成等待超过 1 分钟，可稍后刷新查看结果。':current?.status==='failed'?(current.error?.message||'图片生成失败。'):current?.status==='completed'?`已生成 ${candidates.length} 张候选图片。`:'图片任务已结束。'}</small></div></header>
    {showLoading&&<div className="chat-image-grid chat-image-placeholders" aria-label="图片正在生成">{Array.from({length:placeholderCount},(_,index)=><article key={index} className="chat-image-placeholder" aria-hidden="true"><i/><span>正在生成</span></article>)}</div>}
    {!showLoading&&current?.status==='completed'&&candidates.length>0&&<div className="chat-image-grid">{candidates.map((image,index)=><article key={image.id||index} className="chat-image-candidate"><button type="button" className="chat-image-preview" onClick={()=>onPreview?.(image.url)} title={`查看「${image.title||`候选 ${index+1}`}」大图`}><img src={image.url} alt={image.title||`图片候选 ${index+1}`}/><span>{image.title||`候选 ${index+1}`}</span></button><button type="button" className="set-cover-action" disabled={!canSetCover} onClick={()=>onSetCover?.(image.url)} title={canSetCover?'将这张图设为当前 Bot 封面':'请先在当前会话选择一个 Bot'}>设为封面</button></article>)}</div>}
  </section>;
}

function inlineMarkdown(value){
  const parts=String(value||'').split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('`')&&part.endsWith('`')?<code key={index}>{part.slice(1,-1)}</code>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:part);
}
function TraceIdCopy({traceId}){const [copied,setCopied]=useState(false);if(!traceId)return null;const copy=async()=>{try{await navigator.clipboard.writeText(traceId);}catch{const area=document.createElement('textarea');area.value=traceId;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();}setCopied(true);window.setTimeout(()=>setCopied(false),1400);};return <button type="button" className={'trace-id-copy '+(copied?'copied':'')} onClick={copy} title={`复制 Langfuse Trace ID：${traceId}`} aria-label="复制本条对话的 Langfuse Trace ID">{copied?<Check size={12}/>:<Copy size={12}/>}<span>{copied?'已复制':'Trace ID'}</span></button>}

function tableCells(line){return line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim())}
function isTableSeparator(line){return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)}
function Markdown({children,className=''}){
  const lines=String(children||'').split('\n'); const blocks=[]; let list=[];
  const flush=()=>{if(list.length){blocks.push(<ul key={'list_'+blocks.length}>{list.map((line,index)=><li key={index}>{inlineMarkdown(line)}</li>)}</ul>);list=[];}};
  for(let index=0;index<lines.length;index++){
    const line=lines[index],next=lines[index+1];
    if(line.includes('|')&&next&&isTableSeparator(next)){
      flush();const headers=tableCells(line);const rows=[];index+=2;
      while(index<lines.length&&lines[index].includes('|')&&lines[index].trim()){rows.push(tableCells(lines[index]));index++;}
      index--;blocks.push(<div className="markdown-table-wrap" key={'table_'+blocks.length}><table><thead><tr>{headers.map((header,column)=><th key={column}>{inlineMarkdown(header)}</th>)}</tr></thead><tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{headers.map((_,column)=><td key={column}>{inlineMarkdown(row[column]||'')}</td>)}</tr>)}</tbody></table></div>);continue;
    }
    const item=line.match(/^[-*]\s+(.+)/);if(item){list.push(item[1]);continue}flush();if(!line.trim()){blocks.push(<br key={'break_'+blocks.length}/>);continue}const heading=line.match(/^(#{1,3})\s+(.+)/);if(heading){const Tag=`h${heading[1].length}`;blocks.push(<Tag key={'heading_'+blocks.length}>{inlineMarkdown(heading[2])}</Tag>)}else blocks.push(<p key={'paragraph_'+blocks.length}>{inlineMarkdown(line)}</p>);
  }
  flush(); return <div className={'markdown '+className}>{blocks}</div>;
}

export default function App(){
  const [state,setState]=useState({sessions:[],bots:[],artifacts:[]});
  const [activeId,setActiveId]=useState(null);
  const [activeArtifact,setActiveArtifact]=useState(null);
  const [artifactBrowserOpen,setArtifactBrowserOpen]=useState(false);
  const [artifactBrowserExpanded,setArtifactBrowserExpanded]=useState(false);
  const [artifactWidth,setArtifactWidth]=useState(360);
  const [resizingArtifact,setResizingArtifact]=useState(false);
  const [renameTarget,setRenameTarget]=useState(null);
  const [renameValue,setRenameValue]=useState('');
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [botLibraryOpen,setBotLibraryOpen]=useState(false);
  const [deleteBotTarget,setDeleteBotTarget]=useState(null);
  const [botEditorDrafts,setBotEditorDrafts]=useState({});
  const [draftBySession,setDraftBySession]=useState({});
  const [attachmentsBySession,setAttachmentsBySession]=useState({});
  const [streamingBySession,setStreamingBySession]=useState({});
  const [waitingIndexBySession,setWaitingIndexBySession]=useState({});
  const [activityBySession,setActivityBySession]=useState({});
  const [activityLogBySession,setActivityLogBySession]=useState({});
  const liveTurnRef=useRef(new Map());
  const [errorBySession,setErrorBySession]=useState({});
  const [liveInteractionsBySession,setLiveInteractionsBySession]=useState({});
  const [artifactEventsBySession,setArtifactEventsBySession]=useState({});
  const [imageTasksBySession,setImageTasksBySession]=useState({});
  const [previewImage,setPreviewImage]=useState(null);
  const [serviceHealth,setServiceHealth]=useState(null);
  const [initialLoad,setInitialLoad]=useState('loading');
  const typewritersRef=useRef(new Map());
  const submittingSessionsRef=useRef(new Set());
  const threadRef=useRef(null);
  const followThreadRef=useRef(true);
  const [showJumpToLatest,setShowJumpToLatest]=useState(false);
  const clearLocalTurn=(sessionId,message='')=>{
    const writer=typewritersRef.current.get(sessionId);if(writer?.timer)window.clearInterval(writer.timer);typewritersRef.current.delete(sessionId);
    setStreamingBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});
    setActivityBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});
    setActivityLogBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});
    if(message)setErrorBySession(current=>({...current,[sessionId]:message}));
    setState(current=>({...current,sessions:current.sessions.map(session=>session.id===sessionId?{...session,messages:session.messages.filter(item=>item.id!==`streaming_${sessionId}`)}:session)}));
  };
  const reload=async(preferredSessionId)=>{
    const next=await api.state();
    setState(next);
    setActiveId(current=>{
      const preferred=preferredSessionId&&byId(next.sessions,preferredSessionId)?.id;
      return preferred||current&&byId(next.sessions,current)?.id||next.sessions[0]?.id||null;
    });
    return next;
  };
  const loadWorkspace=async()=>{
    setInitialLoad('loading');
    try{await reload();setErrorBySession(current=>{const {workspace,...rest}=current;return rest});setInitialLoad('ready');}
    catch(error){setErrorBySession(current=>({...current,workspace:error.message}));setInitialLoad('error');}
    try{setServiceHealth(await api.health());}catch{setServiceHealth({status:'error'});}
  };
  useEffect(()=>{void loadWorkspace();},[]);
  useEffect(()=>()=>{for(const writer of typewritersRef.current.values())window.clearInterval(writer.timer)},[]);
  useEffect(()=>{
    if(!resizingArtifact)return;
    const resize=event=>setArtifactWidth(Math.min(720,Math.max(320,window.innerWidth-event.clientX)));
    const stop=()=>setResizingArtifact(false);
    window.addEventListener('pointermove',resize);window.addEventListener('pointerup',stop);window.addEventListener('pointercancel',stop);
    return()=>{window.removeEventListener('pointermove',resize);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);};
  },[resizingArtifact]);
  useEffect(()=>{const timers=Object.entries(streamingBySession).filter(([,busy])=>busy).map(([sessionId])=>[sessionId,window.setInterval(()=>setWaitingIndexBySession(current=>({...current,[sessionId]:((current[sessionId]||0)+1)%WAITING_MESSAGES.length})),2600)]);return()=>timers.forEach(([,timer])=>window.clearInterval(timer))},[streamingBySession]);
  useEffect(()=>{
    const tasks=[...(state.image_tasks||[]),...Object.values(imageTasksBySession[activeId]||{})].filter(task=>task.session_id===activeId&&['queued','generating'].includes(task.status));
    if(!activeId||!tasks.length)return;
    let cancelled=false;
    const check=async()=>{for(const task of tasks){try{const next=await api.imageTask(task.id);if(cancelled)return;setImageTasksBySession(current=>({...current,[activeId]:{...(current[activeId]||{}),[task.id]:next}}));if(['completed','failed','cancelled'].includes(next.status))await reload(activeId);}catch(error){if(!cancelled)setImageTasksBySession(current=>({...current,[activeId]:{...(current[activeId]||{}),[task.id]:{...task,status:'failed',error:{message:error.message}}}}));}}};
    check();const timer=window.setInterval(check,2200);return()=>{cancelled=true;window.clearInterval(timer)};
  },[activeId,state.image_tasks,imageTasksBySession]);
  useEffect(()=>{const thread=threadRef.current;if(!thread)return;if(followThreadRef.current){thread.scrollTop=thread.scrollHeight;setShowJumpToLatest(false);}else if(thread.scrollHeight-thread.scrollTop-thread.clientHeight>48)setShowJumpToLatest(true);},[state.sessions,streamingBySession,liveInteractionsBySession,artifactEventsBySession]);
  const handleThreadScroll=()=>{const thread=threadRef.current;if(!thread)return;const nearBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<48;followThreadRef.current=nearBottom;setShowJumpToLatest(!nearBottom);};
  const jumpToLatest=()=>{const thread=threadRef.current;if(!thread)return;followThreadRef.current=true;thread.scrollTo({top:thread.scrollHeight,behavior:'smooth'});setShowJumpToLatest(false);};

  const queueTypewriter=(delta,sessionId)=>{
    let writer=typewritersRef.current.get(sessionId);
    if(!writer){writer={queue:'',finished:false,resolver:null,timer:null};typewritersRef.current.set(sessionId,writer);}
    writer.queue+=delta;
    if(writer.timer)return;
    writer.timer=window.setInterval(()=>{
      if(!writer.queue){window.clearInterval(writer.timer);writer.timer=null;if(writer.finished&&writer.resolver){const resolve=writer.resolver;writer.resolver=null;resolve();}return;}
      // Keep a visible cadence even when the provider sends one full assistant frame.
      const size=writer.queue.length>900?6:writer.queue.length>260?4:writer.queue.length>80?2:1;const chunk=writer.queue.slice(0,size);writer.queue=writer.queue.slice(size);
      setState(current=>({...current,sessions:current.sessions.map(session=>session.id===sessionId?{...session,messages:session.messages.map(message=>message.id===`streaming_${sessionId}`?{...message,content:message.content+chunk}:message)}:session)}));
    },14);
  };
  const waitForTyped=sessionId=>new Promise(resolve=>{const writer=typewritersRef.current.get(sessionId);if(!writer||(!writer.queue&&!writer.timer))return resolve();writer.finished=true;writer.resolver=resolve;});
  const setBusy=(sessionId,busy)=>setStreamingBySession(current=>({...current,[sessionId]:busy}));


  const active=byId(state.sessions,activeId);
  const draft=draftBySession[activeId]||'';
  const attachments=attachmentsBySession[activeId]||[];
  const error=errorBySession[activeId]||'';
  const liveInteractions=liveInteractionsBySession[activeId]||[];
  const artifactEvents=artifactEventsBySession[activeId]||{};
  const imageTasks=[...new Map([...(state.image_tasks||[]).filter(task=>task.session_id===activeId).map(task=>[task.id,task]),...Object.values(imageTasksBySession[activeId]||{}).map(task=>[task.id,task])]).values()];
  const imageGenerating=imageTasks.some(task=>['queued','generating'].includes(task.status));
  const streaming=Boolean(streamingBySession[activeId]);
  const activity=activityBySession[activeId]||null;
  const activityLog=activityLogBySession[activeId]||[];
  const waitingIndex=waitingIndexBySession[activeId]||0;
  const bot=displayBot(byId(state.bots,active?.workObjectId));
  const savedBotDraft=bot?{name:bot.name,intro:bot.intro,welcome:bot.welcome,tags:bot.tags,visibility:bot.visibility,cover:bot.cover,content:bot.content||'',voice:bot.voice,examples:bot.examples}:null;
  const botEditorDraft=bot?(botEditorDrafts[bot.id]||savedBotDraft):null;
  const botEditorDirty=bot&&JSON.stringify(botEditorDraft)!==JSON.stringify(savedBotDraft);
  const artifacts=(active?.artifactIds||[]).map(id=>byId(state.artifacts,id)).filter(artifact=>artifact&&!String(artifact.type||'').startsWith('bot_'));
  // The tab order in the resource zone is Bot editor first (when present), then
  // the Session artifacts in their stored order. Opening the zone itself should
  // always land on that first real tab; an empty zone deliberately has no selection.
  const firstResourceTabId=bot?`bot-editor:${bot.id}`:artifacts[0]?.id||null;
  const open=id=>{setActiveArtifact(id||firstResourceTabId||null);setArtifactBrowserOpen(true)};
  // Opening the resource zone is navigation, so it always selects the first
  // available tab instead of restoring an empty/stale selection.
  const openWorkspace=()=>{setActiveArtifact(firstResourceTabId);setArtifactBrowserOpen(true);setArtifactBrowserExpanded(false);};

  const createSession=async()=>{
    // A blank canvas is already the new conversation. Reuse it instead of
    // accumulating disposable Session records each time the user clicks New.
    const reusable=active&&!streamingBySession[active.id]&&!active.messages?.length&&!active.artifactIds?.length&&!active.interactions?.length&&!active.timeline?.length&&!active.workObjectId?active.id:null;
    try{const {session}=await api.createSession({reuseIfEmptySessionId:reusable});await reload(session.id);setActiveArtifact(null);setArtifactBrowserOpen(false);setArtifactBrowserExpanded(false);}catch(error){setErrorBySession(current=>({...current,[activeId||'workspace']:`无法新建对话：${error.message}。请确认本地 Agent 服务正在运行。`}));}
  };
  const beginRename=session=>{setRenameTarget(session);setRenameValue(session.title);};
  const renameSession=async()=>{const title=renameValue.trim();if(!renameTarget||!title)return;try{const {session}=await api.renameSession(renameTarget.id,title);await reload(session.id);setRenameTarget(null);}catch(error){setErrorBySession(current=>({...current,[activeId]:error.message}));}};
  const deleteSession=async()=>{if(!deleteTarget)return;const sessionId=deleteTarget.id;try{await api.deleteSession(sessionId);const writer=typewritersRef.current.get(sessionId);if(writer?.timer)window.clearInterval(writer.timer);typewritersRef.current.delete(sessionId);setStreamingBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});setActivityBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});setDraftBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});setErrorBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});setLiveInteractionsBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});setArtifactEventsBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});setImageTasksBySession(current=>{const {[sessionId]:_,...rest}=current;return rest});const next=await reload();if(activeId===sessionId){setActiveId(next.sessions[0]?.id||null);setArtifactBrowserOpen(false);setActiveArtifact(null);}setDeleteTarget(null);}catch(error){setErrorBySession(current=>({...current,[activeId]:error.message}));setDeleteTarget(null);}};
  const ensureSession=async()=>{
    if(active&&byId(state.sessions,active.id))return active;
    const {session}=await api.createSession();
    await reload(session.id);
    setActiveArtifact(null);setArtifactBrowserOpen(false);setArtifactBrowserExpanded(false);
    return session;
  };
  const createTextArtifact=async()=>{
    if(!active)return;
    const {artifact}=await api.createArtifact(active.id,{type:'text',title:'未命名文本页',description:'一个可在右侧继续编辑的文本工作页。',data:''});
    setState(s=>({...s,artifacts:[...s.artifacts,artifact],sessions:s.sessions.map(x=>x.id===active.id?{...x,artifactIds:[...x.artifactIds,artifact.id]}:x)}));
    open(artifact.id);
  };
  const clearWorkObject=async()=>{
    if(!active)return;
    try{await api.setWorkObject(active.id,null);await reload(active.id);setActiveArtifact(null);setArtifactBrowserOpen(false);setArtifactBrowserExpanded(false);}catch(error){setErrorBySession(current=>({...current,[active.id]:error.message}));}
  };
  const showBotEditor=botId=>{
    if(!botId)return;
    // Bot 编辑 is the first and only Bot work tab. Always select it explicitly:
    // do not rely on a previous Artifact selection or an async activeId update.
    setActiveArtifact(`bot-editor:${botId}`);
    setArtifactBrowserOpen(true);
    setArtifactBrowserExpanded(false);
  };
  const openBotWorkspace=async(sessionId,selectedBot,{setWorkObject=false,openEditor=false}={})=>{
    // Selecting a Bot must not manufacture empty per-section Artifacts.
    if(!sessionId||!selectedBot?.id)return;
    if(setWorkObject)await api.setWorkObject(sessionId,selectedBot.id);
    await reload(sessionId);
    if(openEditor){showBotEditor(selectedBot.id);setBotLibraryOpen(false);}
  };
  const chooseBot=async selectedBot=>{
    try{const session=await ensureSession();await openBotWorkspace(session.id,selectedBot,{setWorkObject:true,openEditor:true});}
    catch(error){setErrorBySession(current=>({...current,[active?.id||'workspace']:error.message}));}
  };
  const deleteBot=async()=>{if(!deleteBotTarget)return;const botId=deleteBotTarget.id;try{await api.deleteBot(botId);await reload();if(active?.workObjectId===botId){setActiveArtifact(null);setArtifactBrowserOpen(false);setArtifactBrowserExpanded(false);}setDeleteBotTarget(null);}catch(error){setErrorBySession(current=>({...current,[activeId]:error.message}));setDeleteBotTarget(null);}};
  const createBot=async()=>{
    try{
      const session=await ensureSession();
      const {bot:created}=await api.createBot({basic:{name:'未命名 Bot',intro:'',tags:[]},content:'',advanced:{voice:'',examples:''}});
      await api.setWorkObject(session.id,created.id);
      // A Bot has one unified editor, split into sections inside the editor.
      // Do not create legacy per-section Artifacts: they duplicate the UI tabs.
      await reload(session.id);showBotEditor(created.id);setBotLibraryOpen(false);
    }catch(error){setErrorBySession(current=>({...current,[active?.id||'workspace']:error.message}));}
  };
  const receiveToolEvent=(event,sessionId,localTurnKey)=>{
    // Never attach late events from an older SSE stream to a newer reply in the same Session.
    if(localTurnKey&&liveTurnRef.current.get(sessionId)!==localTurnKey)return;
    if(event.type==='activity'){
      const item={...event.payload,updated_at:Date.now()};
      // Business CRUD/tool plumbing belongs in Langfuse, not in the chat status.
      if(!['skill','reference','web'].includes(item.kind))return;
      setActivityBySession(current=>({...current,[sessionId]:['started','running'].includes(item.state)?item:null}));
      setActivityLogBySession(current=>{const previous=current[sessionId]||[];const index=previous.findIndex(entry=>entry.id===item.id);const next=index<0?[...previous,item]:previous.map((entry,entryIndex)=>entryIndex===index?{...entry,...item}:entry);return {...current,[sessionId]:next.slice(-8)}});
    }
    if(event.type==='interaction')setLiveInteractionsBySession(current=>({...current,[sessionId]:[...(current[sessionId]||[]),event.payload]}));
    if(event.type==='bot'&&event.payload?.bot){
      const bot=event.payload.bot;
      // Agent-created Bots are immediately usable in the composer. Keep this
      // local state in sync before the SSE turn finishes and reload() runs.
      setState(current=>({...current,
        bots:current.bots.some(item=>item.id===bot.id)?current.bots.map(item=>item.id===bot.id?{...item,...bot,basic:{...(item.basic||{}),...(bot.basic||{})},advanced:{...(item.advanced||{}),...(bot.advanced||{})}}:item):[bot,...current.bots],
        sessions:current.sessions.map(session=>session.id===sessionId&&event.payload.work_object?{...session,workObjectId:event.payload.work_object}:session),
      }));
      // Search/update/create resolved a concrete Bot. Fill the composer and make
      // its three editable business pages immediately available in the right rail.
      if(event.payload.work_object)void openBotWorkspace(sessionId,bot).catch(error=>setErrorBySession(current=>({...current,[sessionId]:error.message})));
    }
    if(event.type==='workspace')setState(current=>({...current,sessions:current.sessions.map(session=>session.id===sessionId?{...session,workObjectId:event.payload?.work_object||null}:session)}));
    if(event.type==='artifact'&&event.payload.artifact){const artifact=event.payload.artifact;setArtifactEventsBySession(current=>({...current,[sessionId]:{...(current[sessionId]||{}),[artifact.id]:artifact}}));}
    if(event.type==='image_task'&&event.payload.task){
      // The callback arrives before the final assistant message is persisted.
      // Attach it to this turn's live assistant placeholder immediately rather
      // than leaving it as an unanchored item at the bottom of the transcript.
      const task={...event.payload.task,after_message_id:event.payload.task.after_message_id||`streaming_${sessionId}`};
      setImageTasksBySession(current=>({...current,[sessionId]:{...(current[sessionId]||{}),[task.id]:task}}));
    }
  };
  const chooseInteraction=async(item,option)=>{
    if(streamingBySession[activeId]||item.status==='resolved')return;
    const response={option_id:option.id,title:option.title,description:option.description||''};
    try{
      const {interaction}=await api.resolveInteraction(active.id,item.id,response);
      // Update the canonical on-screen Session record immediately. Waiting for a
      // later /api/state refresh would leave the prior pending instance rendered.
      setState(current=>({...current,sessions:current.sessions.map(session=>session.id===active.id?{...session,interactions:(session.interactions||[]).map(entry=>entry.id===item.id?interaction:entry)}:session)}));
      setLiveInteractionsBySession(current=>({...current,[active.id]:(current[active.id]||[]).map(entry=>entry.id===item.id?interaction:entry)}));
      const text=item.type==='confirmation'?`我确认：${option.title}${option.description?`（${option.description}）`:''}`:`我选择「${option.title}」${option.description?`：${option.description}`:''}`;
      await send(text);
    }catch(error){setErrorBySession(current=>({...current,[activeId]:error.message}))}
  };
  const pickImages=async files=>{if(!active||streamingBySession[active.id])return;try{const additions=await Promise.all(files.slice(0,4).map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({id:`local_image_${Date.now()}_${Math.random()}`,name:file.name,mime_type:file.type,data_url:reader.result});reader.onerror=reject;reader.readAsDataURL(file)})));setAttachmentsBySession(current=>({...current,[active.id]:[...(current[active.id]||[]),...additions].slice(0,4)}));}catch(error){setErrorBySession(current=>({...current,[active.id]:error.message}));}};
  const removeAttachment=attachmentId=>setAttachmentsBySession(current=>({...current,[activeId]:(current[activeId]||[]).filter(item=>item.id!==attachmentId)}));
  const send=async value=>{
    const text=(value||draft).trim();
    if((!text&&!attachments.length)||!active)return;
    const sessionId=active.id;
    // State updates are async; the ref closes the small double-click / double-key
    // window before streamingBySession has re-rendered.
    if(streamingBySession[sessionId]||submittingSessionsRef.current.has(sessionId))return;
    submittingSessionsRef.current.add(sessionId);
    const sentAt=Date.now();
    const localTurnKey=`${sessionId}:${sentAt}`;
    liveTurnRef.current.set(sessionId,localTurnKey);
    typewritersRef.current.delete(sessionId);
    let uploaded=[];
    try{uploaded=await Promise.all(attachments.map(async attachment=>(await api.uploadImage(attachment)).attachment));}catch(error){setErrorBySession(current=>({...current,[sessionId]:error.message}));return;}
    // Activity rows are transient, turn-local progress.  Keeping the completed
    // rows in state made a new reply start with Skills from the previous turn.
    // Reset before the optimistic assistant placeholder is inserted, so every
    // turn can render only events received by its own SSE stream.
    setDraftBySession(current=>({...current,[sessionId]:''})); setAttachmentsBySession(current=>({...current,[sessionId]:[]})); setErrorBySession(current=>({...current,[sessionId]:''})); setWaitingIndexBySession(current=>({...current,[sessionId]:0})); setActivityBySession(current=>({...current,[sessionId]:null})); setActivityLogBySession(current=>({...current,[sessionId]:[]})); setBusy(sessionId,true);
    setState(s=>({...s,sessions:s.sessions.map(x=>x.id===sessionId?{...x,messages:[...x.messages,{id:`local_${sentAt}`,role:'user',content:text,attachments:uploaded,created_at:new Date(sentAt).toISOString()},{id:`streaming_${sessionId}`,role:'assistant',content:'',created_at:new Date(sentAt+1).toISOString()}]}:x)}));
    try{
      await streamMessage(sessionId,text,uploaded,{
        onStatus:()=>setBusy(sessionId,true),
        onEvent:event=>receiveToolEvent(event,sessionId,localTurnKey),
        onDelta:delta=>queueTypewriter(delta,sessionId),
        onDone:async()=>{await waitForTyped(sessionId);liveTurnRef.current.delete(sessionId);submittingSessionsRef.current.delete(sessionId);setActivityBySession(current=>({...current,[sessionId]:null}));setActivityLogBySession(current=>({...current,[sessionId]:[]}));setBusy(sessionId,false);await reload()},
        onError:message=>{liveTurnRef.current.delete(sessionId);submittingSessionsRef.current.delete(sessionId);const writer=typewritersRef.current.get(sessionId);if(writer?.timer)window.clearInterval(writer.timer);typewritersRef.current.delete(sessionId);setActivityBySession(current=>({...current,[sessionId]:null}));setActivityLogBySession(current=>({...current,[sessionId]:[]}));setBusy(sessionId,false);setErrorBySession(current=>({...current,[sessionId]:message}))},
      });
    }catch(e){
      liveTurnRef.current.delete(sessionId);
      submittingSessionsRef.current.delete(sessionId);
      const writer=typewritersRef.current.get(sessionId);if(writer?.timer)window.clearInterval(writer.timer);typewritersRef.current.delete(sessionId);setActivityBySession(current=>({...current,[sessionId]:null}));setBusy(sessionId,false);setErrorBySession(current=>({...current,[sessionId]:e.message}));
      setState(s=>({...s,sessions:s.sessions.map(x=>x.id===sessionId?{...x,messages:x.messages.filter(m=>m.id!==`streaming_${sessionId}`)}:x)}));
    }
  };
  const stop=async()=>{
    if(!activeId||!streamingBySession[activeId])return;
    try{await api.cancelTurn(activeId);}
    catch(error){
      // A restarted server no longer has the in-memory controller. Do not leave
      // the client locked just because an old stream cannot be cancelled.
      if(error.message==='session_not_running')clearLocalTurn(activeId,'上一轮生成已不在运行，现已恢复输入。');
      else setErrorBySession(current=>({...current,[activeId]:error.message}));
    }
  };
  const updateArtifact=async(id,patch)=>{const {artifact}=await api.updateArtifact(id,patch);setState(s=>({...s,artifacts:s.artifacts.map(a=>a.id===id?artifact:a)}))};
  const updateBotEditor=(key,value)=>{if(!bot)return;setBotEditorDrafts(current=>({...current,[bot.id]:{...(current[bot.id]||savedBotDraft),[key]:value}}));};
  const revertBotEditor=()=>{if(bot)setBotEditorDrafts(current=>{const {[bot.id]:_,...rest}=current;return rest});};
  const saveBotEditor=async()=>{
    if(!bot||!botEditorDirty)return;
    const draft=botEditorDraft;
    try{const {bot:updated}=await api.updateBot(bot.id,[
      {area:'basic',operation:'replace',value:{...byId(state.bots,bot.id).basic,name:draft.name,intro:draft.intro,welcome:draft.welcome,tags:draft.tags,visibility:draft.visibility,cover_url:draft.cover},reason:'保存 Bot 编辑页修改'},
      {area:'content',operation:'replace',value:draft.content,reason:'保存 Bot 编辑页修改'},
      {area:'advanced',operation:'replace',value:{...byId(state.bots,bot.id).advanced,voice:draft.voice,examples:draft.examples},reason:'保存 Bot 编辑页修改'},
    ]);
      const saved={name:updated.basic?.name||'未命名 Bot',intro:updated.basic?.intro||'',welcome:updated.basic?.welcome||'',tags:updated.basic?.tags||[],visibility:updated.basic?.visibility||'public',cover:updated.basic?.cover_url||'',content:updated.content||'',voice:updated.advanced?.voice||'',examples:updated.advanced?.examples||''};
      setState(current=>({...current,bots:current.bots.map(item=>item.id===updated.id?updated:item)}));
      // Advance the editor baseline only after the server confirms the write.
      // Subsequent edits can always be reverted to this exact saved snapshot.
      setBotEditorDrafts(current=>({...current,[updated.id]:saved}));
    }catch(error){setErrorBySession(current=>({...current,[activeId]:error.message}));}
  };

  const setImageAsCover=url=>{
    if(!bot||!url)return;
    // Selecting a generated image stages it in this Bot's local editor draft;
    // immediately reveal that exact draft in the right panel so the user can
    // inspect it and decide whether to save.
    setBotEditorDrafts(current=>({...current,[bot.id]:{...(current[bot.id]||savedBotDraft),cover:url}}));
    setActiveArtifact(`bot-editor:${bot.id}`);
    setArtifactBrowserOpen(true);
    setArtifactBrowserExpanded(false);
    setErrorBySession(current=>({...current,[activeId]:''}));
  };

  // A live SSE update with the same ID supersedes the persisted snapshot.
  const interactionById=new Map((active?.interactions||[]).map(item=>[item.id,item]));
  for(const interaction of liveInteractions)interactionById.set(interaction.id,interaction);
  const interactionList=[...interactionById.values()];
  // During the brief optimistic-to-persisted handoff, server and local copies can
  // coexist. Canonical messages win; identical local copies never render twice.
  const renderedMessages=(active?.messages||[]).filter((message,index,messages)=>{
    if(!String(message.id).startsWith('local_'))return true;
    return !messages.some(other=>other.role===message.role&&!String(other.id).startsWith('local_')&&other.content===message.content&&Math.abs(Date.parse(other.created_at||0)-Date.parse(message.created_at||0))<15000);
  });
  const interactionsAfter=(message,index)=>interactionList.filter(interaction=>{
    if(interaction.after_message_id)return interaction.after_message_id===message.id;
    if(message.role!=='assistant')return false;
    const messageTime=Date.parse(message.created_at||0); const previousTime=Date.parse(renderedMessages[index-1]?.created_at||0);
    const interactionTime=Date.parse(interaction.created_at||0);
    return interactionTime<=messageTime&&interactionTime>=previousTime;
  });
  const sessions=state.sessions.map(s=>({...s,updatedAt:new Date(s.updated_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}));

  if(initialLoad!=='ready')return <main className="workspace-connection" role={initialLoad==='error'?'alert':'status'} aria-live="polite"><div className="workspace-connection-mark"><Sparkles size={20}/></div><span>EMOCHI CREATIVE AGENT</span><h1>{initialLoad==='error'?'暂时无法连接服务':'正在加载你的创作空间'}</h1><p>{initialLoad==='error'?'无法读取对话和 Bot 数据。请检查线上 Agent 服务、同源 /api 路由和持久数据卷后重试。':'正在读取你的对话、Bot 和创作资源…'}</p>{initialLoad==='error'&&<button type="button" onClick={()=>void loadWorkspace()}>重新连接</button>}</main>;

  return <div style={{'--artifact-rail-width':`${artifactWidth}px`}} className={`workspace ${botLibraryOpen?'with-bot-library':''} ${artifactBrowserOpen?'with-artifact-browser':''} ${artifactBrowserExpanded?'artifact-browser-expanded':''} ${resizingArtifact?'is-resizing-artifact':''}`}>
    <ConversationSidebar sessions={sessions} activeId={activeId} onSelect={id=>{followThreadRef.current=true;setShowJumpToLatest(false);setActiveId(id);setActiveArtifact(null);setArtifactBrowserOpen(false)}} onCreate={createSession} onRename={beginRename} onDelete={setDeleteTarget} onOpenBots={()=>setBotLibraryOpen(true)}/>
    <main>
      {active?<>
        <WorkspaceHeader bot={bot} onOpenWorkspace={openWorkspace}/>
        {error&&<div className="runtime-error">{error}</div>}
        <section ref={threadRef} onScroll={handleThreadScroll} className={'thread '+(active.messages.length||streaming||(active.interactions||[]).length||liveInteractions.length?'':'thread-empty')}>
          {!active.messages.length&&!streaming&&!(active.interactions||[]).length&&!liveInteractions.length&&<div className="conversation-starter"><div className="starter-mark"><Sparkles size={20}/></div><span>EMOCHI CREATIVE AGENT</span><h2>从一个念头，开始创造</h2><p>把一个模糊的念头，慢慢做成有生命力、可持续发展的 Bot。</p><div className="starter-cards"><button onClick={()=>send('给我点灵感')}><b>给我点灵感</b><small>从一个模糊念头，找到可创作的方向</small><i>↗</i></button><button onClick={()=>send('做一个黑手党男主 Bot')}><b>做一个黑手党男主 Bot</b><small>危险、克制，却让人无法抽身</small><i>↗</i></button><button onClick={()=>send('做一个王室恋爱游戏')}><b>做一个王室恋爱游戏</b><small>礼仪、权谋与心动交错的选择</small><i>↗</i></button></div></div>}
          {renderedMessages.flatMap((message,index)=>[<article key={message.id} className={`message ${message.role==='user'?'user':''} ${message.id===`streaming_${activeId}`?'is-streaming':''}`}><span>{message.role==='user'?'你':<><Bot size={14}/>Emochi Agent</>}{message.role==='assistant'&&<TraceIdCopy traceId={message.trace_id}/>}</span>{message.content?.trim()&&<Markdown>{message.content}</Markdown>}{message.id===`streaming_${activeId}`&&<AgentRunStatus activityLog={activityLog} waitingText={activity?.label||WAITING_MESSAGES[waitingIndex]} hasVisibleContent={Boolean(message.content?.trim())}/>} {message.attachments?.length>0&&<div className="message-images">{message.attachments.map(attachment=><img key={attachment.id} src={attachment.url} alt={attachment.name}/>)}</div>}</article>,...interactionsAfter(message,index).map(interaction=><Interaction item={interaction} key={interaction.id} onChoose={chooseInteraction} disabled={Boolean(streaming)}/>),...imageTasks.filter(task=>task.after_message_id===message.id).map(task=><ImageTaskCard key={task.id} task={task} onPreview={setPreviewImage} onSetCover={setImageAsCover} canSetCover={Boolean(bot)} onCompleted={()=>reload(activeId).catch(()=>{})}/>),...(active.timeline||[]).filter(event=>event.kind==='artifact'&&event.after_message_id===message.id&&!['bot_basic','bot_content','bot_advanced','image'].includes(String(byId(state.artifacts,event.artifactId)?.type||''))&&byId(state.artifacts,event.artifactId)).map(event=><ArtifactCard key={event.id} artifact={byId(state.artifacts,event.artifactId)} onOpen={()=>open(event.artifactId)}/>)] )}
          {(active.timeline||[]).filter(event=>event.kind==='artifact'&&!event.after_message_id&&!['bot_basic','bot_content','bot_advanced','image'].includes(String(byId(state.artifacts,event.artifactId)?.type||''))&&byId(state.artifacts,event.artifactId)).map(event=><ArtifactCard key={event.id} artifact={byId(state.artifacts,event.artifactId)} onOpen={()=>open(event.artifactId)}/>)}
          {Object.values(artifactEvents).filter(artifact=>!['bot_basic','bot_content','bot_advanced','image'].includes(String(artifact.type||''))&&!active.timeline?.some(event=>event.kind==='artifact'&&event.artifactId===artifact.id)).map(artifact=><ArtifactCard key={'live_'+artifact.id} artifact={artifact} onOpen={()=>open(artifact.id)}/>)}
          {imageTasks.filter(task=>!task.after_message_id).map(task=><ImageTaskCard key={task.id} task={task} onPreview={setPreviewImage} onSetCover={setImageAsCover} canSetCover={Boolean(bot)} onCompleted={()=>reload(activeId).catch(()=>{})}/>)}
          {showJumpToLatest&&<div className="jump-to-latest-wrap"><button type="button" className="jump-to-latest" onClick={jumpToLatest}><ArrowDown size={14}/>回到最新消息</button></div>}
        </section>
        <Composer value={draft} onStop={stop} onChange={value=>setDraftBySession(current=>({...current,[activeId]:value}))} onSend={send} busy={Boolean(streaming)} attachments={attachments} onPickImages={pickImages} onRemoveAttachment={removeAttachment} context={<BotContextBar bot={bot} onOpenBots={()=>setBotLibraryOpen(true)} onOpenEditor={()=>showBotEditor(bot?.id)} onClear={clearWorkObject}/>}/>
      </>:<section className="workspace-welcome"><div className="welcome-orbit"><Sparkles size={22}/></div><h1>今天，想创作什么？</h1><p>从一个模糊的念头开始。你可以探索角色、世界、互动故事，或直接继续完善一个 Bot。</p><div className="idea-grid"><button onClick={()=>{createSession()}}><span>✦</span><b>从一个角色开始</b><small>人物关系、动机和可互动的性格</small></button><button onClick={()=>{createSession()}}><span>◌</span><b>构建一个世界</b><small>规则、氛围与值得进入的场景</small></button><button onClick={()=>{createSession()}}><span>↗</span><b>做一段互动故事</b><small>从设定到分支，逐步搭建体验</small></button></div><button className="quiet-new-session" onClick={createSession}><Check size={15}/>或新建一段空白对话</button></section>}
    </main>
    {botLibraryOpen&&<BotLibrary bots={state.bots.map(displayBot)} currentBotId={active?.workObjectId} onClose={()=>setBotLibraryOpen(false)} onCreate={createBot} onSelect={chooseBot} onDelete={setDeleteBotTarget}/>}
    {renameTarget&&<div className="modal-backdrop"><section className="session-modal" role="dialog" aria-modal="true" aria-labelledby="rename-title"><span className="modal-kicker">重命名对话</span><h2 id="rename-title">给这段对话换个名字</h2><input autoFocus value={renameValue} onChange={event=>setRenameValue(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')renameSession();if(event.key==='Escape')setRenameTarget(null);}} maxLength={80}/><div className="modal-actions"><button onClick={()=>setRenameTarget(null)}>取消</button><button className="modal-primary" disabled={!renameValue.trim()} onClick={renameSession}>保存名称</button></div></section></div>}
    {deleteTarget&&<div className="modal-backdrop"><section className="session-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><span className="modal-kicker danger">删除对话</span><h2 id="delete-title">确认删除「{deleteTarget.title}」？</h2><p>这会永久删除该对话的消息、选择记录和关联的工作页引用。此操作无法撤销。</p><div className="modal-actions"><button onClick={()=>setDeleteTarget(null)}>取消</button><button className="modal-danger" onClick={deleteSession}>确认删除</button></div></section></div>}
    {deleteBotTarget&&<div className="modal-backdrop"><section className="session-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-bot-title"><span className="modal-kicker danger">删除 Bot</span><h2 id="delete-bot-title">确认删除「{deleteBotTarget.name}」？</h2><p>这会删除该 Bot 的基础信息、内容设定和高级设置；不会删除任何 Session 的对话记录。此操作无法撤销。</p><div className="modal-actions"><button onClick={()=>setDeleteBotTarget(null)}>取消</button><button className="modal-danger" onClick={deleteBot}>确认删除</button></div></section></div>}
    {artifactBrowserOpen&&<RightViewer artifacts={artifacts} activeArtifact={activeArtifact} onOpen={open} onClose={id=>setActiveArtifact(a=>a===id?null:a)} onCloseBrowser={()=>{setArtifactBrowserOpen(false);setArtifactBrowserExpanded(false)}} expanded={artifactBrowserExpanded} onToggleExpand={()=>setArtifactBrowserExpanded(value=>!value)} onResizeStart={()=>!artifactBrowserExpanded&&setResizingArtifact(true)} bot={bot} botDraft={botEditorDraft} botDirty={botEditorDirty} onBotChange={updateBotEditor} onSaveBot={saveBotEditor} onRevertBot={revertBotEditor} onUpdate={updateArtifact} onCreateText={createTextArtifact} onPreviewImage={setPreviewImage} onSetCover={setImageAsCover}/>}
    {previewImage&&<div className="image-lightbox" role="dialog" aria-modal="true" aria-label="图片大图预览" onClick={()=>setPreviewImage(null)}><button type="button" aria-label="关闭大图预览" onClick={()=>setPreviewImage(null)}><X size={19}/></button><img src={previewImage} alt="大图预览" onClick={event=>event.stopPropagation()}/></div>}
  </div>;
}
