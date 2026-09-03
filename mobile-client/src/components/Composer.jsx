import {ArrowUp,ImagePlus,Square,X} from 'lucide-react';
import {useRef} from 'react';

export function Composer({value,onChange,file,onPick,onRemove,onSend,onStop,busy}){
  const ref=useRef(null);
  return <div className="composer-wrap"><div className="composer">
    <div className={'attachment-tray-mobile '+(file?.length?'visible':'')}>{file?.map(item=><div className="attachment-chip" key={item.id}><img src={item.data_url} alt="待发送的图片"/><span>{item.name}</span><button type="button" onClick={()=>onRemove(item.id)} aria-label={`移除 ${item.name}`}><X size={15}/></button></div>)}</div>
    <textarea value={value} disabled={busy} onChange={e=>onChange(e.target.value)} placeholder={busy?'正在处理，可点击停止':file?.length?'补充你希望如何处理这些图片…':'告诉我你想创作、修改或探索什么…'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend()}}}/>
    <footer><input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>{onPick([...e.target.files]);e.target.value='';}}/>
      <button type="button" className="upload-button" onClick={()=>ref.current?.click()} disabled={busy} aria-label="上传图片"><ImagePlus size={19}/></button>
      <span>{busy?'当前对话正在处理':file?.length?`${file.length}/4 张图片`:'最多添加 4 张图片'}</span>
      <button type="button" className={'send-button '+(busy?'is-stop':'')} onClick={busy?onStop:onSend} disabled={busy?!onStop:(!value.trim()&&!file?.length)} aria-label={busy?'停止生成':'发送'}>{busy?<Square size={14} fill="currentColor"/>:<ArrowUp size={19}/>}</button>
    </footer>
  </div></div>;
}
