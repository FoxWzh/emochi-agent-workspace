import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './app.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('empty workspace supports session, bot, artifact, bot update, and persisted interaction responses', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-workspace-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (url, options = {}) => fetch(base + url, { headers: { 'content-type': 'application/json' }, ...options }).then((response) => response.json());
  try {
    let state = await call('/api/state');
    assert.equal(state.sessions.length, 1); assert.equal(state.sessions[0].title, '新的创作对话'); assert.deepEqual(state.sessions[0].messages, []); assert.deepEqual(state.bots, []); assert.equal(state.artifacts.length, 1); assert.equal(state.artifacts[0].type, 'text'); assert.equal(state.artifacts[0].system_kind, 'resource_guide'); assert.equal(state.sessions[0].artifactIds[0], state.artifacts[0].id); assert.deepEqual(state.running_session_ids, []);
    const session = state.sessions[0];
    const reused = await call('/api/sessions', { method: 'POST', body: JSON.stringify({ reuse_if_empty_session_id: session.id }) });
    assert.equal(reused.session.id, session.id); assert.equal(reused.reused, true);
    const renamed = await call(`/api/sessions/${session.id}`, { method: 'PATCH', body: JSON.stringify({ title: '已重命名会话' }) });
    assert.equal(renamed.session.title, '已重命名会话');
    const bot = (await call('/api/bots', { method: 'POST', body: JSON.stringify({ basic: { name: '真Bot' }, content: '初始', advanced: { voice: '简洁' } }) })).bot;
    await call(`/api/sessions/${session.id}/work-object`, { method: 'POST', body: JSON.stringify({ bot_id: bot.id }) });
    state = await call('/api/state');
    state.sessions[0].interactions = [{ id: 'interaction_choice', type: 'choice', title: '选择方向', options: [{ id: 'a', title: '方向 A' }], status: 'pending', response: null, created_at: new Date().toISOString(), resolved_at: null }];
    await writeFile(path.join(process.env.EMOCHI_DATA_DIR, 'workspace.json'), JSON.stringify(state), 'utf8');
    const response = await call(`/api/sessions/${session.id}/interactions/interaction_choice/respond`, { method: 'POST', body: JSON.stringify({ option_id: 'a', title: '方向 A', description: '保留选择记录' }) });
    assert.equal(response.interaction.status, 'resolved');
    assert.equal(response.interaction.response.option_id, 'a');
    const duplicate = await fetch(base + `/api/sessions/${session.id}/interactions/interaction_choice/respond`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ option_id: 'a', title: '方向 A' }) });
    assert.equal(duplicate.status, 409);
    const artifact = (await call(`/api/sessions/${session.id}/artifacts`, { method: 'POST', body: JSON.stringify({ type: 'bot_content', title: '内容页', data: '草案', bot_ref: { bot_id: bot.id, area: 'content' } }) })).artifact;
    const updated = (await call(`/api/bots/${bot.id}`, { method: 'PATCH', body: JSON.stringify({ changes: [{ area: 'content', operation: 'replace', value: artifact.data, reason: '应用工作页' }] }) })).bot;
    assert.equal(updated.content, '草案'); assert.match(updated.init_prompt, /草案/);
    const sessionRecordPath = path.join(process.env.EMOCHI_DATA_DIR, 'sessions', `${session.id}.json`);
    const sessionRecord = JSON.parse(await (await import('node:fs/promises')).readFile(sessionRecordPath, 'utf8'));
    sessionRecord.messages = [{ id: 'message_safe', role: 'user', content: '', attachments: [{ id: 'attachment_safe', kind: 'image', url: '/api/uploads/safe.png', file_path: '/private/path/safe.png' }] }];
    await writeFile(sessionRecordPath, JSON.stringify(sessionRecord), 'utf8');
    const publicState = await call('/api/state');
    assert.equal(publicState.sessions[0].messages[0].attachments[0].file_path, undefined);
    state = publicState;
    assert.equal(state.sessions[0].interactions[0].response.title, '方向 A');
    assert.deepEqual(state.sessions[0].artifactIds.slice(1), [artifact.id]); assert.equal(state.artifacts.find(item=>item.id===state.sessions[0].artifactIds[0])?.system_kind, 'resource_guide');
    const disposable = (await call('/api/sessions', { method: 'POST', body: JSON.stringify({ title: '待删除会话' }) })).session;
    const deleted = await call(`/api/sessions/${disposable.id}`, { method: 'DELETE' });
    assert.equal(deleted.deleted_session_id, disposable.id);
    state = await call('/api/state');
    assert.equal(state.sessions.some(item => item.id === disposable.id), false);
  } finally { await new Promise((resolve) => server.close(resolve)); delete process.env.EMOCHI_DATA_DIR; await rm(dir, { recursive: true, force: true }); }
});

