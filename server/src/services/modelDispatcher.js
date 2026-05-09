import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';

/**
 * ModelDispatcher — 多模型统一调度层 (v5.0)
 * G1 Architect | 整合 aiEngine + model-router 双系统
 *
 * 三种模式:
 *   auto   → TaskAnalyzer 拆解任务 → ModelMatcher 五维评分 → 自动选最优模型
 *   custom → 用户配 pipeline（模型+排序+优先级+降级链）→ serial/parallel 执行
 *   single → 单一模型直接调用，走 aiEngine.infer() 管线
 *
 * 模型按 text / image / video 三大类专项管理，同类内匹配，防止错配
 * Phase 3 扩展点: CostRouter / StreamingManager / TenantModelACL
 */

import { infer, pipeline, registerModel, getModel, listModels, getFallbackModel, healthCheck, getUsageStats, clearCache, getCacheSize } from './aiEngine.js';

// ==================== 惰性初始化 ====================

let _modelsReady = false;

async function ensureModels() {
  if (_modelsReady) return;
  const existing = listModels();
  if (existing.length > 0) { _modelsReady = true; return; }
  try {
    const { registerAllAdapters } = await import('./adapters/index.js');
    registerAllAdapters();
  } catch (e) {
    logger.warn('[ModelDispatcher] 无法自动注册 Adapter:', e.message);
  }
  _modelsReady = true;
}

// ==================== 模型分类管理 ====================

const MODEL_CATEGORIES = ['text', 'image', 'video', 'audio'];

const categoryMap = new Map();

export function categorizeModels() {
  categoryMap.clear();
  for (const cat of MODEL_CATEGORIES) categoryMap.set(cat, []);

  const all = listModels();
  for (const m of all) {
    const cat = m.type || m.category || 'text';
    if (categoryMap.has(cat)) {
      categoryMap.get(cat).push(m);
    }
  }
  return Object.fromEntries(categoryMap);
}

export function getModelsByCategory(category) {
  if (!categoryMap.has(category)) categorizeModels();
  return categoryMap.get(category) || [];
}

export function getCategories() {
  return Object.fromEntries(
    MODEL_CATEGORIES.map((cat) => [cat, getModelsByCategory(cat).map((m) => m.id)]),
  );
}

// ==================== 任务类型 → 类别映射 ====================

const TASK_CATEGORY_MAP = {
  // text
  text_gen: 'text', script_gen: 'text', title_gen: 'text', translate: 'text',
  compliance_check: 'text', caption_gen: 'text', seo_text: 'text',
  // image
  cutout: 'image', cutout_hq: 'image', bg_white: 'image', scene_gen: 'image',
  image_enhance: 'image', img_expand: 'image', ghost_mannequin: 'image',
  poster_gen: 'image', color_swap: 'image', style_transfer: 'image',
  virtual_tryon: 'image', watermark: 'image',
  // video
  img2video: 'video', multi2video: 'video', video_edit: 'video',
  video_packaging: 'video', action_transfer: 'video', person_replace: 'video',
  digital_human: 'video', voice_gen: 'audio', voice_clone: 'audio', tts: 'audio',
};

export function getTaskCategory(taskType) {
  return TASK_CATEGORY_MAP[taskType] || 'text';
}

// ==================== TaskAnalyzer — 任务分析器 ====================

export function analyzeTask(taskType, input) {
  const category = getTaskCategory(taskType);
  const candidates = getModelsByCategory(category);
  const preferred = getDefaultModel(taskType);

  // 检查是否需要多模型协同
  const needsMultiModel =
    taskType === 'compliance_check' || // 合规需要多模型投票
    taskType === 'poster_gen' ||        // 海报=文案+图片
    taskType === 'video_packaging';      // 视频包装=字幕+配乐+贴纸

  return {
    taskType,
    category,
    candidates: candidates.map((m) => m.id),
    preferred,
    needsMultiModel,
    complexity: input?.quality === 'high' ? 'high' : 'normal',
  };
}

import { getDefaultModel } from './aiEngine.js';

// ==================== ModelMatcher — 五维评分匹配 ====================

const MATCH_WEIGHTS = {
  availability: 0.35,
  capability: 0.25,
  cost: 0.20,
  latency: 0.10,
  accuracy: 0.10,
};

const MODEL_CAPABILITIES = {
  'gpt-5.5': { capability: 95, cost: 55, latency: 65, accuracy: 93 },
  'claude-opus-4-7': { capability: 92, cost: 50, latency: 60, accuracy: 94 },
  'deepseek-v4-pro': { capability: 82, cost: 70, latency: 70, accuracy: 84 },
  'deepseek-v4-flash': { capability: 60, cost: 90, latency: 85, accuracy: 68 },
};

