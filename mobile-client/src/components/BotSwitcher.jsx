import {Search} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {BottomSheet} from './BottomSheet';

export function BotSwitcher({open,onClose,bots,currentId,onSelect}){
  const [query,setQuery]=useState('');
  useEffect(()=>{if(!open)setQuery('')},[open]);
  const filtered=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase();
    if(!needle)return bots;
    return bots.filter(bot=>[
      bot.basic?.name,
      bot.basic?.intro,
      ...(bot.basic?.tags||[]),
    ].some(value=>String(value||'').toLocaleLowerCase().includes(needle)));
  },[bots,query]);
  return <BottomSheet open={open} onClose={onClose} title="切换 Bot">
    <label className="bot-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索名称、简介或标签" aria-label="搜索 Bot"/></label>
    <div className="bot-list">
      {!query.trim()&&<button className={!currentId?'selected':''} onClick={()=>onSelect(null)}><i>✦</i><span><b>自由探索</b><small>暂不绑定 Bot，继续探索</small></span>{!currentId&&<em>✓</em>}</button>}
      {filtered.map(bot=><button key={bot.id} className={bot.id===currentId?'selected':''} onClick={()=>onSelect(bot.id)}><i>{(bot.basic?.name||'?')[0]}</i><span><b>{bot.basic?.name||'未命名 Bot'}</b><small>{bot.basic?.intro||'尚未填写简介'}</small></span><em>{bot.id===currentId?'✓':'›'}</em></button>)}
      {query.trim()&&!filtered.length&&<p className="empty-search">没有找到匹配的 Bot。</p>}
    </div>
  </BottomSheet>;
}