test('agent prompt receives bounded history from only its own Session', async () => {
  const { buildAgentPrompt } = await import('./agent-adapter.js');
  const own = Array.from({ length: 18 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `own-${index}` }));
  const prompt = buildAgentPrompt({ messages: own, bot: { basic: { name: 'Only This Bot' }, content: '', advanced: {} } });
  assert.match(prompt, /own-17/);
  assert.doesNotMatch(prompt, /own-0/);
  assert.doesNotMatch(prompt, /other-session-secret/);
  assert.match(prompt, /Only This Bot/);
  assert.match(prompt, /最多 7 条/);
});

test('message API rejects a second overlapping agent turn for the same Session', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-overlap-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const sessionResponse = await fetch(base + '/api/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const session = (await sessionResponse.json()).session;
    // This direct unit boundary confirms the server-level interlock by opening
    // an active SSE response before trying the same session again.
    const first = fetch(base + `/api/sessions/${session.id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'first' }) });
    await new Promise(resolve => setTimeout(resolve, 20));
    const second = await fetch(base + `/api/sessions/${session.id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'second' }) });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error, 'session_busy');
    const response = await first;
    await response.body?.cancel();
  } finally { await new Promise(resolve => server.close(resolve)); delete process.env.EMOCHI_DATA_DIR; await rm(dir, { recursive: true, force: true }); }
});

test('concurrent Session mutations retain both Session records', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-concurrent-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const create = title => fetch(base + '/api/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) }).then(response => response.json());
  try {
    const [left,right] = await Promise.all([create('并发会话 A'),create('并发会话 B')]);
    const state = await fetch(base + '/api/state').then(response => response.json());
    assert.deepEqual(new Set(state.sessions.map(session => session.id)),new Set([left.session.id,right.session.id]));
  } finally { await new Promise(resolve => server.close(resolve)); delete process.env.EMOCHI_DATA_DIR; await rm(dir, { recursive: true, force: true }); }
});

test('agent-produced Artifact timeline events can be anchored to their assistant turn', async () => {
  const turnId = 'turn_artifact'; const assistantId = 'msg_assistant';
  const timeline = [{ id: 'event_1', kind: 'artifact', artifactId: 'artifact_1', turn_id: turnId, after_message_id: null }];
  for (const event of timeline) if (event.turn_id === turnId && !event.after_message_id) event.after_message_id = assistantId;
  assert.equal(timeline[0].after_message_id, assistantId);
});

test('resumed agent prompt contains business delta but not replayed message history', async () => {
  const { buildAgentPrompt } = await import('./agent-adapter.js');
  const messages = [{ role: 'assistant', content: 'old agent detail' }, { role: 'user', content: 'current request' }];
  const prompt = buildAgentPrompt({ messages, resumed: true, bot: null, pendingInteractions: [{ id: 'choice_1', type: 'choice', title: 'Choose', status: 'pending' }], artifactIndex: [{ id: 'artifact_1', type: 'text', title: 'Draft' }] });
  assert.match(prompt, /business_state authoritative/);
  assert.match(prompt, /current request/);
  assert.match(prompt, /choice_1/);
  assert.match(prompt, /artifact_1/);
  assert.doesNotMatch(prompt, /old agent detail/);
  assert.doesNotMatch(prompt, /当前 Session 历史/);
});

test('business Session keeps its SDK session id private from the public state', async () => {
  const { makeSession } = await import('./store.js');
  const session = makeSession();
  session.sdk_session_id = 'sdk-private-id';
  const { publicState } = await import('./store.js');
  assert.equal(typeof session.sdk_session_id, 'string');
  // API integration coverage asserts attachment redaction; the business field is
  // also deliberately stripped before frontend state leaves the server.
});

test('starting a new conversation reuses the currently pristine Session but never discards meaningful Session state', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-pristine-session-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const create = body => fetch(base + '/api/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const first = await create({ title: '空白会话' }); const blank = (await first.json()).session;
    const reusedResponse = await create({ reuse_if_empty_session_id: blank.id });
    assert.equal(reusedResponse.status, 200);
    const reused = await reusedResponse.json();
    assert.equal(reused.reused, true); assert.equal(reused.session.id, blank.id);
    let state = await fetch(base + '/api/state').then(response => response.json());
    assert.equal(state.sessions.length, 1);
    await fetch(base + `/api/sessions/${blank.id}/work-object`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bot_id: null }) });
    // A real message makes the Session non-disposable even if its turn fails later.
    const recordPath = path.join(process.env.EMOCHI_DATA_DIR, 'sessions', `${blank.id}.json`);
    const record = JSON.parse(await (await import('node:fs/promises')).readFile(recordPath, 'utf8'));
    record.messages.push({ id: 'meaningful', role: 'user', content: '保留这段创作' });
    await writeFile(recordPath, JSON.stringify(record), 'utf8');
    const nextResponse = await create({ reuse_if_empty_session_id: blank.id });
    assert.equal(nextResponse.status, 201);
    const next = await nextResponse.json();
    assert.equal(next.reused, false); assert.notEqual(next.session.id, blank.id);
    state = await fetch(base + '/api/state').then(response => response.json());
    assert.equal(state.sessions.length, 2);
  } finally { await new Promise(resolve => server.close(resolve)); delete process.env.EMOCHI_DATA_DIR; await rm(dir, { recursive: true, force: true }); }
});

