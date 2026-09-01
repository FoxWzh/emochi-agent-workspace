// 冒烟验证：新 observability 打点是否在 Langfuse 生成结构正确的 trace
// 运行：node scripts/smoke-trace.mjs
import process from 'node:process';
try { process.loadEnvFile('.env.local'); } catch {}
process.env.LANGFUSE_AGENT_ID = 'smoke-check'; // 用独立 id，不污染真实轨迹
process.env.LANGFUSE_AGENT_VERSION = 'v1';

const { startAgentTrace, flushObservability } = await import('../server/observability.js');

const trace = startAgentTrace({ sessionId: 'smoke-session-1', bot: { id: 'bot_1', basic: { name: '测试Bot' } }, input: '帮我把欢迎语改成"你好呀"' });
// 模拟 Claude Agent SDK 消息流
trace.onSdkMessage({ type: 'assistant', message: { model: 'deepseek-v4-flash', content: [{ type: 'text', text: '好的，我来帮你修改欢迎语。' }], usage: { input_tokens: 120, output_tokens: 30 } }, parent_tool_use_id: null });
trace.onSdkMessage({ type: 'assistant', message: { model: 'deepseek-v4-flash', content: [{ type: 'tool_use', id: 'tu_1', name: 'bot_workspace', input: { bot_id: 'bot_1', patch: { welcome: '你好呀' } } }], usage: { input_tokens: 30, output_tokens: 10 } }, parent_tool_use_id: null });
trace.onSdkMessage({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: '{"ok":true}' }] }, tool_use_result: { ok: true } });
trace.onSdkMessage({ type: 'assistant', message: { model: 'deepseek-v4-flash', content: [{ type: 'text', text: '已更新 Bot 的欢迎语为"你好呀"。' }], usage: { input_tokens: 20, output_tokens: 15 } }, parent_tool_use_id: null });
trace.onSdkMessage({ type: 'result', subtype: 'success', result: '已更新 Bot 的欢迎语为"你好呀"。', num_turns: 2, total_cost_usd: 0.0012, duration_ms: 1530, stop_reason: 'end_turn' });
trace.end({ content: '已更新 Bot 的欢迎语为"你好呀"。' });
await flushObservability();
await new Promise(r => setTimeout(r, 3000));

// 从 Langfuse 拉取验证
import base64 from 'node:buffer';
import { readFileSync } from 'node:fs';
const vals = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (line && i > 0 && !line.startsWith('#')) vals[line.slice(0, i)] = line.slice(i + 1);
}
const auth = 'Basic ' + Buffer.from(`${vals.LANGFUSE_PUBLIC_KEY}:${vals.LANGFUSE_SECRET_KEY}`).toString('base64');
const host = (vals.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\/+$/, '');
const res = await fetch(`${host}/api/public/traces?limit=1&name=agent:smoke-check`, { headers: { authorization: auth } });
const json = await res.json();
const t = json.data?.[0];
if (!t) { console.log('FAIL: 没找到 smoke-check trace'); process.exit(1); }
const obs = t.observations || [];
console.log('trace:', t.id.slice(0, 12), '| name:', t.name, '| tags:', JSON.stringify(t.tags));
console.log('input :', JSON.stringify(t.input));
console.log('output:', JSON.stringify(t.output).slice(0, 120));
console.log('观测数:', obs.length);
const summary = obs.map(o => `${o.type}:${o.name || '(unnamed)'}`).join(', ');
console.log('观测:', summary);
const gens = obs.filter(o => o.type === 'GENERATION');
const tools = obs.filter(o => o.type === 'SPAN');
const ok = t.name === 'agent:smoke-check' && t.output && String(JSON.stringify(t.output)).includes('你好呀') && gens.length >= 2 && tools.some(o => String(o.name).startsWith('tool:'));
console.log(ok ? 'SMOKE OK' : 'SMOKE FAILED');
process.exit(ok ? 0 : 1);
