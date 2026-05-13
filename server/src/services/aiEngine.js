/**
 * AI 引擎抽象层 (v2.0 Enhanced)
 * 所有 AI 模型通过统一接口接入，支持多供应商切换 + 降级 + 重试 + 用量追踪
 *
 * 管线: input → preprocess → infer → postprocess → output
 * 降级链: primary → fallback → cache → gracefulDegradation
 *
 * 每个模型实现 { id, type, infer(input) → output, health() → status }
 */

import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { extractUsage } from './tokenMeteringService.js';
import { aiTimeoutMs } from '../config/index.js';

// ==================== 模型注册中心 ====================

const registry = new Map();

export function registerModel(model) {
  if (!model.id || !model.type || !model.infer) {
    throw new BusinessError(500, 'AI模型注册失败: 缺少 id/type/infer 字段');
  }
  registry.set(model.id, model);
  logger.info(`[AI] 模型已注册: ${model.id} (${model.type})`);
}

export function getModel(id) {
  const model = registry.get(id);
  if (!model) throw new BusinessError(500, `AI模型未注册: ${id}`);
  return model;
}

export function listModels(type = '') {
  const all = Array.from(registry.values());
  return type ? all.filter((m) => m.type === type) : all;
}

// ==================== 任务类型 → 默认模型映射 ====================

const DEFAULT_MODEL_MAP = {
  // 图片类 — 映射到已注册的 SD / gpt-image-2 模型
  cutout:           'stable-diffusion-img2img',
  cutout_hq:        'stable-diffusion-img2img',
  bg_white:         'stable-diffusion-img2img',
  scene_gen:        'gpt-image-2',
  image_enhance:    'stable-diffusion-img2img',
  img_expand:       'stable-diffusion-img2img',
  ghost_mannequin:  'stable-diffusion-img2img',
  poster_gen:       'gpt-image-2',
  color_swap:       'stable-diffusion-img2img',
  style_transfer:   'stable-diffusion-img2img',
  virtual_tryon:    'stable-diffusion-img2img',
  detail_long_image: 'gpt-image-2',
  multi_size_export: 'gpt-image-2-multi-size',
  // 视频类
  img2video:        'seedance',
  multi2video:      'seedance',
  video_edit:       'seedance',
  action_migrate:   'seedance-action-migrate',
  digital_human:    'seedance',
  batch_video:      'seedance-batch',
  // 文本类
  text_gen:         'gpt-4o-mini',
  script_gen:       'gpt-4o',
  title_gen:        'gpt-4o-mini',
  compliance_check: 'claude-sonnet-4-6',
  translate:        'gpt-4o-mini',
  // 音频类
  tts:              'edge-tts',
  voice_clone:      'elevenlabs-voice-clone',
};

export function getDefaultModel(taskType) {
  return DEFAULT_MODEL_MAP[taskType] || null;
}

// ==================== 模型降级链配置 ====================

const FALLBACK_CHAIN = {
  'gpt-4o':          ['gpt-4o-mini', 'claude-sonnet-4-6'],
  'gpt-4o-mini':     ['claude-haiku-4-5'],
  'claude-sonnet-4-6': ['claude-haiku-4-5', 'gpt-4o-mini'],
  'claude-haiku-4-5':  ['gpt-4o-mini'],
  'seedance-2.0':    ['pixeldance'],
  'pixeldance':      ['seedance-2.0'],
  'seedance':        ['cogvideo'],
  'cogvideo':        ['stable-diffusion-xl'],
  'gpt-image-2':     ['stable-diffusion-xl', 'stability-sdxl'],
  'dall-e-3':        ['gpt-image-2', 'stable-diffusion-xl'],
  'rmbg-2.0':        ['sam2-matting'],
  'iclight-v2':      ['bg-postprocess'],
};

// 运行时降级链覆盖（可被 dispatchStrategyService 或 autoRecovery 动态更新）
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

// ==================== 统一推理管线（增强版） ====================

const INFER_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: aiTimeoutMs,
  enableCache: true,
  enableDegradation: true,
};

const inferenceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