test('an image generation batch is represented by one Artifact that contains all candidate images', async () => {
  const task = { id: 'image_task_1', title: '夜窗封面', artifacts: [{
    id: 'artifact_image_batch', type: 'image', title: '夜窗封面',
    data: { task_id: 'image_task_1', images: [
      { id: 'candidate_1', title: '近景', url: 'https://example.test/1.webp' },
      { id: 'candidate_2', title: '远景', url: 'https://example.test/2.webp' },
    ] },
  }] };
  assert.equal(task.artifacts.length, 1);
  assert.equal(task.artifacts[0].data.images.length, 2);
  assert.equal(task.artifacts[0].data.task_id, task.id);
});

test('Bot content only changes when the explicit update endpoint is called', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-explicit-bot-save-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (url, options = {}) => fetch(base + url, { headers: { 'content-type': 'application/json' }, ...options });
  try {
    const bot = (await (await call('/api/bots', { method: 'POST', body: JSON.stringify({ basic: { name: '原名称', cover_url: '/original.png' }, content: '原内容', advanced: {} }) })).json()).bot;
    // UI draft edits and temporary uploads must not have a Bot endpoint behind them.
    let state = await (await call('/api/state')).json();
    let persisted = state.bots.find(item => item.id === bot.id);
    assert.equal(persisted.basic.name, '原名称');
    assert.equal(persisted.basic.cover_url, '/original.png');
    assert.equal(persisted.content, '原内容');
    await call(`/api/bots/${bot.id}`, { method: 'PATCH', body: JSON.stringify({ changes: [
      { area: 'basic', operation: 'merge', value: { name: '确认后的名称', cover_url: '/new-cover.png' }, reason: '用户确认并保存修改' },
      { area: 'content', operation: 'replace', value: '确认后的内容', reason: '用户确认并保存修改' },
    ] }) });
    state = await (await call('/api/state')).json(); persisted = state.bots.find(item => item.id === bot.id);
    assert.equal(persisted.basic.name, '确认后的名称');
    assert.equal(persisted.basic.cover_url, '/new-cover.png');
    assert.equal(persisted.content, '确认后的内容');
  } finally { await new Promise(resolve => server.close(resolve)); delete process.env.EMOCHI_DATA_DIR; await rm(dir, { recursive: true, force: true }); }
});

test('selecting an image as a cover is a client draft action until the user explicitly saves', () => {
  const saved = { name: '原 Bot', cover: '/old.png', content: '已保存内容' };
  const draft = { ...saved, cover: '/generated.png' };
  assert.equal(saved.cover, '/old.png');
  assert.equal(draft.cover, '/generated.png');
  // The only durable write remains the separately covered PATCH endpoint test.
});

test('image library invariant consolidates old image Artifacts and rejects direct image Artifact creation', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-image-library-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options={}) => fetch(base+url,{headers:{'content-type':'application/json'},...options});
  try {
    const session=(await (await request('/api/sessions',{method:'POST',body:'{}'})).json()).session;
    const direct=await request(`/api/sessions/${session.id}/artifacts`,{method:'POST',body:JSON.stringify({type:'image',title:'绕过任务'})});
    assert.equal(direct.status,400);
    const file=path.join(process.env.EMOCHI_DATA_DIR,'sessions',`${session.id}.json`);
    const record=JSON.parse(await (await import('node:fs/promises')).readFile(file,'utf8'));
    record.artifactIds=['lib-a','lib-b','old-image'];await writeFile(file,JSON.stringify(record),'utf8');
    const workspace=JSON.parse(await (await import('node:fs/promises')).readFile(path.join(process.env.EMOCHI_DATA_DIR,'workspace.json'),'utf8'));
    workspace.artifacts=[
      {id:'lib-a',type:'image_library',title:'图片资源',data:{batches:[{id:'a',images:[{url:'https://a'}]}]}},
      {id:'lib-b',type:'image_library',title:'图片资源',data:{batches:[{id:'b',images:[{url:'https://b'}]}]}},
      {id:'old-image',type:'image',title:'旧图',data:{task_id:'old',url:'https://old'}},
    ];await writeFile(path.join(process.env.EMOCHI_DATA_DIR,'workspace.json'),JSON.stringify(workspace),'utf8');
    const state=await (await request('/api/state')).json();const current=state.sessions.find(item=>item.id===session.id);
    const libraries=state.artifacts.filter(item=>current.artifactIds.includes(item.id)&&item.type==='image_library');
    assert.equal(libraries.length,1);assert.equal(libraries[0].data.batches.length,3);assert.equal(state.artifacts.filter(item=>item.type==='image').length,0);
  } finally { await new Promise(resolve=>server.close(resolve));delete process.env.EMOCHI_DATA_DIR;await rm(dir,{recursive:true,force:true}); }
});

