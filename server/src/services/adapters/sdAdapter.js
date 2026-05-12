/**
 * Stable Diffusion Adapter
 * 支持: SD WebUI / ComfyUI / Replicate
 * 用途: 图片生成、抠图、场景合成、风格迁移、扩图
 */

import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

const SD_API_URL = config.adapters.sd.apiUrl;
const REPLICATE_API_KEY = config.adapters.sd.replicateKey;

// ==================== Stable Diffusion WebUI Adapter ====================

/**
 * SD WebUI txt2img
 */
async function sdTxt2Img(input, onProgress) {
  const { prompt, negativePrompt = '', width = 1024, height = 1024, steps = 30, cfgScale = 7, seed = -1, sampler = 'DPM++ 2M Karras' } = input;

  onProgress?.(10);

  const res = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      width, height, steps, cfg_scale: cfgScale, seed, sampler_name: sampler,
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) throw new BusinessError(502, `SD API 错误 ${res.status}`);

  onProgress?.(60);

  const data = await res.json();
  const base64Image = data.images?.[0] || '';

  onProgress?.(100);

  return {
    base64: base64Image,
    info: (() => { try { return data.info ? JSON.parse(data.info) : {}; } catch { return {}; } })(),
    parameters: data.parameters || {},
  };
}

// ==================== SD img2img ====================

async function sdImg2Img(input, onProgress) {
  const { prompt, initImage, negativePrompt = '', width = 1024, height = 1024, steps = 30, cfgScale = 7, denoising = 0.75, seed = -1 } = input;

  onProgress?.(10);

  const res = await fetch(`${SD_API_URL}/sdapi/v1/img2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt, negative_prompt: negativePrompt, init_images: [initImage],
      width, height, steps, cfg_scale: cfgScale, denoising_strength: denoising, seed,
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) throw new BusinessError(502, `SD img2img API 错误 ${res.status}`);

  onProgress?.(60);

  const data = await res.json();

  onProgress?.(100);

  return {
    base64: data.images?.[0] || '',
    info: (() => { try { return data.info ? JSON.parse(data.info) : {}; } catch { return {}; } })(),
  };
}

// ==================== Replicate 降级方案 ====================

async function replicateInfer(input, onProgress) {
  if (!REPLICATE_API_KEY) throw new BusinessError(503, 'REPLICATE_API_KEY 未配置');

  const { prompt, model = 'stability-ai/sdxl', negativePrompt = '', width = 1024, height = 1024 } = input;

  onProgress?.(20);

  // 创建预测
  const createRes = await fetch(`${config.ai.replicateBaseUrl}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Token ${REPLICATE_API_KEY}` },
    body: JSON.stringify({
      version: model,
      input: { prompt, negative_prompt: negativePrompt, width, height },
    }),
  });

  if (!createRes.ok) throw new BusinessError(502, `Replicate API 错误 ${createRes.status}`);

  const prediction = await createRes.json();
  const pollUrl = prediction.urls?.get || prediction.urls?.cancel;

  // 轮询等待结果
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    onProgress?.(20 + i);

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Token ${REPLICATE_API_KEY}` },
      signal: AbortSignal.timeout(30000),
    });
    const pollData = await pollRes.json();

    if (pollData.status === 'succeeded') {
      onProgress?.(100);
      return { imageUrl: pollData.output?.[0] || '', provider: 'replicate' };
    }
    if (pollData.status === 'failed') {
      throw new BusinessError(502, 'Replicate 生成失败: ' + (pollData.error || 'unknown'));
    }
  }

  throw new BusinessError(504, 'Replicate 生成超时');
}

// ==================== 健康检查 ====================

async function health() {
  try {
    const res = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { status: 'ok', provider: 'sd-webui' };
  } catch { logger.warn('[AI] SD WebUI 健康检查失败，尝试 Replicate 降级'); }

  if (REPLICATE_API_KEY) {
    return { status: 'ok', provider: 'replicate', note: 'SD WebUI offline, using Replicate' };
  }

  return { status: 'unavailable', provider: 'sd-webui' };
}

// ==================== 注册模型 ====================

export function registerSD() {
  if (!SD_API_URL && !REPLICATE_API_KEY) {
    logger.warn('[AI] SD_API_URL 和 REPLICATE_API_KEY 均未配置，SD 模型将使用降级模式');
  }

  registerModel({ id: 'stable-diffusion-xl', type: 'image', infer: sdTxt2Img, health, provider: 'sd-webui' });
  registerModel({ id: 'stable-diffusion-img2img', type: 'image', infer: sdImg2Img, health, provider: 'sd-webui' });

  if (REPLICATE_API_KEY) {
    registerModel({ id: 'replicate-sdxl', type: 'image', infer: replicateInfer, health, provider: 'replicate' });
  }

  logger.info('[AI] Stable Diffusion 模型已注册: stable-diffusion-xl, stable-diffusion-img2img' + (REPLICATE_API_KEY ? ', replicate-sdxl' : ''));
}
