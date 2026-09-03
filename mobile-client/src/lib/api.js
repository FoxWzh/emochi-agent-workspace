const origin=(import.meta.env.VITE_AGENT_API_ORIGIN||'').replace(/\/$/,'');

const endpoint=path=>`${origin}${path}`;

const request=async(path,options={})=>{
  let response;
  try{
    response=await fetch(endpoint(path),{
      headers:{'content-type':'application/json',...(options.headers||{})},
      ...options,
    });
  }catch{
    throw Error('无法连接 Agent 服务，请稍后重试。');
  }
  const raw=await response.text();
  let body={};
  if(raw){
    try{body=JSON.parse(raw)}
    catch{throw Error(response.ok?'服务返回了无法识别的数据。':'Agent 服务响应异常，请稍后重试。')}
  }
  if(!response.ok)throw Error(body.error||body.message||`请求失败（${response.status}）`);
  if(!raw)throw Error('Agent 服务没有返回数据，请稍后重试。');
  return body;
};

export const api={
  state:()=>request('/api/state'),
  createSession:()=>request('/api/sessions',{method:'POST',body:'{}'}),
  renameSession:(id,title)=>request(`/api/sessions/${id}`,{method:'PATCH',body:JSON.stringify({title})}),
  deleteSession:id=>request(`/api/sessions/${id}`,{method:'DELETE'}),
  resolveInteraction:(sessionId,interactionId,response)=>request(`/api/sessions/${sessionId}/interactions/${interactionId}/respond`,{method:'POST',body:JSON.stringify(response)}),
  setWorkObject:(id,botId)=>request(`/api/sessions/${id}/work-object`,{method:'POST',body:JSON.stringify({bot_id:botId})}),
  uploadImage:input=>request('/api/uploads/images',{method:'POST',body:JSON.stringify(input)}),
  imageTask:id=>request(`/api/image-tasks/${id}`),
  updateArtifact:(id,patch)=>request(`/api/artifacts/${id}`,{method:'PATCH',body:JSON.stringify(patch)}),
  updateBot:(id,changes)=>request(`/api/bots/${id}`,{method:'PATCH',body:JSON.stringify({changes})}),
  cancelTurn:id=>request(`/api/sessions/${id}/cancel`,{method:'POST',body:'{}'}),
};

export async function streamMessage(id,content,attachments,onEvent,onOpen){
  let response;
  try{
    response=await fetch(endpoint(`/api/sessions/${id}/messages`),{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({content,attachments}),
    });
  }catch{
    throw Error('无法连接 Agent 服务，请稍后重试。');
  }
  if(!response.ok){
    const raw=await response.text();
    let payload={};
    try{payload=raw?JSON.parse(raw):{}}catch{}
    throw Error(payload.error||payload.message||(response.status===500?'Agent 服务暂时不可用，请稍后重试。':`请求失败（${response.status}）`));
  }
  if(!response.body)throw Error('Agent 服务没有建立生成连接，请重试。');
  onOpen?.();
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let buffer='';
  let terminal=false;
  while(true){
    const {value,done}=await reader.read();
    if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    const chunks=buffer.split('\n\n');
    buffer=chunks.pop()||'';
    for(const chunk of chunks){
      const row=chunk.split('\n').find(line=>line.startsWith('data: '));
      if(!row)continue;
      try{
        const event=JSON.parse(row.slice(6));
        onEvent(event);
        if(event.type==='done'||event.type==='error')terminal=true;
      }catch{}
    }
  }
  if(!terminal)throw Error('生成连接意外中断，请重试。');
}