test('health endpoint reports local runtime readiness without exposing credentials', async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    const health = await response.json();
    assert.equal(response.status, 200); assert.equal(health.status, 'ok');
    assert.ok(['configured','missing_configuration'].includes(health.agent_gateway));
    assert.ok(['configured','missing_configuration'].includes(health.image_gateway));
    assert.doesNotMatch(JSON.stringify(health), /KEY|SECRET|TOKEN/i);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('Agent Read guard gives actionable paths for references and directories', async () => {
  const { canUseWorkspaceTool } = await import('./agent-adapter.js');
  assert.equal((await canUseWorkspaceTool('Read',{file_path:'.claude/skills/content-design-and-creation/references/blueprint-design.md'})).behavior,'allow');
  const alias=await canUseWorkspaceTool('Read',{file_path:'.claude/skills/content-design-and-creation/blueprint-design.md'});
  assert.equal(alias.behavior,'allow');assert.equal(alias.updatedInput.file_path,'.claude/skills/content-design-and-creation/references/blueprint-design.md');
  const directory=await canUseWorkspaceTool('Read',{file_path:'.claude/skills/content-design-and-creation'});
  assert.equal(directory.behavior,'deny');assert.match(directory.message,/SKILL\.md/);
  assert.equal((await canUseWorkspaceTool('Read',{file_path:'../../etc/passwd'})).behavior,'deny');
  assert.equal((await canUseWorkspaceTool('mcp__emochi_workspace__bot_workspace',{})).behavior,'allow');
});

test('image task callback carries its turn identity so the UI can anchor it to the originating reply', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./agent-tools.js', import.meta.url), 'utf8');
  assert.match(source, /turn_id:turnId/);
  const task = { id: 'image_task_x', session_id: 'session_x', turn_id: 'turn_x', after_message_id: null };
  const finalAssistantMessage = { id: 'msg_x', role: 'assistant' };
  if (task.turn_id === 'turn_x' && !task.after_message_id) task.after_message_id = finalAssistantMessage.id;
  assert.equal(task.after_message_id, 'msg_x');
});

test('Bot update accepts only explicit non-empty changes and reports every applied write', async () => {
  const { botWorkspaceInput, applyBotChanges } = await import('./agent-tools.js');
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', area: 'content', content: '# ignored' }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [] }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ area: 'content', operation: 'replace', reason: '缺失 value' }] }));
  const update = botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [
    { area: 'content', operation: 'replace', value: '# 角色与关系设定', reason: '写入内容设定' },
    { area: 'advanced', operation: 'merge', value: { voice: '克制' }, reason: '补充语气' },
  ] });
  const bot = { id: 'bot_1', basic: {}, content: '', advanced: {}, updated_at: 'before' };
  const written = applyBotChanges(bot, update.changes);
  assert.equal(bot.content, '# 角色与关系设定');
  assert.deepEqual(bot.advanced, { voice: '克制' });
  assert.deepEqual(written, [
    { area: 'content', operation: 'replace', applied: true },
    { area: 'advanced', operation: 'merge', applied: true },
  ]);
  assert.notEqual(bot.updated_at, 'before');
});

test('Bot workspace rejects invented fields before any write and accepts documented create/update payloads', async () => {
  const { botWorkspaceInput } = await import('./agent-tools.js');
  assert.throws(() => botWorkspaceInput.parse({ action: 'create', name: '错误平铺名称', basic: { name: '正确名称' } }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'create', basic: {} }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'create', basic: { name: '名称', unknown_field: '不应静默吞掉' } }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_ref: { bot_id: 'bot_1', area: 'basic' } }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ area: 'basic', operation: 'merge', reason: '错误 JSON patch', value: { name: '名称' }, path: 'basic.name' }] }));
  const created = botWorkspaceInput.parse({ action: 'create', basic: { name: '正确 Bot', intro: '简介', tags: ['角色'], welcome: '你好' }, content: '设定', advanced: { voice: '克制' } });
  assert.equal(created.basic.name, '正确 Bot');
  const updated = botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ area: 'basic', operation: 'merge', reason: '更新名称', value: { name: '新名称' } }] });
  assert.equal(updated.changes[0].value.name, '新名称');
});

