import {FileText,Image as ImageIcon,Save,X} from 'lucide-react';
import {useEffect,useState} from 'react';
import {BottomSheet} from './BottomSheet';

const iconFor=artifact=>artifact.type==='image_library'||artifact.type==='image'?<ImageIcon size={19}/>:<FileText size={19}/>;
const imagesFor=artifact=>artifact.type==='image_library'?(artifact.data?.batches||[]).flatMap(batch=>batch.images||[]):artifact.type==='image'?[artifact.data||artifact]:[];

export function ResourceSheet({open,onClose,artifacts,onUpdate}){
  const [selectedId,setSelectedId]=useState(null);
  const selected=artifacts.find(item=>item.id===selectedId)||null;
  useEffect(()=>{if(!open)setSelectedId(null)},[open]);
  if(selected)return <ResourceDetail artifact={selected} onBack={()=>setSelectedId(null)} onClose={onClose} onUpdate={onUpdate}/>;
  return <BottomSheet open={open} title="资源区" onClose={onClose}><div className="resource-list">{artifacts.length?artifacts.map(item=><button className="resource-row" key={item.id} onClick={()=>setSelectedId(item.id)}><i>{iconFor(item)}</i><span><b>{item.title}</b><small>{item.type==='image_library'?'图片资源':item.type==='text'?'文本 · 可继续编辑':'创作成果 · 点击查看'}</small></span><em>›</em></button>):<p>还没有资源。对话中生成的图片、文本和 Bot 内容会出现在这里。</p>}</div></BottomSheet>;
}
function ResourceDetail({artifact,onBack,onClose,onUpdate}){
  const [value,setValue]=useState(String(artifact.data??artifact.preview??''));
  const [saving,setSaving]=useState(false);
  useEffect(()=>setValue(String(artifact.data??artifact.preview??'')),[artifact.id,artifact.data,artifact.preview]);
  const images=imagesFor(artifact);
  const save=async()=>{if(saving||value===String(artifact.data??artifact.preview??''))return;setSaving(true);try{await onUpdate(artifact.id,{data:value})}finally{setSaving(false)}};
  return <BottomSheet open title={artifact.title} onClose={onClose} actions={<button type="button" className="detail-back" onClick={onBack} aria-label="返回资源列表">‹</button>}><div className="resource-detail">
    {artifact.description&&<p>{artifact.description}</p>}
    {images.length?<div className="resource-images">{images.map((image,index)=><figure key={image.id||image.url||index}><img src={image.url} alt={image.title||`${artifact.title} 图片 ${index+1}`}/><figcaption>{image.title||`候选 ${index+1}`}</figcaption></figure>)}</div>:artifact.type==='text'?<><textarea aria-label={`编辑文本「${artifact.title}」`} value={value} onChange={event=>setValue(event.target.value)}/><button type="button" className="resource-save" disabled={saving||value===String(artifact.data??artifact.preview??'')} onClick={save}><Save size={15}/>{saving?'保存中…':'保存修改'}</button></>:<pre>{value||'暂无可预览内容'}</pre>}
  </div></BottomSheet>;
}