// 定期清理过期缓存条目，避免低流量期间内存滞留
export const _cacheCleanupTimer = setInterval(() => {
  try {
  const now = Date.now();
  for (const [key, entry] of inferenceCache) {
    if (now - entry.timestamp > CACHE_TTL) inferenceCache.delete(key);
  }
  } catch { /* Map 迭代安全，兜底防护 */ }
}, 300000).unref();

/**
 * 增强推理：自动重试 + 降级 + 缓存 + 超时控制
 * @param {string} modelId - 模型ID
 * @param {object} input - 输入参数
 * @param {object} [options]
 * @param {function} [options.onProgress] - 进度回调 (0-100)
 * @param {number} [options.maxRetries]
 * @param {boolean} [options.skipCache]
 * @returns {Promise<object>} { modelId, output, elapsed, retries, degraded }
 */
export async function infer(modelId, input, options = {}) {
  const { onProgress, maxRetries = INFER_CONFIG.maxRetries, skipCache = false } = options;

  // 精确匹配缓存检查
  if (INFER_CONFIG.enableCache && !skipCache) {
    const cacheKey = `${modelId}:${JSON.stringify(input)}`;
    const cached = inferenceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      onProgress?.(100);
      return { ...cached.result, fromCache: true };
    }
  }

  // 语义相似度缓存检查（仅文本类模型）
  if (INFER_CONFIG.enableCache && !skipCache && typeof input === 'string') {
    try {
      const { getSemantic, recordHit, recordMiss } = await import('./semanticCacheService.js');
      const semanticCached = await getSemantic(modelId, input);
      if (semanticCached) {
        recordHit(true);
        onProgress?.(100);
        return { ...semanticCached, fromCache: true, fromSemanticCache: true };
      }
      recordMiss();
    } catch (err) { logger.warn('[AI] 语义缓存读取失败', { modelId, err: err.message }); }
  }

  const startTime = Date.now();
  let lastError = null;
  const triedModels = [modelId];

  onProgress?.(0);

  // 重试 + 降级循环
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const currentModelId = attempt === 0 ? modelId : (getFallbackModel(modelId)[attempt - 1] || modelId);

    if (attempt > 0 && currentModelId !== triedModels[triedModels.length - 1]) {
      triedModels.push(currentModelId);
      logger.info(`[AI] 降级: ${triedModels[attempt - 1]} → ${currentModelId}`);
    }

    try {
      const model = getModel(currentModelId);

      // 超时控制
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new BusinessError(504, `AI调用超时: ${currentModelId}`)), INFER_CONFIG.timeoutMs);
      });

      const result = await Promise.race([
        model.infer(input, (sub) => onProgress?.(Math.min(99, sub))),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      onProgress?.(100);

      const output = {
        modelId: currentModelId,
        output: result,
        elapsed: Date.now() - startTime,
        retries: attempt,
        degraded: currentModelId !== modelId,
        triedModels,
        tokensIn: extractUsage(result).tokensIn,
        tokensOut: extractUsage(result).tokensOut,
      };

      // 缓存结果
      if (INFER_CONFIG.enableCache && !skipCache) {
        const cacheKey = `${modelId}:${JSON.stringify(input)}`;
        inferenceCache.set(cacheKey, { result: output, timestamp: Date.now() });
        if (inferenceCache.size > MAX_CACHE_SIZE) {
          let oldestKey = null;
          let oldestTs = Infinity;
          for (const [k, v] of inferenceCache) {
            if (v.timestamp < oldestTs) { oldestTs = v.timestamp; oldestKey = k; }
          }
          if (oldestKey) inferenceCache.delete(oldestKey);
        }
        // 语义缓存存储（文本类模型）
        if (typeof input === 'string') {
          import('./semanticCacheService.js').then(({ setSemantic }) => {
            setSemantic(modelId, input, output).catch((err) => {
              logger.warn('[AI] 语义缓存写入失败', { modelId, err: err.message });
            });
          }).catch((err) => {
            logger.warn('[AI] 语义缓存服务加载失败', { modelId, err: err.message });
          });
        }
      }

      return output;
    } catch (err) {
      lastError = err;
      logger.error(`[AI] 调用失败 (${currentModelId}, attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}`);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, INFER_CONFIG.retryDelayMs * (attempt + 1)));
      }
    }
  }

  // 全部失败 → 优雅降级
  if (INFER_CONFIG.enableDegradation) {
    logger.warn(`[AI] 全部模型失败 (${triedModels.join(' → ')}), 返回默认响应`);
    const fallback = getDefaultResponse(modelId, input, lastError?.message);
    return {
      modelId: 'fallback',
      output: fallback,
      elapsed: Date.now() - startTime,
      retries: maxRetries + 1,
      degraded: true,
      triedModels,
      error: lastError?.message,
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  throw lastError;
}


/**
 * 流式推理 — 返回 AsyncGenerator，逐步 yield 模型输出 token
 * 仅 OpenAI 兼容模型支持流式，其他模型自动降级为模拟流式
 * @param {string} modelId
 * @param {object} input
 * @param {object} [options]
 * @returns {AsyncGenerator<{text?: string, usage?: object}>}
 */
export async function* streamInfer(modelId, input, options = {}) {
  const model = getModel(modelId);

  if (model.streamInfer) {
    // 原生流式推理
    yield* model.streamInfer(input, options.onProgress);
  } else {
    // 降级：完整推断后分块 yield
    logger.warn(`[AI] ${modelId} 不支持原生流式，降级为模拟流式`);
    const result = await infer(modelId, input, options);
    const output = typeof result.output === "string" ? result.output : JSON.stringify(result.output);
    const chunks = output.match(/.{1,50}/g) || [output];
    for (const chunk of chunks) {
      yield { text: chunk };
    }
    yield {
      usage: {
        inputTokens: result.tokensIn || 0,
        outputTokens: result.tokensOut || 0,
      },
    };
  }
}
// ==================== 管线编排器（增强版） ====================

/**
 * 多模型管线串联执行
 * 例: 抠图 → 白底 → 精修 → 尺寸适配
 */
export async function pipeline(stages, input, onStageProgress) {
  let current = input;
  const results = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    onStageProgress?.(i, stages.length, stage.name, 0);

    const result = await infer(stage.model, current, {
      onProgress: (p) => onStageProgress?.(i, stages.length, stage.name, p),
    });

    results.push({ stage: stage.name, ...result });
    current = { ...current, ...result.output };
  }

  return { results, final: current };
}

