/**
 * AI 引擎抽象层 (v2.0 Enhanced)
 * 所有 AI 模型通过统一接口接入，支持多供应商切换 + 降级 + 重试 + 用量追踪
 *
 * 管线: input → preprocess → infer → postprocess → output
 * 降级链: primary → fallback → cache → gracefulDegradation
 *
 * 每个模型实现 { id, type, infer(input) → output, health() → status }
 */

// ==================== 模型注册中心 ====================

const registry = new Map();

export function registerModel(model) {
  if (!model.id || !model.type || !model.infer) {
    throw new Error('AI模型注册失败: 缺少 id/type/infer 字段');
  }
  registry.set(model.id, model);
  console.log(`[AI] 模型已注册: ${model.id} (${model.type})`);
}

export function getModel(id) {
  const model = registry.get(id);
  if (!model) throw new Error(`AI模型未注册: ${id}`);
  return model;
}

export function listModels(type = '') {
  const all = Array.from(registry.values());
  return type ? all.filter((m) => m.type === type) : all;
}

// ==================== 任务类型 → 默认模型映射 ====================

const DEFAULT_MODEL_MAP = {
  // 图片类 — 映射到已注册的 SD / DALL-E 模型
  cutout:           'stable-diffusion-img2img',
  cutout_hq:        'stable-diffusion-img2img',
  bg_white:         'stable-diffusion-img2img',
  scene_gen:        'stable-diffusion-xl',
  image_enhance:    'stable-diffusion-img2img',
  img_expand:       'stable-diffusion-img2img',
  ghost_mannequin:  'stable-diffusion-img2img',
  poster_gen:       'dall-e-3',
  color_swap:       'stable-diffusion-img2img',
  style_transfer:   'stable-diffusion-img2img',
  virtual_tryon:    'stable-diffusion-img2img',
  // 视频类（当前用图片模型占位，后续接 Seedance）
  img2video:        'stable-diffusion-xl',
  multi2video:      'stable-diffusion-xl',
  video_edit:       'stable-diffusion-img2img',
  // 文本类
  text_gen:         'gpt-4o-mini',
  script_gen:       'gpt-4o',
  title_gen:        'gpt-4o-mini',
  compliance_check: 'claude-sonnet-4-6',
  translate:        'gpt-4o-mini',
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
  'rmbg-2.0':        ['sam2-matting'],
  'iclight-v2':      ['bg-postprocess'],
};

export function getFallbackModel(modelId) {
  return FALLBACK_CHAIN[modelId] || [];
}

// ==================== 统一推理管线（增强版） ====================

const INFER_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),
  enableCache: true,
  enableDegradation: true,
};

const inferenceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  // 缓存检查
  if (INFER_CONFIG.enableCache && !skipCache) {
    const cacheKey = `${modelId}:${JSON.stringify(input)}`;
    const cached = inferenceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      onProgress?.(100);
      return { ...cached.result, fromCache: true };
    }
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
      console.log(`[AI] 降级: ${triedModels[attempt - 1]} → ${currentModelId}`);
    }

    try {
      const model = getModel(currentModelId);

      // 超时控制
      const result = await Promise.race([
        model.infer(input, (sub) => onProgress?.(Math.min(99, sub))),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`AI调用超时: ${currentModelId}`)), INFER_CONFIG.timeoutMs),
        ),
      ]);

      onProgress?.(100);

      const output = {
        modelId: currentModelId,
        output: result,
        elapsed: Date.now() - startTime,
        retries: attempt,
        degraded: currentModelId !== modelId,
        triedModels,
      };

      // 缓存结果
      if (INFER_CONFIG.enableCache && !skipCache) {
        const cacheKey = `${modelId}:${JSON.stringify(input)}`;
        inferenceCache.set(cacheKey, { result: output, timestamp: Date.now() });
      }

      return output;
    } catch (err) {
      lastError = err;
      console.error(`[AI] 调用失败 (${currentModelId}, attempt ${attempt + 1}/${maxRetries + 1}):`, err.message);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, INFER_CONFIG.retryDelayMs * (attempt + 1)));
      }
    }
  }

  // 全部失败 → 优雅降级
  if (INFER_CONFIG.enableDegradation) {
    console.warn(`[AI] 全部模型失败 (${triedModels.join(' → ')}), 返回默认响应`);
    const fallback = getDefaultResponse(modelId, input, lastError?.message);
    return {
      modelId: 'fallback',
      output: fallback,
      elapsed: Date.now() - startTime,
      retries: maxRetries + 1,
      degraded: true,
      triedModels,
      error: lastError?.message,
    };
  }

  throw lastError;
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

export function trackUsage(modelId, elapsed, _success) {
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
