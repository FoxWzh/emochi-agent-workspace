import {ArrowUp,ImagePlus,Square,X} from 'lucide-react';
import {useRef} from 'react';

export function Composer({value,onChange,file,onPick,onRemove,onSend,onStop,busy}){
  const ref=useRef(null);
  return <div className="composer-wrap"><div className="composer">
    <div className={'attachment-chip '+(file?'visible':'')}>{file&&<><img src={file.preview} alt="待发送的图片"/><span>{file.name}</span><button type="button" onClick={onRemove} aria-label="移除图片"><X size={15}/></button></>}</div>
    <textarea value={value} disabled={busy} onChange={e=>onChange(e.target.value)} placeholder={busy?'正在处理，可点击停止':'告诉我你想创作、修改或探索什么…'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend()}}}/>
    <footer><input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{onPick(e.target.files?.[0]);e.target.value='';}}/>
      <button type="button" className="upload-button" onClick={()=>ref.current?.click()} disabled={busy} aria-label="上传图片"><ImagePlus size={19}/></button>
      <span>{busy?'当前对话正在处理':'图片可作为创作参考'}</span>
      <button type="button" className={'send-button '+(busy?'is-stop':'')} onClick={busy?onStop:onSend} disabled={busy?!onStop:(!value.trim()&&!file)} aria-label={busy?'停止生成':'发送'}>{busy?<Square size={14} fill="currentColor"/>:<ArrowUp size={19}/>}</button>
    </footer>
  </div></div>;
}