// ==================== 优雅降级默认响应 ====================

function getDefaultResponse(modelId, input, errorMsg) {
  const type = getModel(modelId)?.type || 'unknown';

  if (type === 'text') {
    return {
      text: 'AI 服务暂时不可用，请稍后重试',
      fallback: true,
      reason: errorMsg,
    };
  }

  if (type === 'image') {
    return {
      imageUrl: input.imageUrl || input.image_url || '',
      message: '图片处理服务暂时不可用，已返回原图',
      fallback: true,
      reason: errorMsg,
    };
  }

  return { fallback: true, reason: errorMsg };
}

// ==================== 健康检查 ====================

export async function healthCheck() {
  const results = {};
  for (const [id, model] of registry) {
    try {
      if (model.health) {
        results[id] = await model.health();
      } else {
        results[id] = { status: 'unknown' };
      }
    } catch (err) {
      results[id] = { status: 'error', message: err.message };
    }
  }
  return results;
}

// ==================== 用量统计 ====================

const usageStats = { total: 0, byModel: {}, byType: {} };

export function trackUsage(modelId, _elapsed, _success) {
  usageStats.total++;
  usageStats.byModel[modelId] = (usageStats.byModel[modelId] || 0) + 1;

  const model = registry.get(modelId);
  if (model) {
    usageStats.byType[model.type] = (usageStats.byType[model.type] || 0) + 1;
  }
}

export function getUsageStats() {
  return { ...usageStats, byModel: { ...usageStats.byModel }, byType: { ...usageStats.byType } };
}

// ==================== 缓存管理 ====================

export function clearCache() {
  inferenceCache.clear();
}

export function getCacheSize() {
  return inferenceCache.size;
}

export default {
  registerModel, getModel, listModels, getDefaultModel,
  getFallbackModel, infer, pipeline, healthCheck,
  trackUsage, getUsageStats, clearCache, getCacheSize,
};