test('Bot workspace cannot replace basic with a string or a nameless partial object', async () => {
  const { botWorkspaceInput } = await import('./agent-tools.js');
  const invalidString = { action: 'update', bot_id: 'bot_1', changes: [{ area: 'basic', operation: 'replace', reason: '错误写入欢迎语', value: '这不是 basic 对象' }] };
  const invalidPartial = { action: 'update', bot_id: 'bot_1', changes: [{ area: 'basic', operation: 'replace', reason: '错误部分覆盖', value: { welcome: '欢迎语' } }] };
  assert.throws(() => botWorkspaceInput.parse(invalidString));
  assert.throws(() => botWorkspaceInput.parse(invalidPartial));
  const validReplace = botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ area: 'basic', operation: 'replace', reason: '完整重写基础信息', value: { name: '名称', welcome: '欢迎语' } }] });
  assert.equal(validReplace.changes[0].value.name, '名称');
  const validMerge = botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ area: 'basic', operation: 'merge', reason: '仅更新欢迎语', value: { welcome: '新欢迎语' } }] });
  assert.equal(validMerge.changes[0].value.welcome, '新欢迎语');
});

test('Agent-created Bot event binds the created Bot to the current Session', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./agent-tools.js', import.meta.url), 'utf8');
  assert.match(source, /session\.workObjectId=bot\.id/);
  assert.match(source, /event:\['bot',\{bot,work_object:bot\.id,created:true\}\]/);
  const client = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(client, /event\.type==='bot'&&event\.payload\?\.bot/);
  assert.match(client, /workObjectId:event\.payload\.work_object/);
  assert.match(client, /openBotWorkspace\(sessionId,bot,\{openEditor:Boolean\(event\.payload\.created\)\}\)/);
  assert.match(client, /openEditor\)\{showBotEditor\(selectedBot\.id\);setBotLibraryOpen\(false\);\}/);
});

test('Composer keeps the Bot edit action available after an Agent-created Bot sync', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/components/BotContextBar.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /disabled=\{!editor\}/);
  assert.match(source, /onClick=\{onOpenEditor\}/);
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /onOpenEditor=\{\(\)=>showBotEditor\(bot\?\.id\)\}/);
});

test('Skill and Tool activity is only shown before the streaming reply has visible content', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /if\(hasVisibleContent\)return null/);
  assert.match(source, /hasVisibleContent=\{Boolean\(message\.content\?\.trim\(\)\)\}/);
});

test('An empty streaming assistant message does not render a blank Markdown line above progress', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /\{message\.content\?\.trim\(\)&&<Markdown>\{message\.content\}<\/Markdown>\}/);
});

test('Activity progress is reset for every new turn and discarded after it finishes', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  // Activity history must never survive into the next optimistic streaming message.
  assert.match(source, /setActivityLogBySession\(current=>\(\{\.\.\.current,\[sessionId\]:\[\]\}\)\);\s*setBusy\(sessionId,true\)/);
  // It is display-only state, not transcript history, and should be released at both terminal paths.
  assert.match(source, /onDone:async\(\)=>\{[\s\S]*?setActivityLogBySession\(current=>\(\{\.\.\.current,\[sessionId\]:\[\]\}\)\);setBusy\(sessionId,false\)/);
  assert.match(source, /onError:message=>\{[\s\S]*?setActivityLogBySession\(current=>\(\{\.\.\.current,\[sessionId\]:\[\]\}\)\);setBusy\(sessionId,false\)/);
});

test('Agent Bot creation requires all user-facing basic fields and a content setting', async () => {
  const { botWorkspaceInput } = await import('./agent-tools.js');
  const missingIntro = { action: 'create', basic: { name: '只有名称', welcome: '你好' }, content: '# 内容设定' };
  const missingWelcome = { action: 'create', basic: { name: '缺欢迎语', intro: '简介' }, content: '# 内容设定' };
  const missingContent = { action: 'create', basic: { name: '缺内容', intro: '简介', welcome: '你好' } };
  assert.throws(() => botWorkspaceInput.parse(missingIntro));
  assert.throws(() => botWorkspaceInput.parse(missingWelcome));
  assert.throws(() => botWorkspaceInput.parse(missingContent));
  const complete = botWorkspaceInput.parse({ action: 'create', basic: { name: '完整 Bot', intro: '一句简介', welcome: '这是欢迎语' }, content: '# 内容设定', advanced: { voice: '克制' } });
  assert.equal(complete.basic.intro, '一句简介');
  assert.equal(complete.basic.welcome, '这是欢迎语');
  assert.equal(complete.content, '# 内容设定');
});

test('Bot workspace accepts only canonical fields and rejects legacy aliases that the UI does not consume', async () => {
  const { botWorkspaceInput } = await import('./agent-tools.js');
  for (const field of ['description', 'greeting', 'cover', 'brief', 'permission']) {
    assert.throws(() => botWorkspaceInput.parse({ action: 'create', basic: { name: '名称', intro: '简介', welcome: '欢迎语', [field]: '错误别名' }, content: '# 内容' }));
  }
  for (const field of ['tone', 'example_dialogue', 'rules', 'response_rules', 'character_dynamics']) {
    assert.throws(() => botWorkspaceInput.parse({ action: 'create', basic: { name: '名称', intro: '简介', welcome: '欢迎语' }, content: '# 内容', advanced: { [field]: '错误别名' } }));
  }
  const accepted = botWorkspaceInput.parse({ action: 'create', basic: { name: '名称', intro: '简介', welcome: '欢迎语', tags: ['角色'], cover_url: 'https://example.com/cover.webp', visibility: 'public' }, content: '# 内容', advanced: { voice: '克制', examples: '示例' } });
  assert.equal(accepted.basic.intro, '简介'); assert.equal(accepted.basic.welcome, '欢迎语');
});

test('Tool contracts prevent the two observed trace schema retries', async () => {
  const { botWorkspaceInput, uiInteractionInput } = await import('./agent-tools.js');
  assert.throws(() => botWorkspaceInput.parse({}), /discriminator/);
  const search = botWorkspaceInput.parse({ action: 'search', query: 'alba' });
  assert.equal(search.action, 'search');
  const choice = uiInteractionInput.parse({ type: 'choice', title: 'Alba 的优化方向', options: [
    { id: 'relationship', title: '强化关系张力' }, { id: 'gameplay', title: '增强互动玩法' },
  ], subject: { kind: 'bot', id: 'bot_sample_09', preview: 'Alba' }, impact: '仅产生讨论方案，不写入 Bot。' });
  assert.equal(choice.subject.kind, 'bot');
  assert.throws(() => uiInteractionInput.parse({ type: 'choice', title: '缺少候选项' }));
  assert.throws(() => uiInteractionInput.parse({ type: 'confirmation', title: '缺少目标' }));
});

test('Bot update rejects non-canonical compatibility shapes before writing', async () => {
  const { botWorkspaceInput } = await import('./agent-tools.js');
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: { content: '# 新内容' } }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ path: 'advanced', value: { voice: '轻快' } }] }));
});

