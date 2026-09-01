import test from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

test('image generation creates one upstream request per distinct variant and preserves each result', async () => {
  process.env.IMAGE_GATEWAY_BASE_URL = 'https://images.example.test';
  process.env.IMAGE_GATEWAY_MODEL = 'yata-sirius-test';
  process.env.IMAGE_GATEWAY_API_KEY = 'test-key';
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body), authorization: options.headers.Authorization });
    return new Response(JSON.stringify({ data: [{ url: `https://cdn.example.test/${requests.length}.png` }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { executeImageTask } = await import(`./image-service.js?test=${Date.now()}`);
    const assets = await executeImageTask({
      title: '封面候选', purpose: 'cover', count: 2, size: '768x1024', style_locked: true,
      prompt: '共享底稿不应覆盖各候选。',
      variants: [
        { id: 'close-up', title: '近景', prompt: '雨夜回眸，人物近景，透明伞。' },
        { id: 'wide', title: '远景', prompt: '雨夜老街，人物远景，透明伞。' },
      ],
    });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map(item => item.url), ['https://images.example.test/v1/images/generations', 'https://images.example.test/v1/images/generations']);
    assert.ok(requests[0].body.prompt.startsWith('雨夜回眸，人物近景，透明伞。'));
    assert.ok(requests[1].body.prompt.startsWith('雨夜老街，人物远景，透明伞。'));
    assert.notEqual(requests[0].body.prompt, requests[1].body.prompt);
    assert.ok(requests.every(item => item.body.model === 'yata-sirius-test' && item.body.size === '768x1024'));
    assert.ok(requests.every(item => !('count' in item.body) && !('variants' in item.body) && !('styleLocked' in item.body)));
    assert.deepEqual(assets.map(item => ({ title: item.title, url: item.url })), [
      { title: '近景', url: 'https://cdn.example.test/1.png' },
      { title: '远景', url: 'https://cdn.example.test/2.png' },
    ]);
  } finally { globalThis.fetch = originalFetch; Object.assign(process.env, originalEnv); }
});


test('image generation defaults to four images even when the agent supplies fewer variants', async () => {
  process.env.IMAGE_GATEWAY_BASE_URL = 'https://images.example.test';
  process.env.IMAGE_GATEWAY_MODEL = 'yata-sirius-test';
  process.env.IMAGE_GATEWAY_API_KEY = 'test-key';
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ data: [{ url: `https://cdn.example.test/default-${requests.length}.png` }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { executeImageTask } = await import(`./image-service.js?default-four=${Date.now()}`);
    const assets = await executeImageTask({
      title: '默认四张', purpose: 'cover', prompt: '轮回传承，古风人物封面。',
      variants: [
        { id: 'portrait', title: '人物近景', prompt: '古风人物近景，清晰面部。' },
        { id: 'scene', title: '空间叙事', prompt: '古风人物置于轮回殿堂。' },
      ],
    });
    assert.equal(requests.length, 4);
    assert.equal(assets.length, 4);
    assert.equal(new Set(requests.map(({ body }) => body.prompt)).size, 4);
  } finally { globalThis.fetch = originalFetch; Object.assign(process.env, originalEnv); }
});

test('image generation gives a stable actionable error when the provider returns no image URL', async () => {
  process.env.IMAGE_GATEWAY_BASE_URL = 'https://images.example.test';
  process.env.IMAGE_GATEWAY_MODEL = 'yata-sirius-test';
  process.env.IMAGE_GATEWAY_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const { executeImageTask } = await import(`./image-service.js?empty=${Date.now()}`);
    await assert.rejects(
      () => executeImageTask({ title: '空结果', prompt: '测试', count: 1, variants: [{ id: 'v1', title: '候选', prompt: '测试' }] }),
      error => error.code === 'image_empty_result' && error.retryable === true,
    );
  } finally { globalThis.fetch = originalFetch; Object.assign(process.env, originalEnv); }
});