export function scoreModel(modelId, taskCategory, healthData = {}) {
  const caps = MODEL_CAPABILITIES[modelId] || { capability: 50, cost: 50, latency: 50, accuracy: 50 };
  const available = (healthData[modelId]?.status !== 'error') ? 100 : 0;

  const score =
    available * MATCH_WEIGHTS.availability +
    caps.capability * MATCH_WEIGHTS.capability +
    caps.cost * MATCH_WEIGHTS.cost +
    caps.latency * MATCH_WEIGHTS.latency +
    caps.accuracy * MATCH_WEIGHTS.accuracy;

  return { modelId, score: Math.round(score), details: { available, ...caps } };
}

export function rankModels(candidates, taskCategory, healthData) {
  const scores = candidates.map((id) => scoreModel(id, taskCategory, healthData));
  scores.sort((a, b) => b.score - a.score);

  return {
    ranked: scores,
    best: scores[0] || null,
    matchLog: scores.map((s) =>
      `${s.modelId}: ${s.score}分 (可用${s.details.available} 能力${s.details.capability} 成本${s.details.cost})`,
    ),
  };
}

// ==================== ResultAggregator — 结果聚合器 ====================

export function aggregateResults(results, taskType) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return results[0];

  const aggregated = {
    taskType,
    modelCount: results.length,
    models: results.map((r) => r.modelId || 'unknown'),
    primary: results[0]?.output || results[0],
    secondary: results.slice(1).map((r) => r?.output || r),
    mergedAt: new Date().toISOString(),
  };

  // 合规检查 → 多数投票
  if (taskType === 'compliance_check' && results.length >= 3) {
    const votes = results.map((r) => r?.output?.decision || r?.output?.pass);
    const passCount = votes.filter((v) => v === true || v === 'pass').length;
    aggregated.voteResult = passCount >= 2 ? 'pass' : 'reject';
    aggregated.voteDetail = { pass: passCount, total: votes.length };
  }

  return aggregated;
}

// ==================== 健康数据获取 ====================

let cachedHealthData = null;
let healthCacheTime = 0;
const HEALTH_CACHE_TTL = 30000;

async function getHealthData() {
  if (cachedHealthData && Date.now() - healthCacheTime < HEALTH_CACHE_TTL) {
    return cachedHealthData;
  }
  cachedHealthData = await healthCheck();
  healthCacheTime = Date.now();
  return cachedHealthData;
}

// ==================== 三种调度模式 ====================

/**
 * auto 模式 — 系统自动匹配多模型协同
 */
export async function autoMode(taskType, input, options = {}) {
  const analysis = analyzeTask(taskType, input);
  const healthData = await getHealthData();
  const ranking = rankModels(analysis.candidates, analysis.category, healthData);

  if (!ranking.best) {
    throw new BusinessError(503, `类别 ${analysis.category} 下无可用模型`);
  }

  // 简单任务: 单模型即可
  if (!analysis.needsMultiModel && analysis.complexity === 'normal') {
    try {
      const result = await infer(ranking.best.modelId, input, {
        onProgress: options.onProgress,
        skipCache: options.skipCache,
      });
      return {
        mode: 'auto',
        matchLog: ranking.matchLog,
        selected: ranking.best.modelId,
        result,
      };
    } catch (err) {
      options.degradationLog?.push({ modelId: ranking.best.modelId, error: err.message, stage: 'primary' });
      // 降级到下一个候选
      if (ranking.ranked[1]) {
        const fallbackResult = await infer(ranking.ranked[1].modelId, input, {
          onProgress: options.onProgress,
          skipCache: true,
        });
        return {
          mode: 'auto',
          matchLog: ranking.matchLog,
          selected: ranking.ranked[1].modelId,
          degradedFrom: ranking.best.modelId,
          result: fallbackResult,
        };
      }
      throw err;
    }
  }

  // 复杂任务: 主模型 + 辅助模型
  const primary = await infer(ranking.ranked[0].modelId, input, {
    onProgress: options.onProgress,
    skipCache: options.skipCache,
  });

  const secondaryPromises = ranking.ranked.slice(1, 3).map((r) =>
    infer(r.modelId, input, { skipCache: true }).catch(() => null),
  );
  const secondaryResults = (await Promise.all(secondaryPromises)).filter(Boolean);

  const aggregated = aggregateResults([primary, ...secondaryResults], taskType);
  return {
    mode: 'auto',
    matchLog: ranking.matchLog,
    selected: ranking.best.modelId,
    result: aggregated,
  };
}

/**
 * custom 模式 — 用户自定义模型组合
 * customConfig: { models: [{id, order}], execution: 'serial'|'parallel', fallback: 'degrade'|'fail' }
 */
