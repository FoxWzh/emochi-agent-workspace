import {useEffect,useState} from 'react';

function useEscape(open,onClose,busy=false){
  useEffect(()=>{
    if(!open)return;
    const close=event=>{if(event.key==='Escape'&&!busy)onClose()};
    window.addEventListener('keydown',close);
    return()=>window.removeEventListener('keydown',close);
  },[open,onClose,busy]);
}

export function RenameSessionDialog({session,onClose,onSubmit,busy=false}){
  const [value,setValue]=useState(session?.title||'');
  useEffect(()=>setValue(session?.title||''),[session]);
  useEscape(Boolean(session),onClose,busy);
  if(!session)return null;
  const submit=()=>{const title=value.trim();if(title&&!busy)onSubmit(title)};
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <section className="session-modal" role="dialog" aria-modal="true" aria-labelledby="rename-title">
      <span className="modal-kicker">重命名对话</span>
      <h2 id="rename-title">给这段对话换个名字</h2>
      <input autoFocus maxLength={80} value={value} onChange={event=>setValue(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')submit()}} aria-label="新的对话名称"/>
      <small>{value.length}/80</small>
      <div className="modal-actions"><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="button" className="modal-primary" disabled={!value.trim()||busy} onClick={submit}>{busy?'保存中…':'保存名称'}</button></div>
    </section>
  </div>;
}

export function DeleteSessionDialog({session,onClose,onConfirm,busy=false}){
  useEscape(Boolean(session),onClose,busy);
  if(!session)return null;
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <section className="session-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
      <span className="modal-kicker danger">删除对话</span>
      <h2 id="delete-title">确认删除「{session.title||'新的创作对话'}」？</h2>
      <p>这会永久删除该对话的消息、选择记录和关联的工作页引用。此操作无法撤销。</p>
      <div className="modal-actions"><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="button" className="modal-danger" disabled={busy} onClick={onConfirm}>{busy?'删除中…':'确认删除'}</button></div>
    </section>
  </div>;
}
