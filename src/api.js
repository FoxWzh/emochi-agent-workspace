const json=async(url,options={})=>{
  let response;
  try{response=await fetch(url,{headers:{'content-type':'application/json',...(options.headers||{})},...options});}
  catch{throw Error('无法连接本地 Agent 服务，请稍后重试。');}
  const raw=await response.text(); let data={};
  if(raw){try{data=JSON.parse(raw);}catch{throw Error(response.ok?'服务返回了无法识别的数据。':'本地 Agent 服务响应异常，请稍后重试。');}}
  if(!response.ok)throw Error(data.error||data.message||`请求失败（${response.status}）`);
  if(!raw)throw Error('本地 Agent 服务没有返回数据，请稍后重试。');
  return data;
};
export const api={health:()=>json('/api/health'),state:()=>json('/api/state'),createSession:({title,reuseIfEmptySessionId}={})=>json('/api/sessions',{method:'POST',body:JSON.stringify({title,reuse_if_empty_session_id:reuseIfEmptySessionId})}),renameSession:(id,title)=>json(`/api/sessions/${id}`,{method:'PATCH',body:JSON.stringify({title})}),deleteSession:id=>json(`/api/sessions/${id}`,{method:'DELETE'}),setWorkObject:(sessionId,botId)=>json(`/api/sessions/${sessionId}/work-object`,{method:'POST',body:JSON.stringify({bot_id:botId})}),createBot:bot=>json('/api/bots',{method:'POST',body:JSON.stringify(bot)}),deleteBot:id=>json(`/api/bots/${id}`,{method:'DELETE'}),updateBot:(id,changes)=>json(`/api/bots/${id}`,{method:'PATCH',body:JSON.stringify({changes})}),createArtifact:(sessionId,artifact)=>json(`/api/sessions/${sessionId}/artifacts`,{method:'POST',body:JSON.stringify(artifact)}),updateArtifact:(id,patch)=>json(`/api/artifacts/${id}`,{method:'PATCH',body:JSON.stringify(patch)}),uploadImage:image=>json('/api/uploads/images',{method:'POST',body:JSON.stringify(image)}),imageTask:id=>json(`/api/image-tasks/${id}`),resolveInteraction:(sessionId,interactionId,response)=>json(`/api/sessions/${sessionId}/interactions/${interactionId}/respond`,{method:'POST',body:JSON.stringify(response)}),cancelTurn:sessionId=>json(`/api/sessions/${sessionId}/cancel`,{method:'POST',body:'{}'})};
export async function streamMessage(sessionId,content,attachments=[],handlers={}){
  let response;
  try{response=await fetch(`/api/sessions/${sessionId}/messages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content,attachments})});}
  catch{throw Error('无法连接本地 Agent 服务，请稍后重试。');}
  if(!response.ok){
    const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{};}catch{}
    throw Error(payload.error||payload.message||(response.status===500?'本地 Agent 服务暂时不可用，请稍后重试。':`请求失败（${response.status}）`));
  }
  if(!response.body)throw Error('本地 Agent 服务没有建立生成连接，请重试。');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',terminal=false;
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const chunks=buffer.split('\n\n');buffer=chunks.pop()||'';for(const chunk of chunks){const line=chunk.split('\n').find(l=>l.startsWith('data: '));if(!line)continue;let event;try{event=JSON.parse(line.slice(6));}catch{continue;}handlers.onEvent?.(event);if(event.type==='status')handlers.onStatus?.(event.payload);if(event.type==='delta')handlers.onDelta?.(event.payload.text);if(event.type==='message')handlers.onMessage?.(event.payload);if(event.type==='done'){terminal=true;await handlers.onDone?.();}if(event.type==='error'){terminal=true;handlers.onError?.(event.payload.message)}}}
  if(!terminal)throw Error('生成连接意外中断，请重试。');
}