export async function customMode(taskType, input, customConfig = {}, options = {}) {
  const { models = [], execution = 'serial', fallback = 'degrade' } = customConfig;

  if (!models || models.length === 0) {
    return autoMode(taskType, input, options);
  }

  const sorted = [...models].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const results = [];

  if (execution === 'parallel') {
    const parallelResults = await Promise.allSettled(
      sorted.map((m) =>
        infer(m.id, { ...input, modelOverride: m.id }, { skipCache: options.skipCache }),
      ),
    );
    for (const r of parallelResults) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  } else {
    for (const m of sorted) {
      try {
        const r = await infer(m.id, { ...input, modelOverride: m.id }, {
          onProgress: (p, stage) =>
            options.onStageProgress?.(
              sorted.indexOf(m),
              sorted.length,
              m.id,
              stage || p,
            ),
          skipCache: options.skipCache,
        });
        results.push(r);
      } catch (err) {
        if (fallback === 'fail') {
          options.degradationLog?.push({ modelId: m.id, error: err.message, stage: 'serial' });
          throw err;
        }
        options.degradationLog?.push({ modelId: m.id, error: err.message, stage: 'serial' });
        logger.warn(`[ModelDispatcher] custom 模式 ${m.id} 失败, 跳过:`, err.message);
      }
    }
  }

  if (results.length === 0) {
    throw new BusinessError(503, '自定义组合全部执行失败');
  }

  const aggregated = aggregateResults(results, taskType);
  return {
    mode: 'custom',
    execution,
    modelCount: models.length,
    successCount: results.length,
    result: aggregated,
  };
}

/**
 * single 模式 — 单模型独立调用
 */
export async function singleMode(modelId, input, options = {}) {
  const result = await infer(modelId, input, {
    onProgress: options.onProgress,
    skipCache: options.skipCache,
  });

  return {
    mode: 'single',
    modelId,
    result,
  };
}

// ==================== 统一调度入口 ====================

/**
 * @param {object} req
 * @param {'auto'|'custom'|'single'} req.mode
 * @param {string} req.taskType - 任务类型
 * @param {object} req.input - 任务参数
 * @param {string} [req.modelId] - single 模式的模型ID
 * @param {object} [req.customConfig] - custom 模式的配置
 * @param {object} [options]
 */
export async function dispatch(req, options = {}) {
  await ensureModels();
  const { mode = 'auto', taskType, input, modelId, customConfig } = req;

  const startTime = Date.now();
  const degradationLog = [];

  try {
    let result;
    switch (mode) {
      case 'single': {
        if (!modelId) throw new BusinessError(400, 'single 模式需要 modelId');
        result = await singleMode(modelId, input, options);
        break;
      }
      case 'custom':
        result = await customMode(taskType, input, customConfig, { ...options, degradationLog });
        break;
      case 'auto':
      default:
        result = await autoMode(taskType, input, { ...options, degradationLog });
        break;
    }
    result.elapsed = Date.now() - startTime;
    if (degradationLog.length > 0) result.degradationLog = degradationLog;
    return result;
  } catch (err) {
    // 全模型耗尽 — 附加降级链信息
    if (degradationLog.length > 0) {
      const attempted = degradationLog.map(d => d.modelId).filter(Boolean);
      const reasons = degradationLog.map(d => `${d.modelId || '?'}: ${d.error || 'unknown'}`);
      err.message = `全部 ${attempted.length} 个模型调用失败. 降级链: ${reasons.join(' | ')}`;
    }
    throw err;
  }
}

// ==================== 多阶段管线（复用 aiEngine） ====================

export async function pipelineDispatch(stages, input, onStageProgress) {
  return pipeline(stages, input, onStageProgress);
}

// ==================== Phase 3 扩展点 ====================

export const extensionHooks = {
  costRouter: null,
  streamingManager: null,
  tenantModelACL: null,
  semanticCache: null,
};

export function registerExtension(name, handler) {
  if (extensionHooks.hasOwnProperty(name)) {
    extensionHooks[name] = handler;
    logger.info(`[ModelDispatcher] Phase 3 扩展 ${name} 已注册`);
  } else {
    throw new BusinessError(400, `未知扩展: ${name}. 可用: ${Object.keys(extensionHooks).join(', ')}`);
  }
}

// ==================== 导出 ====================

export {
  infer,
  pipeline,
  registerModel,
  getModel,
  listModels,
  getFallbackModel,
  healthCheck,
  getUsageStats,
  clearCache,
  getCacheSize,
};

export default {
  dispatch,
  autoMode,
  customMode,
  singleMode,
  pipelineDispatch,
  analyzeTask,
  rankModels,
  scoreModel,
  aggregateResults,
  getCategories,
  getModelsByCategory,
  categorizeModels,
  getTaskCategory,
  registerExtension,
  extensionHooks,
  // 透传 aiEngine
  infer,
  pipeline,
  registerModel,
  getModel,
  listModels,
  getFallbackModel,
  healthCheck,
  getUsageStats,
  clearCache,
  getCacheSize,
};
