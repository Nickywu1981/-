/* global FormData, Blob, atob */
/**
 * Stability AI Adapter（云图片生成）
 * 支持: SDXL / SD3 / 图生图
 * 无需本地 GPU，云端生成
 */

import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import { adapterConfig } from '../../config/index.js';
import logger from '../../utils/logger.js';

const API_KEY = adapterConfig.stability.apiKey;
const BASE_URL = adapterConfig.stability.baseUrl;

// ==================== SDXL txt2img ====================

async function stabilityTxt2Img(input, onProgress) {
  if (!API_KEY) throw new BusinessError(503, 'STABILITY_API_KEY 未配置');

  const { prompt, negativePrompt = '', width = 1024, height = 1024, steps = 30, cfgScale = 7, seed = 0, stylePreset } = input;

  onProgress?.(10);

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('negative_prompt', negativePrompt);
  formData.append('width', String(width));
  formData.append('height', String(height));
  formData.append('steps', String(steps));
  formData.append('cfg_scale', String(cfgScale));
  if (seed) formData.append('seed', String(seed));
  if (stylePreset) formData.append('style_preset', stylePreset);

  onProgress?.(30);

  const res = await fetch(`${BASE_URL}/v2beta/stable-image/generate/sdxl`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error(`[Stability] API 请求失败 ${res.status}: ${err.message || res.statusText}`);
    throw new BusinessError(502, `Stability AI 服务暂时不可用，请稍后重试`);
  }

  onProgress?.(70);

  const data = await res.json();

  onProgress?.(100);

  return {
    base64: data.image || '',
    finishReason: data.finish_reason || 'SUCCESS',
    seed: data.seed || 0,
  };
}

// ==================== img2img ====================

async function stabilityImg2Img(input, onProgress) {
  if (!API_KEY) throw new BusinessError(503, 'STABILITY_API_KEY 未配置');

  const { prompt, initImage, negativePrompt = '', width = 1024, height = 1024, strength = 0.7 } = input;

  onProgress?.(10);

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('negative_prompt', negativePrompt);
  // initImage 应为 base64 字符串，转为 Blob 上传
  const byteString = atob(initImage);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  formData.append('image', new Blob([ab], { type: 'image/png' }), 'init.png');
  formData.append('strength', String(strength));
  formData.append('width', String(width));
  formData.append('height', String(height));

  onProgress?.(30);

  const res = await fetch(`${BASE_URL}/v2beta/stable-image/generate/sd3`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error(`[Stability] API 请求失败 ${res.status}: ${err.message || res.statusText}`);
    throw new BusinessError(502, 'Stability AI 服务暂时不可用，请稍后重试');
  }

  onProgress?.(80);

  const data = await res.json();

  onProgress?.(100);

  return {
    base64: data.image || '',
    finishReason: data.finish_reason || 'SUCCESS',
    seed: data.seed || 0,
  };
}

// ==================== 健康检查 ====================

async function health() {
  if (!API_KEY) return { status: 'unavailable', provider: 'stability' };

  try {
    const res = await fetch(`${BASE_URL}/v2beta/stable-image/generate/sdxl`, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.status < 500 ? 'ok' : 'error', provider: 'stability' };
  } catch (err) {
    logger.error('[AI] Stability AI 健康检查失败', { error: err?.message });
    return { status: 'unavailable', provider: 'stability' };
  }
}

// ==================== 注册 ====================

export function registerStability() {
  if (!API_KEY) {
    logger.warn('[AI] STABILITY_API_KEY 未配置，Stability AI 模型将被跳过');
    return;
  }

  registerModel({ id: 'stability-sdxl', type: 'image', infer: stabilityTxt2Img, health, provider: 'stability' });
  registerModel({ id: 'stability-img2img', type: 'image', infer: stabilityImg2Img, health, provider: 'stability' });

  logger.info('[AI] Stability AI 模型已注册: stability-sdxl, stability-img2img');
}