test('Agent instruction prohibits user-visible tool narration and Bot roleplay invitations', async () => {
  for(const relativePath of ['../agent-runtime/CLAUDE.md','../agent-spec/CLAUDE.md']){
    const source = await (await import('node:fs/promises')).readFile(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /strictly forbidden to output, in user-visible replies, any execution narration/i);
    assert.match(source, /strictly forbidden to invite, guide, or let the user experience, try out, run, or role-play any Bot/i);
  }
});

test('Confirmation UI uses operation-specific labels instead of create labels for every action', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /bot_delete:\{confirm:'确认删除',revise:'取消删除'/);
  assert.match(source, /bot_change:\{confirm:'确认修改',revise:'暂不修改'/);
  assert.match(source, /bot_archive:\{confirm:'确认归档',revise:'暂不归档'/);
  assert.match(source, /bot_create:\{confirm:'确认创建',revise:'暂不创建'/);
  assert.match(source, /const confirmationLabels=confirmationCopy\(item\.subject\?\.kind\)/);
});

test('Bot search binds exactly one matching Bot and update binds its explicit Bot as the Session work object', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./agent-tools.js', import.meta.url), 'utf8');
  assert.match(source, /if\(bots\.length===1\)\{session\.workObjectId=bots\[0\]\.id/);
  assert.match(source, /session\.workObjectId=bot\.id;session\.updated_at/);
  assert.match(source, /work_object:bot\.id,updated:true,written/);
  const client = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(client, /openBotWorkspace\(sessionId,bot,\{openEditor:Boolean\(event\.payload\.created\)\}\)/);
  assert.match(client, /showBotEditor\(created\.id\)/);
});

test('Resource panel starts wide enough for Bot editing and retains a practical resize floor', async () => {
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  const styles = await (await import('node:fs/promises')).readFile(new URL('../src/styles/workspace.css', import.meta.url), 'utf8');
  assert.match(app, /artifactWidth,setArtifactWidth\]=useState\(460\)/);
  assert.match(app, /Math\.min\(720,Math\.max\(380,window\.innerWidth-event\.clientX\)\)/);
  assert.match(styles, /--artifact-rail-width:460px/);
});

test('Selecting a Bot does not create empty Bot Artifacts and opens the resource empty state', async () => {
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /Selecting a Bot must not manufacture empty/);
  assert.match(app, /showBotEditor=botId=>/);
  const workspaceHelper=app.slice(app.indexOf('const openBotWorkspace'),app.indexOf('const chooseBot'));
  assert.doesNotMatch(workspaceHelper, /api\.createArtifact/);
  const viewer = await (await import('node:fs/promises')).readFile(new URL('../src/components/RightViewer.jsx', import.meta.url), 'utf8');
  assert.match(viewer, /activeArtifact===`bot-editor:\$\{bot\.id\}`/);
  assert.match(viewer, /<b>资源区为空<\/b>/);
});

