import process from 'node:process';

function imageGatewayConfig() {
  const required=['IMAGE_GATEWAY_BASE_URL','IMAGE_GATEWAY_MODEL','IMAGE_GATEWAY_API_KEY'];
  const missing=required.filter(key=>!process.env[key]);
  return missing.length?{configured:false,missing}:{configured:true,baseUrl:process.env.IMAGE_GATEWAY_BASE_URL.replace(/\/$/,''),model:process.env.IMAGE_GATEWAY_MODEL,apiKey:process.env.IMAGE_GATEWAY_API_KEY};
}

const IMAGE_MODEL = null;
const MAX_DIMENSION = 1392;
const DEFAULT_SIZE = '1024x1024';
const DEFAULT_STEPS = 4;
const DEFAULT_COUNT = 4;
const MAX_COUNT = 4;

function validateSize(size) {
  if (!size || size === 'auto') return size || DEFAULT_SIZE;
  const match = /^(\d{2,4})x(\d{2,4})$/.exec(size);
  if (!match) throw Object.assign(new Error('图片尺寸必须为 WIDTHxHEIGHT 或 auto。'), { code: 'invalid_image_request', retryable: false });
  const [, width, height] = match.map(Number);
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) throw Object.assign(new Error(`图片宽高不能超过 ${MAX_DIMENSION}。`), { code: 'invalid_image_request', retryable: false });
  return size;
}

function requestBody(request) {
  const variants = Array.isArray(request.variants) ? request.variants.filter((variant) => String(variant?.prompt || '').trim()) : [];
  const prompt = String(request.prompt || variants[0]?.prompt || '').trim();
  if (!prompt) throw Object.assign(new Error('图片生成需要明确的 prompt。'), { code: 'invalid_image_request', retryable: false });
  const size = validateSize(request.size || DEFAULT_SIZE);
  const steps = request.steps == null ? DEFAULT_STEPS : Number(request.steps);
  if (!Number.isInteger(steps) || steps < 1) throw Object.assign(new Error('steps 必须是正整数。'), { code: 'invalid_image_request', retryable: false });
  // Four is the product default. Variants describe available creative directions,
  // not an implicit instruction to reduce the requested output count.
  const count = request.count == null ? DEFAULT_COUNT : Number(request.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) throw Object.assign(new Error(`每轮图片生成数量必须为 1-${MAX_COUNT}。`), { code: 'invalid_image_request', retryable: false });
  const styleLocked = Boolean(request.style_locked);
  return { prompt, size, steps, count, styleLocked, variants };
}

function classifyError(status, payload) {
  const message = payload?.error?.message || payload?.message || `图片服务返回 HTTP ${status}`;
  if (status === 400 || status === 404) return { code: 'invalid_image_request', message, retryable: false };
  if (status === 401 || status === 403) return { code: 'image_authorization_failed', message, retryable: false };
  if (status === 429) return { code: 'image_rate_limited', message, retryable: true };
  return { code: 'image_provider_error', message, retryable: status >= 500 };
}

