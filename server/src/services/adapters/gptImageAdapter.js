/**
 * GPT Image Adapter — 对接 NewAPI gpt-image-2 模型
 * 支持: 文生图 / 图生图 / 多尺寸输出 / 批量生成
 * 端点: OpenAI-compatible /images/generations
 */
import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import { adapterConfig } from '../../config/index.js';
import logger from '../../utils/logger.js';

const API_KEY = adapterConfig.openai.apiKey;
const BASE_URL = adapterConfig.openai.baseUrl;

// ==================== gpt-image-2 txt2img ====================

async function gptImageTxt2Img(input, onProgress) {
  if (!API_KEY) throw new BusinessError(503, 'OPENAI_API_KEY 未配置，gpt-image-2 不可用');

  const {
    prompt, negativePrompt = '', size = '1024x1024', n = 1,
    responseFormat = 'url', quality = 'standard', style = 'vivid',
  } = input;

  onProgress?.(10);

  const body = {
    model: 'gpt-image-2',
    prompt: negativePrompt ? `${prompt} --no ${negativePrompt}` : prompt,
    n,
    size,
    response_format: responseFormat,
    quality,
    style,
  };

  onProgress?.(30);

  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new BusinessError(502, `gpt-image-2 API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  onProgress?.(70);

  const data = await res.json();
  const images = (data.data || []).map((img) => ({
    url: img.url || null,
    b64Json: img.b64_json || null,
    revisedPrompt: img.revised_prompt || null,
  }));

  onProgress?.(100);

  return {
    images,
    model: 'gpt-image-2',
    created: data.created,
    count: images.length,
  };
}

// ==================== gpt-image-2 多尺寸批量生成 ====================

async function gptImageMultiSize(input, onProgress) {
  const { prompt, sizes = ['1024x1024'], negativePrompt = '', quality = 'standard' } = input;
  const results = {};

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    onProgress?.((i / sizes.length) * 100);

    const res = await gptImageTxt2Img({
      prompt, negativePrompt, size, n: 1, quality,
      responseFormat: 'url',
    }, undefined);

    results[size] = res.images[0]?.url || null;
  }

  onProgress?.(100);

  return { sizes: results, prompt, model: 'gpt-image-2' };
}

// ==================== 健康检查 ====================

async function health() {
  if (!API_KEY) return { status: 'no-api-key', provider: 'gpt-image-2' };
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.ok ? 'ok' : 'error', provider: 'gpt-image-2' };
  } catch {
    return { status: 'unavailable', provider: 'gpt-image-2' };
  }
}

// ==================== 注册 ====================

export async function registerGptImage() {
  if (!API_KEY) {
    logger.warn('[AI] OPENAI_API_KEY 未配置，gpt-image-2 将跳过注册');
    return;
  }

  registerModel({
    id: 'gpt-image-2',
    type: 'image',
    infer: gptImageTxt2Img,
    health,
    provider: 'openai',
  });

  registerModel({
    id: 'gpt-image-2-multi-size',
    type: 'image',
    infer: gptImageMultiSize,
    health,
    provider: 'openai',
  });

  logger.info('[AI] gpt-image-2 模型已注册 (image)');
}
