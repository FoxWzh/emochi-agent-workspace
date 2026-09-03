import {FolderOpen,Menu} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api,streamMessage} from './lib/api';
import {ConversationHistory} from './components/ConversationHistory';
import {ResourceSheet} from './components/ResourceSheet';
import {BotSwitcher} from './components/BotSwitcher';
import {Composer} from './components/Composer';
import {MessageFeed} from './components/MessageFeed';
import './styles/mobile.css';

const botName=bot=>bot?.basic?.name||'自由探索';

function App(){
  const [state,setState]=useState(null);
  const [activeSessionId,setActiveSessionId]=useState(null);
  // A Bot can be picked before the first message without creating an empty server Session.
  const [draftBotId,setDraftBotId]=useState(null);
  const [botOpen,setBotOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [resourcesOpen,setResourcesOpen]=useState(false);
  const [text,setText]=useState('');
  const [file,setFile]=useState(null);
  const [busy,setBusy]=useState(false);
  const [streamingText,setStreamingText]=useState('');
  const [error,setError]=useState('');
  const session=state?.sessions?.find(item=>item.id===activeSessionId)||null;
  const selectedBotId=session?.workObjectId??draftBotId;
  const bot=useMemo(()=>state?.bots?.find(item=>item.id===selectedBotId),[state,selectedBotId]);
  const reload=async()=>{try{setState(await api.state());setError('')}catch(cause){setError(cause.message)}};
  useEffect(()=>{void reload()},[]);

  const selectSession=id=>{const next=state?.sessions?.find(item=>item.id===id);setActiveSessionId(id);setDraftBotId(next?.workObjectId||null);setHistoryOpen(false);setText('');setFile(null);setStreamingText('')};
  // "New conversation" intentionally remains local until the user sends their
  // first message; this avoids shared empty Sessions under concurrent visitors.
  const startNewConversation=()=>{setActiveSessionId(null);setDraftBotId(null);setHistoryOpen(false);setText('');setFile(null);setStreamingText('');setBotOpen(false);setResourcesOpen(false)};
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
  const updateArtifact=async(id,patch)=>{try{await api.updateArtifact(id,patch);await reload()}catch(cause){setError(cause.message)}};
  const stop=async()=>{if(!session||!busy)return;try{await api.cancelTurn(session.id)}catch(cause){if(cause.message!=='session_not_running')setError(cause.message)}};
  const deleteSession=async id=>{try{await api.deleteSession(id);if(id===session?.id)startNewConversation();await reload()}catch(cause){setError(cause.message)}};
  const respondInteraction=async(item,option)=>{if(!session||busy)return;try{await api.resolveInteraction(session.id,item.id,{option_id:option.id,title:option.title,description:option.description||''});await reload();const text=item.type==='confirmation'?`我确认：${option.title}${option.description?`（${option.description}）`:''}`:`我选择「${option.title}」${option.description?`：${option.description}`:''}`;setText('');void send(text)}catch(cause){setError(cause.message)}};
  const selectBot=async id=>{try{
    // Do not create an empty Session merely to choose a Bot. Persist the choice
    // only when there is an active conversation; otherwise retain it locally.
    setDraftBotId(id);
    if(session){await api.setWorkObject(session.id,id);await reload()}
    setBotOpen(false);
  }catch(cause){setError(cause.message)}};
  const pickFile=selected=>{if(selected)setFile({file:selected,name:selected.name,preview:URL.createObjectURL(selected)})};
  const send=async forcedText=>{
    // React passes a MouseEvent to an onClick handler. Only a string is an
    // explicit forced message; otherwise send the composer state.
    const outgoing=(typeof forcedText==='string'?forcedText:text).trim();
    if(busy||(!outgoing&&!file))return;
    setBusy(true);setError('');
    try{
      const target=await ensureSession();
      let attachments=[];
      if(file){
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file.file)});
        const upload=await api.uploadImage({name:file.name,mime_type:file.file.type,data_url:data});
        attachments=[upload.attachment||upload];
      }
      const sentText=outgoing;
      setText('');setFile(null);setStreamingText('');
      await streamMessage(target.id,sentText,attachments,event=>{
        if(event.type==='delta')setStreamingText(current=>current+String(event.payload?.text||''));
        if(event.type==='done')void reload();
        if(event.type==='error')setError(event.payload?.message||'生成失败，请重试。');
      },()=>void reload());
      setStreamingText('');await reload();
    }catch(cause){setError(cause.message)}finally{setBusy(false)}
  };
  if(!state)return <main className="loading">正在连接 Emochi Agent…</main>;
  const artifacts=(state.artifacts||[]).filter(item=>session?.artifactIds?.includes(item.id));
  return <main className="mobile-app">
    <header className="mobile-header">
      <button className="current-bot" onClick={()=>setBotOpen(true)} aria-expanded={botOpen}>{botName(bot)} <small>⌄</small></button>
      <div><button onClick={()=>setResourcesOpen(true)} aria-label="打开资源区"><FolderOpen size={19}/></button><button onClick={()=>setHistoryOpen(true)} aria-label="打开历史对话"><Menu size={20}/></button></div>
    </header>
    {error&&<p className="runtime-error">{error}</p>}
    <section className={`thread ${session?.messages?.length?'has-messages':''}`}>{session?.messages?.length||streamingText||session?.interactions?.length?<MessageFeed messages={session?.messages||[]} streamingText={streamingText} interactions={session?.interactions||[]} onRespond={respondInteraction} busy={busy}/>:<div className="welcome"><i>✦</i><span>EMOCHI CREATIVE AGENT</span><h1>{session?session.title||'继续创作':'从一个念头，开始创造'}</h1><p>{session?'继续输入内容，或通过左上角切换正在编辑的 Bot。':'输入你想创作、修改或探索的内容；首条消息发送后会创建一段新的对话。'}</p></div>}</section>
    <Composer value={text} onChange={setText} file={file} onPick={pickFile} onRemove={()=>setFile(null)} onSend={send} onStop={stop} busy={busy}/>
    <ConversationHistory open={historyOpen} onClose={()=>setHistoryOpen(false)} sessions={state.sessions||[]} currentId={session?.id} onSelect={selectSession} onCreate={startNewConversation} onDelete={deleteSession}/>
    <BotSwitcher open={botOpen} onClose={()=>setBotOpen(false)} bots={state.bots||[]} currentId={selectedBotId} onSelect={selectBot}/>
    <ResourceSheet open={resourcesOpen} onClose={()=>setResourcesOpen(false)} artifacts={artifacts} onUpdate={updateArtifact} bot={bot} onBotUpdated={updateBot}/>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