async function callImageEndpoint(pathname, body) {
  const gateway = imageGatewayConfig();
  if (!gateway.configured) throw Object.assign(new Error('图片服务尚未配置。'), { code: 'image_gateway_not_configured', retryable: false });
  body = { model: gateway.model, ...body };
  const response = await fetch(`${gateway.baseUrl}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${gateway.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw Object.assign(new Error(classifyError(response.status, payload).message), classifyError(response.status, payload));
  const urls = (payload?.data || []).map((item) => item?.url).filter(Boolean);
  if (!urls.length) throw Object.assign(new Error('图片服务未返回可用图片 URL。'), { code: 'image_empty_result', retryable: true });
  return urls.map((url) => ({ artifact_id: `artifact_${crypto.randomUUID()}`, url }));
}

function normalizePrompt(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function buildImageVariants(prompt, count, styleLocked, sourceVariants = []) {
  const directions = [
    {
      title: '候选 1 · 近景人物钩子',
      instruction: '强制采用人物近景叙事：镜头裁到胸部或腰部，主体偏画面一侧，清楚表现脸部、眼神和一个关键手部动作。环境只保留少量虚化线索。不要使用全身站在中央舞台或广角远景构图。',
    },
    {
      title: '候选 2 · 广角空间叙事',
      instruction: '强制采用广角环境叙事：主体为全身或小于画面一半的行动者，明确置于地点内部；使用前景、中景、远景建立空间纵深。让环境、观众、建筑或道具说明故事。不要使用近景肖像或主体居中海报姿势。',
    },
    {
      title: '候选 3 · 冲突瞬间',
      instruction: '强制选择正在发生的冲突瞬间：使用低机位、侧面或从另一角色肩后看的视角；主体必须处于转身、伸手、停步、对峙或即将做决定的动作中。强调明确光源和戏剧化明暗关系。不要使用静止的正面站姿。',
    },
    {
      title: '候选 4 · 留白海报悬念',
      instruction: '强制采用图形化海报构图：主体位于画面边缘或下方三分之一，留下大面积具有叙事意味的负空间；用轮廓、道具、门窗、灯光或远处人影制造悬念。不要重复前三张的人物站位、镜头高度或环境布局。',
    },
  ];
  const defaultStyles = [
    { name: 'Dark Fantasy Aesthetic（暗黑幻想）', prompt: '视觉风格固定为 Dark Fantasy Aesthetic：暗黑幻想氛围、深邃阴影、神秘材质、戏剧化光源与史诗感环境叙事。' },
    { name: 'Fresh and Moe Anime（清新萌系动漫）', prompt: '视觉风格固定为 Fresh and Moe Anime：清新明亮的萌系动漫表达、干净线条、柔和色彩、亲和而高辨识的角色与场景。' },
    { name: 'Real European and American Races（欧美写实真人）', prompt: '视觉风格固定为 Real European and American Races：欧美写实真人电影感、真实肤质与材质、自然比例、可信环境光和摄影式空间关系。' },
    { name: 'Line Art with Flat Colors（线稿平涂）', prompt: '视觉风格固定为 Line Art with Flat Colors：清晰线稿、平涂色块、简洁图形层次、鲜明轮廓与海报式可读性。' },
  ];
  return directions.slice(0, count).map((direction, index) => {
    const sourcePrompt = String(sourceVariants[index]?.prompt || prompt).trim();
    return {
      title: sourceVariants[index]?.title || (styleLocked ? direction.title : `${defaultStyles[index].name} · ${direction.title}`),
      // The direction is a hard composition override and is appended last so it
      // wins when the common prompt contains a generic centered portrait scene.
      prompt: `${sourcePrompt} ${styleLocked ? '' : defaultStyles[index].prompt} ${direction.instruction}`.trim(),
    };
  });
}

export async function executeImageTask(request) {
  const { count, styleLocked, variants: requestedVariants, ...base } = requestBody(request);
  const imageUrls = (request.images || []).map((item) => item?.image_url).filter(Boolean);
  if (imageUrls.length > 16) throw Object.assign(new Error('图生图最多支持 16 张输入图片。'), { code: 'invalid_image_request', retryable: false });
  const pathname = imageUrls.length ? '/v1/images/edits' : '/v1/images/generations';
  const supplied = requestedVariants.slice(0, count);
  const normalized = new Set(supplied.map((variant) => normalizePrompt(variant.prompt)));
  const hasDistinctVariants = supplied.length === count && normalized.size === supplied.length;
  // Every multi-candidate request receives separate composition prompts. This
  // prevents a provider from receiving the same base prompt four times. For an
  // unspecified style, the backend also pins the four default style directions.
  // A style-locked request missing valid variants falls back to same-style
  // composition variants rather than silently fanning out one prompt.
  const sourceVariants = count > 1 && hasDistinctVariants ? supplied : [];
  const variants = buildImageVariants(base.prompt, count, styleLocked, sourceVariants);
  // Yata's documented contract does not expose n/count/variation fields. The
  // orchestration layer creates independent natural-language prompts and only
  // sends the documented request fields upstream.
  const results = await Promise.allSettled(variants.map((variant) => {
    const body = imageUrls.length ? { ...base, prompt: variant.prompt, images: imageUrls.map((image_url) => ({ image_url })) } : { ...base, prompt: variant.prompt };
    return callImageEndpoint(pathname, body).then((artifacts) => ({ artifacts, title: variant.title }));
  }));
  const artifacts = results.flatMap((result) => result.status === 'fulfilled' ? result.value.artifacts.map((artifact) => ({ ...artifact, title: result.value.title })) : []);
  if (!artifacts.length) {
    const failure = results.find((result) => result.status === 'rejected');
    throw failure?.reason || Object.assign(new Error('图片服务未返回可用图片。'), { code: 'image_empty_result', retryable: true });
  }
  return artifacts;
}

export async function collectImageAttempts(count, invoke) {
  const results = await Promise.allSettled(Array.from({ length: count }, () => invoke()));
  const artifacts = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  if (!artifacts.length) {
    const failure = results.find((result) => result.status === 'rejected');
    throw failure?.reason || Object.assign(new Error('图片服务未返回可用图片。'), { code: 'image_empty_result', retryable: true });
  }
  return artifacts;
}

export { IMAGE_MODEL };