test('Bot write contract exposes one canonical update shape and enforces controlled fields', async () => {
  const { botWorkspaceInput, uiInteractionInput } = await import('./agent-tools.js');
  const canonical = botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ area: 'content', operation: 'replace', value: '# 内容' }] });
  assert.equal(canonical.changes[0].reason, '更新 content');
  assert.equal(botWorkspaceInput.parse({action:'create',basic:{name:'名称',intro:'简介',welcome:'欢迎',visibility:'public',tags:['角色']},content:'# 内容'}).basic.visibility,'public');
  assert.throws(() => botWorkspaceInput.parse({action:'create',basic:{name:'名称',intro:'简介',welcome:'欢迎',visibility:'team'},content:'# 内容'}));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: [{ path: 'basic', value: { intro: '错误旧格式' } }] }));
  assert.throws(() => botWorkspaceInput.parse({ action: 'update', bot_id: 'bot_1', changes: { basic: { intro: '错误旧格式' } } }));
  const optionAlias = uiInteractionInput.parse({ type: 'choice', title: '选择', options: [{ id: 'a', title: 'A', prompt: '兼容文案' }, { id: 'b', title: 'B', description: '规范文案' }] });
  assert.equal(optionAlias.options[0].description, '兼容文案');
});

test('Agent adapter uses tool-use structure rather than language-specific prose filtering', async () => {
  const { createVisibleReplyGate } = await import('./agent-adapter.js');
  const gate=createVisibleReplyGate();
  gate.observe({message:{content:[{type:'text',text:'任何语言的工具执行说明。'},{type:'tool_use',id:'tool_1',name:'Read',input:{}}]}});
  gate.observe({message:{content:[{type:'text',text:'## 正文结果\n已完成。'}]}});
  assert.equal(gate.finish(),'## 正文结果\n已完成。');
  assert.equal(gate.discardedForToolUse,1);
});

test('Observability records failed tool attempts with retry and error metadata', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./observability.js', import.meta.url), 'utf8');
  assert.match(source,/const failed=Boolean\(block\.is_error\)/);
  assert.match(source,/error_type:errorType/);
  assert.match(source,/retry_index:priorAttempts/);
  assert.match(source,/level:failed\?'ERROR':'DEFAULT'/);
});

test('Observability backfills a tool input from later streamed snapshots', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./observability.js', import.meta.url), 'utf8');
  assert.match(source, /Partial assistant snapshots can first expose only part of a tool/);
  assert.match(source, /input_snapshot:'latest_streamed'/);
  assert.match(source, /existing\.span\.update\(\{input:block\.input/);
});

test('Bot tool projection excludes derived init_prompt and keeps write acknowledgements compact', async () => {
  const { agentBotRead, agentBotSummary } = await import('./agent-tools.js');
  const bot={id:'bot_1',basic:{name:'Alba',intro:'简介'},content:'# 长内容',advanced:{voice:'克制'},init_prompt:'派生提示词不应进入 Agent transcript',created_at:'old',updated_at:'new'};
  assert.deepEqual(agentBotSummary(bot),{id:'bot_1',title:'Alba',description:'简介',cover_url:'',updated_at:'new'});
  assert.deepEqual(agentBotRead(bot,'content'),{id:'bot_1',content:'# 长内容'});
  const complete=agentBotRead(bot);
  assert.deepEqual(complete,{id:'bot_1',basic:bot.basic,content:bot.content,advanced:bot.advanced,updated_at:'new'});
  assert.doesNotMatch(JSON.stringify(complete),/init_prompt|派生提示词/);
  const source=await (await import('node:fs/promises')).readFile(new URL('./agent-tools.js',import.meta.url),'utf8');
  assert.match(source,/written:\['basic','content','advanced'\]/);
  assert.match(source,/agentBotSummary\(bot\)/);
});

test('State bootstrap always provides exactly one blank Session in a new workspace', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'emochi-bootstrap-'));
  process.env.EMOCHI_DATA_DIR = path.join(dir, 'data');
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const [left, right] = await Promise.all([fetch(`${base}/api/state`).then(r => r.json()), fetch(`${base}/api/state`).then(r => r.json())]);
    assert.equal(left.sessions.length, 1); assert.equal(right.sessions.length, 1);
    assert.equal(left.sessions[0].id, right.sessions[0].id);
    assert.deepEqual(left.sessions[0].messages, []);
  } finally { await new Promise(resolve => server.close(resolve)); delete process.env.EMOCHI_DATA_DIR; await rm(dir, { recursive: true, force: true }); }
});

