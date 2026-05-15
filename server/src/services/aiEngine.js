/**
 * AI 引擎抽象层 (v2.0 Enhanced)
 * 所有 AI 模型通过统一接口接入，支持多供应商切换 + 降级 + 重试 + 用量追踪
 *
 * 子模块:
 *   ai/registry.js — 模型注册中心 + 默认映射 + 降级链 + 用量统计
 */
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { extractUsage } from './tokenMeteringService.js';
import { aiTimeoutMs } from '../config/index.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import {
  registerModel, getModel, listModels, getDefaultModel,
  getFallbackChain, getFallbackModel, updateFallbackChain,
  trackUsage, getUsageStats, healthCheck,
} from './ai/registry.js';

export {
  registerModel, getModel, listModels, getDefaultModel,
  getFallbackChain, getFallbackModel, updateFallbackChain,
  trackUsage, getUsageStats, healthCheck,
};

// ═══════ 推理管线 ═══════

const INFER_CONFIG = { maxRetries: 3, retryDelayMs: 1000, timeoutMs: aiTimeoutMs, enableCache: true, enableDegradation: true };

const inferenceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

export const _cacheCleanupTimer = setInterval(() => {
  try {
    const now = Date.now();
    for (const [key, entry] of inferenceCache) { if (now - entry.timestamp > CACHE_TTL) inferenceCache.delete(key); }
  } catch (e) { logger.warn('[AIEngine] Inference cache cleanup failed', { error: e.message }); }
}, 300000).unref();

export async function infer(modelId, input, options = {}) {
  const { onProgress, maxRetries = INFER_CONFIG.maxRetries, skipCache = false } = options;

  if (INFER_CONFIG.enableCache && !skipCache) {
    const cacheKey = `${modelId}:${JSON.stringify(input)}`;
    const cached = inferenceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) { onProgress?.(100); return { ...cached.result, fromCache: true }; }
  }

  if (INFER_CONFIG.enableCache && !skipCache && typeof input === 'string') {
    try {
      const { getSemantic, recordHit, recordMiss } = await import('./semanticCacheService.js');
      const semanticCached = await getSemantic(modelId, input);
      if (semanticCached) { recordHit(true); onProgress?.(100); return { ...semanticCached, fromCache: true, fromSemanticCache: true }; }
      recordMiss();
    } catch (err) { logger.warn('[AI] 语义缓存读取失败', { modelId, err: err.message }); }
  }

  const startTime = Date.now();
  let lastError = null;
  const triedModels = [modelId];
  onProgress?.(0);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const currentModelId = attempt === 0 ? modelId : (getFallbackModel(modelId)[attempt - 1] || modelId);
    if (attempt > 0 && currentModelId !== triedModels[triedModels.length - 1]) { triedModels.push(currentModelId); logger.info(`[AI] 降级: ${triedModels[attempt - 1]} → ${currentModelId}`); }

    try {
      const model = getModel(currentModelId);
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new BusinessError(ERROR_CODE.INTERNAL_ERROR, `AI call timeout: ${currentModelId}`)), INFER_CONFIG.timeoutMs); });
      const result = await Promise.race([model.infer(input, (sub) => onProgress?.(Math.min(99, sub))), timeoutPromise]);
      clearTimeout(timeoutId);
      onProgress?.(100);

      const output = { modelId: currentModelId, output: result, elapsed: Date.now() - startTime, retries: attempt, degraded: currentModelId !== modelId, triedModels, tokensIn: extractUsage(result).tokensIn, tokensOut: extractUsage(result).tokensOut };

      if (INFER_CONFIG.enableCache && !skipCache) {
        const cacheKey = `${modelId}:${JSON.stringify(input)}`;
        inferenceCache.set(cacheKey, { result: output, timestamp: Date.now() });
        if (inferenceCache.size > MAX_CACHE_SIZE) {
          let oldestKey = null, oldestTs = Infinity;
          for (const [k, v] of inferenceCache) { if (v.timestamp < oldestTs) { oldestTs = v.timestamp; oldestKey = k; } }
          if (oldestKey) inferenceCache.delete(oldestKey);
        }
        if (typeof input === 'string') { import('./semanticCacheService.js').then(({ setSemantic }) => { setSemantic(modelId, input, output).catch(err => logger.warn('[AI] 语义缓存写入失败', { modelId, err: err.message })); }).catch(err => logger.warn('[AI] 语义缓存服务加载失败', { modelId, err: err.message })); }
      }
      return output;
    } catch (err) {
      lastError = err;
      logger.error(`[AI] 调用失败 (${currentModelId}, attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}`);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, INFER_CONFIG.retryDelayMs * (attempt + 1)));
    }
  }

  if (INFER_CONFIG.enableDegradation) {
    logger.warn(`[AI] 全部模型失败 (${triedModels.join(' → ')}), 返回默认响应`);
    const fallbackInput = typeof input === 'string' ? input : (input?.imageUrl || input?.image_url || '');
    const fallback = getDefaultResponse(modelId, fallbackInput, lastError?.message);
    return { modelId: 'fallback', output: fallback, elapsed: Date.now() - startTime, retries: maxRetries + 1, degraded: true, triedModels, error: lastError?.message, tokensIn: 0, tokensOut: 0 };
  }
  throw lastError;
}

export async function* streamInfer(modelId, input, options = {}) {
  const model = getModel(modelId);
  if (model.streamInfer) {
    yield* model.streamInfer(input, options.onProgress);
  } else {
    logger.warn(`[AI] ${modelId} 不支持原生流式，降级为模拟流式`);
    const result = await infer(modelId, input, options);
    const output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
    const chunks = output.match(/.{1,50}/g) || [output];
    for (const chunk of chunks) yield { text: chunk };
    yield { usage: { inputTokens: result.tokensIn || 0, outputTokens: result.tokensOut || 0 } };
  }
}

export async function pipeline(stages, input, onStageProgress) {
  let current = input;
  const results = [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    onStageProgress?.(i, stages.length, stage.name, 0);
    const result = await infer(stage.model, current, { onProgress: (p) => onStageProgress?.(i, stages.length, stage.name, p) });
    results.push({ stage: stage.name, ...result });
    current = { ...current, ...result.output };
  }
  return { results, final: current };
}

function getDefaultResponse(modelId, input, errorMsg) {
  const type = getModel(modelId)?.type || 'unknown';
  if (type === 'text') return { text: 'AI 服务暂时不可用，请稍后重试', fallback: true, reason: errorMsg };
  if (type === 'image') return { imageUrl: input || '', message: 'AI image service unavailable, original returned', fallback: true, reason: errorMsg };
  return { fallback: true, reason: errorMsg };
}

export function clearCache() { inferenceCache.clear(); }
export function getCacheSize() { return inferenceCache.size; }

export default { registerModel, getModel, listModels, getDefaultModel, getFallbackModel, infer, pipeline, healthCheck, trackUsage, getUsageStats, clearCache, getCacheSize };
