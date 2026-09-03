import {Bot,ChevronDown,ChevronUp,Image as ImageIcon,LoaderCircle} from 'lucide-react';
import {useEffect,useState} from 'react';

function inlineMarkdown(value){
  const parts=String(value||'').split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('`')&&part.endsWith('`')?<code key={index}>{part.slice(1,-1)}</code>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:part);
}

const tableCells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
const tableSeparator=line=>/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

function Markdown({children}){
  const lines=String(children||'').split('\n');
  const blocks=[];
  let list=[];
  let listType='ul';
  const flush=()=>{if(list.length){const Tag=listType;blocks.push(<Tag key={`list_${blocks.length}`}>{list.map((line,index)=><li key={index}>{inlineMarkdown(line)}</li>)}</Tag>);list=[]}};
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    const next=lines[index+1];
    if(line.includes('|')&&next&&tableSeparator(next)){
      flush();
      const headers=tableCells(line);
      const rows=[];
      index+=2;
      while(index<lines.length&&lines[index].includes('|')&&lines[index].trim()){rows.push(tableCells(lines[index]));index++}
      index--;
      blocks.push(<div className="message-table" key={`table_${blocks.length}`}><table><thead><tr>{headers.map((header,column)=><th key={column}>{inlineMarkdown(header)}</th>)}</tr></thead><tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{headers.map((_,column)=><td key={column}>{inlineMarkdown(row[column]||'')}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const unordered=line.match(/^[-*]\s+(.+)/);
    const ordered=line.match(/^\d+[.)]\s+(.+)/);
    if(unordered||ordered){const nextType=ordered?'ol':'ul';if(list.length&&nextType!==listType)flush();listType=nextType;list.push((unordered||ordered)[1]);continue}
    flush();
    if(!line.trim())continue;
    const heading=line.match(/^(#{1,3})\s+(.+)/);
    if(heading){const Tag=`h${heading[1].length}`;blocks.push(<Tag key={`heading_${blocks.length}`}>{inlineMarkdown(heading[2])}</Tag>)}
    else if(line.startsWith('> '))blocks.push(<blockquote key={`quote_${blocks.length}`}>{inlineMarkdown(line.slice(2))}</blockquote>);
    else blocks.push(<p key={`paragraph_${blocks.length}`}>{inlineMarkdown(line)}</p>);
  }
  flush();
  return <div className="message-text">{blocks}</div>;
}

function taskImages(task){
  return (task.artifacts||[]).flatMap(artifact=>{
    const batches=Array.isArray(artifact.data?.batches)?artifact.data.batches:[];
    const batch=batches.find(item=>item.id===task.id);
    if(batch?.images)return batch.images;
    if(Array.isArray(artifact.data?.images))return artifact.data.images;
    return artifact.data?.url?[{id:artifact.id,title:artifact.title,url:artifact.data.url}]:[];
  });
}

function ImageTaskCard({task,onPreview,onSetCover,canSetCover}){
  const loading=['queued','generating'].includes(task.status);
  const images=taskImages(task);
  const placeholders=Math.min(4,Math.max(1,Number(task.count)||4));
  return <section className={`mobile-image-task ${loading?'is-loading':''}`}>
    <header><span>{loading?<LoaderCircle size={15}/>:<ImageIcon size={15}/>}</span><div><b>{task.title||'图片生成任务'}</b><small>{loading?'正在生成图片…':task.status==='failed'?(task.error?.message||'图片生成失败。'):task.status==='completed'?`已生成 ${images.length} 张候选图片。`:'图片任务已结束。'}</small></div></header>
    {loading&&<div className="mobile-image-grid placeholders" aria-label="图片正在生成">{Array.from({length:placeholders},(_,index)=><i key={index} aria-hidden="true"/>)}</div>}
    {!loading&&images.length>0&&<div className="mobile-image-grid">{images.map((image,index)=><article key={image.id||image.url||index}><button type="button" className="task-image-preview" onClick={()=>onPreview?.(image.url)}><img src={image.url} alt={image.title||`图片候选 ${index+1}`}/><span>{image.title||`候选 ${index+1}`}</span></button><button type="button" className="set-cover-mobile" disabled={!canSetCover} onClick={()=>onSetCover?.(image.url)}>{canSetCover?'设为封面':'先选择 Bot'}</button></article>)}</div>}
  </section>;
}

export function MessageFeed({messages,streamingText,interactions,imageTasks=[],activityLog=[],onRespond,onPreviewImage,onSetCover,canSetCover,busy}){
  const anchoredTasks=messageId=>imageTasks.filter(task=>task.after_message_id===messageId);
  const anchoredInteractions=messageId=>interactions.filter(item=>item.after_message_id===messageId);
  const unanchoredTasks=imageTasks.filter(task=>!task.after_message_id||!messages.some(message=>message.id===task.after_message_id));
  const unanchoredInteractions=interactions.filter(item=>!item.after_message_id||!messages.some(message=>message.id===item.after_message_id));
  return <div className="message-feed">
    {messages.flatMap(message=>[
      <article className={`chat-message ${message.role==='user'?'user':'assistant'}`} key={message.id}><header>{message.role==='user'?'你':<><Bot size={15}/> Emochi Agent</>}</header>{message.content?.trim()&&<Markdown>{message.content}</Markdown>}{message.attachments?.length>0&&<div className="message-images">{message.attachments.map(file=><button type="button" key={file.id} onClick={()=>onPreviewImage?.(file.url)}><img src={file.url} alt={file.name||'图片附件'}/></button>)}</div>}</article>,
      ...anchoredInteractions(message.id).map(item=><Interaction key={item.id} item={item} onRespond={onRespond} disabled={busy}/>),
      ...anchoredTasks(message.id).map(task=><ImageTaskCard key={task.id} task={task} onPreview={onPreviewImage} onSetCover={onSetCover} canSetCover={canSetCover}/>),
    ])}
    {streamingText&&<article className="chat-message assistant streaming"><header><Bot size={15}/> Emochi Agent</header><Markdown>{streamingText}</Markdown></article>}
    {busy&&!streamingText&&<AgentRunStatus activityLog={activityLog}/>}
    {unanchoredTasks.map(task=><ImageTaskCard key={task.id} task={task} onPreview={onPreviewImage} onSetCover={onSetCover} canSetCover={canSetCover}/>)}
    {unanchoredInteractions.map(item=><Interaction key={item.id} item={item} onRespond={onRespond} disabled={busy}/>)}
  </div>;
}

function AgentRunStatus({activityLog}){
  const current=[...activityLog].reverse().find(item=>['started','running'].includes(item.state));
  const entries=activityLog.filter(item=>item.state!=='running'||item.id===current?.id).slice(-4);
  return <section className="mobile-run-status" role="status" aria-live="polite"><header><i/><div><b>{current?'正在处理中…':'正在思考中…'}</b><small>{current?.label||'正在整理你的创作想法'}</small></div></header>{entries.length>0&&<div>{entries.map((item,index)=><p key={`${item.id}_${index}`} className={item.state||'started'}><em>{item.state==='completed'?'✓':item.state==='failed'?'!':'⌘'}</em>{item.state==='completed'?'已完成：':item.state==='failed'?'未完成：':'正在执行：'}{item.label||'创作步骤'}</p>)}</div>}</section>;
}

function Interaction({item,onRespond,disabled}){
  const confirmation=item.type==='confirmation';
  const [expanded,setExpanded]=useState(item.status==='pending');
  const [customOpen,setCustomOpen]=useState(false);
  const [custom,setCustom]=useState('');
  useEffect(()=>{if(item.status==='pending')setExpanded(true)},[item.status]);
  const options=confirmation?[{id:'confirm',title:'确认执行',description:'按当前方案继续执行。'},{id:'revise',title:'暂不执行',description:'保留当前内容，继续调整。'}]:item.options||[];
  const resolved=item.status==='resolved'||item.status==='ignored';
  const submitCustom=()=>{const value=custom.trim();if(!value||disabled||resolved)return;onRespond(item,{id:'custom',title:'自定义方向',description:value})};
  if(resolved&&!expanded)return <button type="button" className="interaction-history" onClick={()=>setExpanded(true)}><span>{item.status==='ignored'?'已忽略':confirmation?'已确认':'已选择'}</span><b>{item.response?.title||item.title||'历史决策'}</b><ChevronDown size={15}/></button>;
  return <section className={`interaction-card ${confirmation?'confirmation':''} ${item.status==='ignored'?'ignored':''}`}>
    {resolved&&<button type="button" className="interaction-collapse" onClick={()=>setExpanded(false)} aria-label="收起历史决策"><ChevronUp size={15}/></button>}
    <span>{confirmation?'需要确认':'选择一个方向'}</span>
    <b>{item.title}</b>
    {item.status==='ignored'&&<small className="interaction-ignored">已继续发送新消息，这次选择不再影响当前对话。</small>}
    {item.description&&<Markdown>{item.description}</Markdown>}
    {item.summary&&<Markdown>{item.summary}</Markdown>}
    {confirmation&&item.subject?.preview&&<div className="interaction-preview"><small>方案摘要</small><Markdown>{item.subject.preview}</Markdown></div>}
    {confirmation&&item.impact&&<div className="interaction-preview impact"><small>影响</small><Markdown>{item.impact}</Markdown></div>}
    <div>{options.map(option=><button className={item.response?.option_id===option.id?'selected':''} key={option.id} disabled={disabled||resolved} onClick={()=>onRespond(item,option)}><strong>{option.title}{item.response?.option_id===option.id?' · 已选':''}</strong>{option.description&&<small>{option.description}</small>}</button>)}</div>
    {!confirmation&&!resolved&&!customOpen&&<button type="button" className="custom-choice-trigger" disabled={disabled} onClick={()=>setCustomOpen(true)}>＋ 自定义一个方向</button>}
    {!confirmation&&!resolved&&customOpen&&<div className="custom-choice"><b>自定义一个方向</b><textarea autoFocus value={custom} onChange={event=>setCustom(event.target.value)} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter')submitCustom()}} placeholder="写下你真正想要的设定、情绪或限制…"/><footer><button type="button" onClick={()=>{setCustomOpen(false);setCustom('')}}>取消</button><button type="button" disabled={!custom.trim()||disabled} onClick={submitCustom}>按此继续</button></footer></div>}
  </section>;
}