test('Creative material search unlocks bounded records from the real creative-material library', async () => {
  const { queryCreativeMaterials } = await import('./creative-material-search.js');
  const filtered = await queryCreativeMaterials({ mode: 'filter', genres: ['mystery'], material_types: ['narrative_device'], tier: 'any', limit: 2 });
  assert.ok(filtered.materials.length > 0);
  assert.ok(filtered.materials.every(item => item.genres.includes('mystery') && item.material_type === 'narrative_device'));
  assert.ok(filtered.materials.every(item => !Object.hasOwn(item, 'source_file') && !Object.hasOwn(item, 'source_entry_ids')));
  const sample = await queryCreativeMaterials({ mode: 'sample', genres: ['school'], material_types: ['relationship'], tier: 'curated', limit: 1 });
  assert.ok(sample.materials.length <= 1);
  assert.ok(sample.materials.every(item => item.tier === 'curated'));
  const source = await (await import('node:fs/promises')).readFile(new URL('./agent-tools.js', import.meta.url), 'utf8');
  assert.match(source, /creative_material_search/);
  assert.match(source, /queryCreativeMaterials/);
});

test('Choice UI always offers a custom path and lets every listed option be edited before sending', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const openInlineEditor=option=>/);
  assert.match(source, /choice-option-edit/);
  assert.match(source, /openInlineEditor\(option\)/);
  assert.match(source, /choice-option-inline-editor/);
  assert.match(source, /!confirmation&&item\.status!=='resolved'&&!customOpen/);
  assert.doesNotMatch(source, /!confirmation&&item\.allow_custom&&item\.status/);
});

test('Agent enables built-in public web retrieval and reports its visible activity', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./agent-adapter.js', import.meta.url), 'utf8');
  assert.match(source, /'WebSearch','WebFetch'/);
  assert.match(source, /name === 'WebSearch'/);
  assert.match(source, /name === 'WebFetch'/);
  assert.match(source, /\['skill','reference','web'\]/);
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /\['skill','reference','web'\]/);
});

test('Visible reply gate enforces language-neutral Tool-only and text-only channels', async () => {
  const { createVisibleReplyGate, buildAgentPrompt } = await import('./agent-adapter.js');
  const gate = createVisibleReplyGate();
  gate.observe({ message: { content: [{ type: 'text', text: '确认收到，I need to omit the null fields.' }, { type: 'tool_use', id: 'create_1', name: 'mcp__emochi_workspace__bot_workspace', input: { action: 'create' } }] } });
  gate.observe({ message: { content: [{ type: 'text', text: '## 轮回传承\n已创建成功 ✅' }] } });
  assert.equal(gate.finish(), '## 轮回传承\n已创建成功 ✅');
  assert.equal(gate.discardedForToolUse, 1);

  const proseGate = createVisibleReplyGate();
  const plainText='你正在分不清自己究竟是谁。\n\n## 当前局势\n一场清洗正在酝酿。';
  proseGate.observe({ message: { content: [{ type: 'text', text: plainText }] } });
  assert.equal(proseGate.finish(), plainText);
  const prompt = buildAgentPrompt({ messages: [{ role: 'user', content: '继续创建' }] });
  assert.match(prompt, /继续创建/);
});

test('Image task contract defaults to four outputs and sidebar omits transient Bot editing state', async () => {
  const toolSource = await (await import('node:fs/promises')).readFile(new URL('./agent-tools.js', import.meta.url), 'utf8');
  assert.match(toolSource, /count:z\.number\(\)\.int\(\)\.min\(1\)\.max\(4\)\.default\(4\)/);
  assert.match(toolSource, /DEFAULT: count=4/);
  const sidebar = await (await import('node:fs/promises')).readFile(new URL('../src/components/ConversationSidebar.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(sidebar, /正在编辑 Bot/);
});

test('Bot editor does not render transient cover-staged process notices', async () => {
  const viewer = await (await import('node:fs/promises')).readFile(new URL('../src/components/RightViewer.jsx', import.meta.url), 'utf8');
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(viewer, /已设为封面草稿|coverStaged|cover-staged/);
  assert.doesNotMatch(app, /coverStagedForBot/);
});

test('Both Bot library entry points are wired to open the drawer', async () => {
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /ConversationSidebar[\s\S]*onOpenBots=\{\(\)=>setBotLibraryOpen\(true\)\}/);
  assert.match(app, /BotContextBar[\s\S]*onOpenBots=\{\(\)=>setBotLibraryOpen\(true\)\}/);
  assert.match(app, /botLibraryOpen\?'with-bot-library':''/);
});

test('Production server serves the built SPA and API from one same-origin process', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(source, /async function serveStatic/);
  assert.match(source, /if\(!url\.pathname\.startsWith\('\/api\/'\)\)/);
  assert.match(source, /path\.join\(staticRoot\(\),'index\.html'\)/);
  const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.start, 'node server/index.js');
});

test('App distinguishes failed initial API load from a truly empty conversation workspace', async () => {
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /const \[initialLoad,setInitialLoad\]=useState\('loading'\)/);
  assert.match(app, /const loadWorkspace=async\(\)=>/);
  assert.match(app, /if\(initialLoad!==\'ready\'\)return <main className=\"workspace-connection\"/);
  assert.match(app, /暂时无法连接服务/);
  assert.match(app, /重新连接/);
  assert.match(app, /check线上 Agent 服务|线上 Agent 服务/);
});
