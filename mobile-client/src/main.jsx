import {ArrowDown,FolderOpen,Menu,X} from 'lucide-react';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api,streamMessage} from './lib/api';
import {ConversationHistory} from './components/ConversationHistory';
import {ResourceSheet} from './components/ResourceSheet';
import {BotSwitcher} from './components/BotSwitcher';
import {Composer} from './components/Composer';
import {MessageFeed} from './components/MessageFeed';
import {DeleteSessionDialog,RenameSessionDialog} from './components/SessionDialogs';
import './styles/mobile.css';

const botName=bot=>bot?.basic?.name||'自由探索';
const terminalTask=status=>['completed','failed','cancelled'].includes(status);

function App(){
  const [state,setState]=useState(null);
  const [loadStatus,setLoadStatus]=useState('loading');
  const [activeSessionId,setActiveSessionId]=useState(null);
  // A Bot can be picked before the first message without creating an empty server Session.
  const [draftBotId,setDraftBotId]=useState(null);
  const [botOpen,setBotOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [resourcesOpen,setResourcesOpen]=useState(false);
  const [text,setText]=useState('');
  const [files,setFiles]=useState([]);
  const [busy,setBusy]=useState(false);
  const [streamingText,setStreamingText]=useState('');
  const [activityLog,setActivityLog]=useState([]);
  const [error,setError]=useState('');
  const [renameTarget,setRenameTarget]=useState(null);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [dialogBusy,setDialogBusy]=useState(false);
  const [previewImage,setPreviewImage]=useState(null);
  const [coverCandidate,setCoverCandidate]=useState(null);
  const [showJumpToLatest,setShowJumpToLatest]=useState(false);
  const threadRef=useRef(null);
  const followThreadRef=useRef(true);
  const submittingRef=useRef(false);

  const session=state?.sessions?.find(item=>item.id===activeSessionId)||null;
  const selectedBotId=session?.workObjectId??draftBotId;
  const bot=useMemo(()=>state?.bots?.find(item=>item.id===selectedBotId),[state,selectedBotId]);
  const sortedSessions=useMemo(()=>[...(state?.sessions||[])].sort((a,b)=>Date.parse(b.updated_at||0)-Date.parse(a.updated_at||0)),[state?.sessions]);
  const imageTasks=useMemo(()=>(state?.image_tasks||[]).filter(task=>task.session_id===activeSessionId),[state?.image_tasks,activeSessionId]);
  const pendingTaskKey=imageTasks.filter(task=>!terminalTask(task.status)).map(task=>`${task.id}:${task.updated_at||''}`).join('|');

  const reload=async()=>{
    try{
      const next=await api.state();
      setState(next);
      setLoadStatus('ready');
      setError('');
      return next;
    }catch(cause){
      setError(cause.message);
      setLoadStatus(current=>state?current:'error');
      return null;
    }
  };
  useEffect(()=>{void reload()},[]);
  useEffect(()=>{
    if(!previewImage)return;
    const close=event=>{if(event.key==='Escape')setPreviewImage(null)};
    window.addEventListener('keydown',close);
    return()=>window.removeEventListener('keydown',close);
  },[previewImage]);
  useEffect(()=>{
    if(!activeSessionId||!pendingTaskKey)return;
    let cancelled=false;
    const tasks=imageTasks.filter(task=>!terminalTask(task.status));
    const poll=async()=>{
      for(const task of tasks){
        try{
          const next=await api.imageTask(task.id);
          if(cancelled)return;
          setState(current=>({...current,image_tasks:[...(current.image_tasks||[]).filter(item=>item.id!==next.id),next]}));
          if(terminalTask(next.status))await reload();
        }catch{}
      }
    };
    void poll();
    const timer=window.setInterval(poll,2200);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[activeSessionId,pendingTaskKey]);
  useEffect(()=>{
    const thread=threadRef.current;
    if(!thread)return;
    if(followThreadRef.current){thread.scrollTop=thread.scrollHeight;setShowJumpToLatest(false)}
    else if(thread.scrollHeight-thread.scrollTop-thread.clientHeight>48)setShowJumpToLatest(true);
  },[activeSessionId,session?.messages,streamingText,session?.interactions,imageTasks]);

  const handleThreadScroll=()=>{
    const thread=threadRef.current;
    if(!thread)return;
    const nearBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<48;
    followThreadRef.current=nearBottom;
    setShowJumpToLatest(!nearBottom);
  };
  const jumpToLatest=()=>{
    const thread=threadRef.current;
    if(!thread)return;
    followThreadRef.current=true;
    thread.scrollTo({top:thread.scrollHeight,behavior:'smooth'});
    setShowJumpToLatest(false);
  };
  const resetComposer=()=>{setText('');setFiles([]);setStreamingText('');setActivityLog([])};
  const selectSession=id=>{
    if(busy)return;
    const next=state?.sessions?.find(item=>item.id===id);
    setActiveSessionId(id);
    setDraftBotId(next?.workObjectId||null);
    setHistoryOpen(false);
    resetComposer();
    followThreadRef.current=true;
  };
  // "New conversation" intentionally remains local until the user sends their
  // first message; this avoids shared empty Sessions under concurrent visitors.
  const startNewConversation=()=>{
    if(busy)return;
    setActiveSessionId(null);
    setDraftBotId(null);
    setHistoryOpen(false);
    resetComposer();
    setBotOpen(false);
    setResourcesOpen(false);
    followThreadRef.current=true;
  };
  const ensureSession=async()=>{
    if(session)return session;
    const {session:created}=await api.createSession();
    setActiveSessionId(created.id);
    await reload();
    if(draftBotId){
      await api.setWorkObject(created.id,draftBotId);
      await reload();
    }
    return created;
  };
  const updateBot=updated=>setState(current=>({...current,bots:current.bots.map(item=>item.id===updated.id?updated:item)}));
  const stageCover=url=>{
    if(!bot){setError('请先为当前对话选择一个 Bot。');return}
    setCoverCandidate(url);
    setResourcesOpen(true);
  };
  const closeResources=()=>{setResourcesOpen(false);setCoverCandidate(null)};
  const updateArtifact=async(id,patch)=>{try{await api.updateArtifact(id,patch);await reload()}catch(cause){setError(cause.message);throw cause}};
  const stop=async()=>{if(!session||!busy)return;try{await api.cancelTurn(session.id)}catch(cause){if(cause.message!=='session_not_running')setError(cause.message)}};
  const beginRename=target=>{setHistoryOpen(false);setRenameTarget(target)};
  const renameSession=async title=>{
    if(!renameTarget||dialogBusy)return;
    setDialogBusy(true);
    try{await api.renameSession(renameTarget.id,title);await reload();setRenameTarget(null)}
    catch(cause){setError(cause.message)}
    finally{setDialogBusy(false)}
  };
  const beginDelete=target=>{setHistoryOpen(false);setDeleteTarget(target)};
  const deleteSession=async()=>{
    if(!deleteTarget||dialogBusy)return;
    setDialogBusy(true);
    try{
      await api.deleteSession(deleteTarget.id);
      if(deleteTarget.id===session?.id)startNewConversation();
      await reload();
      setDeleteTarget(null);
    }catch(cause){setError(cause.message)}finally{setDialogBusy(false)}
  };
  const respondInteraction=async(item,option)=>{
    if(!session||busy)return;
    try{
      await api.resolveInteraction(session.id,item.id,{option_id:option.id,title:option.title,description:option.description||''});
      await reload();
      const responseText=item.type==='confirmation'?`我确认：${option.title}${option.description?`（${option.description}）`:''}`:`我选择「${option.title}」${option.description?`：${option.description}`:''}`;
      setText('');
      await send(responseText);
    }catch(cause){setError(cause.message)}
  };
  const selectBot=async id=>{try{
    if(busy)return;
    // Do not create an empty Session merely to choose a Bot. Persist the choice
    // only when there is an active conversation; otherwise retain it locally.
    setDraftBotId(id);
    if(session){await api.setWorkObject(session.id,id);await reload()}
    setBotOpen(false);
  }catch(cause){setError(cause.message)}};
  const pickFiles=async selected=>{
    const room=Math.max(0,4-files.length);
    if(!room)return;
    try{
      const additions=await Promise.all(selected.slice(0,room).map(file=>new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve({id:`local_${Date.now()}_${Math.random()}`,file,name:file.name,mime_type:file.type,data_url:reader.result});
        reader.onerror=reject;
        reader.readAsDataURL(file);
      })));
      setFiles(current=>[...current,...additions].slice(0,4));
    }catch(cause){setError(cause.message)}
  };
  const removeFile=id=>setFiles(current=>current.filter(item=>item.id!==id));
  const send=async forcedText=>{
    // React passes a MouseEvent to an onClick handler. Only a string is an
    // explicit forced message; otherwise send the composer state.
    const outgoing=(typeof forcedText==='string'?forcedText:text).trim();
    if(busy||submittingRef.current||(!outgoing&&!files.length))return;
    submittingRef.current=true;
    setBusy(true);
    setError('');
    setActivityLog([]);
    followThreadRef.current=true;
    let streamError='';
    try{
      const target=await ensureSession();
      const attachments=await Promise.all(files.map(async file=>{
        const upload=await api.uploadImage({name:file.name,mime_type:file.mime_type,data_url:file.data_url});
        return upload.attachment||upload;
      }));
      const sentText=outgoing;
      setText('');
      setFiles([]);
      setStreamingText('');
      await streamMessage(target.id,sentText,attachments,event=>{
        if(event.type==='delta')setStreamingText(current=>current+String(event.payload?.text||''));
        if(event.type==='activity'&&['skill','reference','web'].includes(event.payload?.kind))setActivityLog(current=>{const item=event.payload;const index=current.findIndex(entry=>entry.id===item.id);return (index<0?[...current,item]:current.map((entry,entryIndex)=>entryIndex===index?{...entry,...item}:entry)).slice(-5)});
        if(event.type==='image_task'&&event.payload?.task)setState(current=>({...current,image_tasks:[...(current.image_tasks||[]).filter(item=>item.id!==event.payload.task.id),event.payload.task]}));
        if(event.type==='done')void reload();
        if(event.type==='error')streamError=event.payload?.message||'生成失败，请重试。';
      },()=>void reload());
      setStreamingText('');
      await reload();
      if(streamError)setError(streamError);
    }catch(cause){setError(cause.message)}finally{setBusy(false);setActivityLog([]);submittingRef.current=false}
  };

  if(loadStatus!=='ready'||!state)return <main className="connection-state" role={loadStatus==='error'?'alert':'status'} aria-live="polite"><i>✦</i><span>EMOCHI CREATIVE AGENT</span><h1>{loadStatus==='error'?'暂时无法连接服务':'正在加载你的创作空间'}</h1><p>{loadStatus==='error'?(error||'无法读取对话和 Bot 数据。'):'正在读取你的对话、Bot 和创作资源…'}</p>{loadStatus==='error'&&<button type="button" onClick={()=>{setLoadStatus('loading');void reload()}}>重新连接</button>}</main>;
  const artifacts=(state.artifacts||[]).filter(item=>session?.artifactIds?.includes(item.id));
  return <main className="mobile-app">
    <header className="mobile-header">
      <button className="current-bot" disabled={busy} onClick={()=>setBotOpen(true)} aria-expanded={botOpen}>{botName(bot)} <small>⌄</small></button>
      <div><button onClick={()=>setResourcesOpen(true)} aria-label="打开资源区"><FolderOpen size={19}/></button><button onClick={()=>setHistoryOpen(true)} aria-label="打开历史对话"><Menu size={20}/></button></div>
    </header>
    {error&&<p className="runtime-error" role="alert">{error}</p>}
    <section ref={threadRef} onScroll={handleThreadScroll} className={`thread ${session?.messages?.length?'has-messages':''}`}>
      {session?.messages?.length||streamingText||session?.interactions?.length||imageTasks.length?<MessageFeed messages={session?.messages||[]} streamingText={streamingText} interactions={session?.interactions||[]} imageTasks={imageTasks} activityLog={activityLog} onRespond={respondInteraction} onPreviewImage={setPreviewImage} onSetCover={stageCover} canSetCover={Boolean(bot)} busy={busy}/>:<div className="welcome"><i>✦</i><span>EMOCHI CREATIVE AGENT</span><h1>{session?session.title||'继续创作':'从一个念头，开始创造'}</h1><p>{session?'继续输入内容，或通过左上角切换正在编辑的 Bot。':'输入你想创作、修改或探索的内容；首条消息发送后会创建一段新的对话。'}</p></div>}
      {showJumpToLatest&&<button type="button" className="jump-to-latest" onClick={jumpToLatest}><ArrowDown size={14}/>回到最新消息</button>}
    </section>
    <Composer value={text} onChange={setText} file={files} onPick={pickFiles} onRemove={removeFile} onSend={send} onStop={stop} busy={busy}/>
    <ConversationHistory open={historyOpen} onClose={()=>setHistoryOpen(false)} sessions={sortedSessions} currentId={session?.id} onSelect={selectSession} onCreate={startNewConversation} onRename={beginRename} onDelete={beginDelete}/>
    <BotSwitcher open={botOpen} onClose={()=>setBotOpen(false)} bots={state.bots||[]} currentId={selectedBotId} onSelect={selectBot}/>
    <ResourceSheet open={resourcesOpen} onClose={closeResources} artifacts={artifacts} onUpdate={updateArtifact} bot={bot} onBotUpdated={updateBot} onPreviewImage={setPreviewImage} coverCandidate={coverCandidate} onSetCover={stageCover} onCoverConsumed={()=>setCoverCandidate(null)}/>
    <RenameSessionDialog session={renameTarget} busy={dialogBusy} onClose={()=>setRenameTarget(null)} onSubmit={renameSession}/>
    <DeleteSessionDialog session={deleteTarget} busy={dialogBusy} onClose={()=>setDeleteTarget(null)} onConfirm={deleteSession}/>
    {previewImage&&<div className="image-lightbox" role="dialog" aria-modal="true" aria-label="图片大图预览" onClick={()=>setPreviewImage(null)}><button type="button" aria-label="关闭大图预览" onClick={()=>setPreviewImage(null)}><X size={20}/></button><img src={previewImage} alt="大图预览" onClick={event=>event.stopPropagation()}/></div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
