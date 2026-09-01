import {Box,ChevronDown,Pencil,X} from 'lucide-react';
import {useState} from 'react';
function Cover({bot}){const [failed,setFailed]=useState(false);return bot?.cover&&!failed?<img src={bot.cover} alt="" onError={()=>setFailed(true)}/>:<span>{bot?.name?.slice(0,1)||<Box size={12}/>}</span>}

// Lives in the composer footer: this is a compact work-object control, not a
// heading or a second toolbar. The three controls are intentionally one group.
export function BotContextBar({bot,onOpenBots,onOpenEditor,onClear}){
  if(!bot)return <button type="button" className="composer-bot-picker composer-bot-picker-empty" onClick={onOpenBots} title="选择要编辑的 Bot"><Box size={13}/><span>选择 Bot</span><ChevronDown size={12}/></button>;
  return <div className="composer-bot-picker" role="group" aria-label={`当前编辑 Bot：${bot.name}`}>
    <button type="button" className="composer-bot-identity" onClick={onOpenBots} title="切换当前 Bot"><Cover bot={bot}/><span>{bot.name}</span><ChevronDown size={12}/></button>
    <button type="button" className="composer-bot-action" onClick={onOpenEditor} title="编辑当前 Bot" aria-label="编辑当前 Bot"><Pencil size={12}/></button>
    <button type="button" className="composer-bot-action composer-bot-unbind" onClick={onClear} title="解除当前 Bot 绑定" aria-label="解除当前 Bot 绑定"><X size={13}/></button>
  </div>;
}
