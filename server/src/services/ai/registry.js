/**
 * AI 模型注册中心 — 模型注册/查询 + 默认映射 + 降级链
 * 提取自 aiEngine.js
 */
import logger from '../../utils/logger.js';
import { BusinessError } from '../../utils/businessError.js';
import { ERROR_CODE } from '../../constants/errorCode.js';

const registry = new Map();

export function registerModel(model) {
  if (!model.id || !model.type || !model.infer) {
    throw new BusinessError(ERROR_CODE.PARAM_ERROR);
  }
  registry.set(model.id, model);
  logger.info(`[AI] 模型已注册: ${model.id} (${model.type})`);
}

export function getModel(id) {
  const model = registry.get(id);
  if (!model) throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `AI model not registered: ${id}`);
  return model;
}

export function listModels(type = '') {
  const all = Array.from(registry.values());
  return type ? all.filter(m => m.type === type) : all;
}

// ─── 任务类型 → 默认模型映射 ───
const DEFAULT_MODEL_MAP = {
  cutout: 'stable-diffusion-img2img', cutout_hq: 'stable-diffusion-img2img', bg_white: 'stable-diffusion-img2img',
  scene_gen: 'gpt-image-2', image_enhance: 'stable-diffusion-img2img', img_expand: 'stable-diffusion-img2img',
  ghost_mannequin: 'stable-diffusion-img2img', poster_gen: 'gpt-image-2', color_swap: 'stable-diffusion-img2img',
  style_transfer: 'stable-diffusion-img2img', virtual_tryon: 'stable-diffusion-img2img',
  detail_long_image: 'gpt-image-2', multi_size_export: 'gpt-image-2-multi-size',
  img2video: 'seedance', multi2video: 'seedance', video_edit: 'seedance',
  action_migrate: 'seedance-action-migrate', digital_human: 'seedance', batch_video: 'seedance-batch',
  text_gen: 'gpt-4o-mini', script_gen: 'gpt-4o', title_gen: 'gpt-4o-mini',
  compliance_check: 'claude-sonnet-4-6', translate: 'gpt-4o-mini',
  tts: 'edge-tts', voice_clone: 'elevenlabs-voice-clone',
};

export function getDefaultModel(taskType) {
  return DEFAULT_MODEL_MAP[taskType] || null;
}

// ─── 降级链 ───
const FALLBACK_CHAIN = {
  'gpt-4o': ['gpt-4o-mini', 'claude-sonnet-4-6'], 'gpt-4o-mini': ['claude-haiku-4-5'],
  'claude-sonnet-4-6': ['claude-haiku-4-5', 'gpt-4o-mini'], 'claude-haiku-4-5': ['gpt-4o-mini'],
  'seedance-2.0': ['pixeldance'], 'pixeldance': ['seedance-2.0'], 'seedance': ['cogvideo'],
  'cogvideo': ['stable-diffusion-xl'], 'gpt-image-2': ['stable-diffusion-xl', 'stability-sdxl'],
  'dall-e-3': ['gpt-image-2', 'stable-diffusion-xl'], 'rmbg-2.0': ['sam2-matting'], 'iclight-v2': ['bg-postprocess'],
};

let RUNTIME_FALLBACK_CHAIN = { ...FALLBACK_CHAIN };

export function updateFallbackChain(modelId, chain = []) {
  RUNTIME_FALLBACK_CHAIN[modelId] = chain;
  logger.info('[AIEngine] Fallback chain updated', { modelId, chain });
}

export function getFallbackChain(modelId) {
  return RUNTIME_FALLBACK_CHAIN[modelId] || FALLBACK_CHAIN[modelId] || [];
}

export function getFallbackModel(modelId) {
  return getFallbackChain(modelId);
}

// ─── 用量统计 ───
const usageStats = { total: 0, byModel: {}, byType: {} };

export function trackUsage(modelId) {
  usageStats.total++;
  usageStats.byModel[modelId] = (usageStats.byModel[modelId] || 0) + 1;
  const model = registry.get(modelId);
  if (model) usageStats.byType[model.type] = (usageStats.byType[model.type] || 0) + 1;
}

export function getUsageStats() {
  return { ...usageStats, byModel: { ...usageStats.byModel }, byType: { ...usageStats.byType } };
}

// ─── 健康检查 ───
export async function healthCheck() {
  const results = {};
  for (const [id, model] of registry) {
    try { results[id] = model.health ? await model.health() : { status: 'unknown' }; }
    catch (err) { results[id] = { status: 'error', message: err.message }; }
  }
  return results;
}
