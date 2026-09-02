import {FolderOpen,Menu} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api,streamMessage} from './lib/api';
import {ConversationHistory} from './components/ConversationHistory';
import {BottomSheet} from './components/BottomSheet';
import {BotSwitcher} from './components/BotSwitcher';
import {Composer} from './components/Composer';
import './styles/mobile.css';

const botName=bot=>bot?.basic?.name||'自由探索';

function App(){
  const [state,setState]=useState(null);
  const [activeSessionId,setActiveSessionId]=useState(null);
  const [botOpen,setBotOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [resourcesOpen,setResourcesOpen]=useState(false);
  const [text,setText]=useState('');
  const [file,setFile]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const session=state?.sessions?.find(item=>item.id===activeSessionId)||null;
  const bot=useMemo(()=>state?.bots?.find(item=>item.id===session?.workObjectId),[state,session?.workObjectId]);
  const reload=async()=>{try{setState(await api.state());setError('')}catch(cause){setError(cause.message)}};
  useEffect(()=>{void reload()},[]);

  const selectSession=id=>{setActiveSessionId(id);setHistoryOpen(false);setText('');setFile(null)};
  // "New conversation" intentionally remains local until the user sends their
  // first message; this avoids shared empty Sessions under concurrent visitors.
  const startNewConversation=()=>{setActiveSessionId(null);setHistoryOpen(false);setText('');setFile(null);setBotOpen(false);setResourcesOpen(false)};
  const ensureSession=async()=>{
    if(session)return session;
    const {session:created}=await api.createSession();
    setActiveSessionId(created.id);
    await reload();
    return created;
  };
  const deleteSession=async id=>{try{await api.deleteSession(id);if(id===session?.id)startNewConversation();await reload()}catch(cause){setError(cause.message)}};
  const selectBot=async id=>{try{const target=await ensureSession();await api.setWorkObject(target.id,id);await reload();setBotOpen(false)}catch(cause){setError(cause.message)}};
  const pickFile=selected=>{if(selected)setFile({file:selected,name:selected.name,preview:URL.createObjectURL(selected)})};
  const send=async()=>{
    if(busy||(!text.trim()&&!file))return;
    setBusy(true);setError('');
    try{
      const target=await ensureSession();
      let attachments=[];
      if(file){
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file.file)});
        const upload=await api.uploadImage({name:file.name,mime_type:file.file.type,data_url:data});
        attachments=[upload.attachment||upload];
      }
      await streamMessage(target.id,text.trim(),attachments,event=>{if(event.type==='done')void reload()});
      setText('');setFile(null);await reload();
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
    <section className="thread"><div className="welcome"><i>✦</i><span>EMOCHI CREATIVE AGENT</span><h1>{session?session.title||'继续创作':'从一个念头，开始创造'}</h1><p>{session?'继续输入内容，或通过左上角切换正在编辑的 Bot。':'输入你想创作、修改或探索的内容；首条消息发送后会创建一段新的对话。'}</p></div></section>
    <Composer value={text} onChange={setText} file={file} onPick={pickFile} onRemove={()=>setFile(null)} onSend={send} busy={busy}/>
    <ConversationHistory open={historyOpen} onClose={()=>setHistoryOpen(false)} sessions={state.sessions||[]} currentId={session?.id} onSelect={selectSession} onCreate={startNewConversation} onDelete={deleteSession}/>
    <BotSwitcher open={botOpen} onClose={()=>setBotOpen(false)} bots={state.bots||[]} currentId={session?.workObjectId} onSelect={selectBot}/>
    <BottomSheet open={resourcesOpen} title="资源区" onClose={()=>setResourcesOpen(false)}><div className="resource-list">{!session?<p>新对话还没有资源。发送第一条消息后，这里会显示该对话的创作成果。</p>:artifacts.length?artifacts.map(item=><article key={item.id}><i>▧</i><span><b>{item.title}</b><small>{item.type==='image_library'?'图片资源':'文本 · 可继续查看和编辑'}</small></span></article>):<p>还没有资源。对话中生成的图片、文本和 Bot 内容会出现在这里。</p>}</div></BottomSheet>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
