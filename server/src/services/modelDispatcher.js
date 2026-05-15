import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { canarySelect, weightedRoundRobin, checkTenantQuota, consumeTenantTokens } from './dispatchStrategyService.js';
import { allocateBudget } from './budgetAllocator.js';
import { aiGatewayConfig } from '../config/index.js';

/**
 * ModelDispatcher — 多模型统一调度层 (v5.1)
 * G1 Architect | 整合 aiEngine + model-router 双系统
 *
 * 三种模式:
 *   auto   → TaskAnalyzer 拆解任务 → ModelMatcher 五维评分 → 自动选最优模型
 *   custom → 用户配 pipeline（模型+排序+优先级+降级链）→ serial/parallel 执行
 *   single → 单一模型直接调用，走 aiEngine.infer() 管线
 *
 * 子模块: modelCategories / modelMatcher / resultAggregator
 * Phase 3 扩展点: CostRouter / StreamingManager / TenantModelACL
 */

import { infer, pipeline, registerModel, getModel, listModels, getFallbackModel, healthCheck, getUsageStats, clearCache, getCacheSize } from './aiEngine.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { categorizeModels, getModelsByCategory, getCategories, getTaskCategory } from './modelCategories.js';
import { analyzeTask, rankModels, scoreModel, getHealthData, refreshScoreCache } from './modelMatcher.js';
import { aggregateResults } from './resultAggregator.js';

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
    logger.error('[ModelDispatcher] 无法自动注册 Adapter:', e.message);
  }
  _modelsReady = true;
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
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `No models available for ${analysis.category}`);
  }

  const selectedModelId = canarySelect(ranking.best.modelId);

  // 简单任务: 单模型即可
  if (!analysis.needsMultiModel && analysis.complexity === 'normal') {
    try {
      const result = await infer(selectedModelId, input, {
        onProgress: options.onProgress,
        skipCache: options.skipCache,
      });
      return {
        mode: 'auto',
        matchLog: ranking.matchLog,
        selected: selectedModelId,
        result,
      };
    } catch (err) {
      options.degradationLog?.push({ modelId: selectedModelId, error: err.message, stage: 'primary' });
      const remaining = ranking.ranked.filter(r => r.modelId !== selectedModelId).map(r => r.modelId);
      const fallbackId = weightedRoundRobin(remaining) || ranking.ranked[1]?.modelId;
      if (fallbackId) {
        const fallbackResult = await infer(fallbackId, input, {
          onProgress: options.onProgress,
          skipCache: true,
        });
        return {
          mode: 'auto',
          matchLog: ranking.matchLog,
          selected: fallbackId,
          degradedFrom: selectedModelId,
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
    infer(r.modelId, input, { skipCache: true }).catch((err) => {
      logger.warn('Secondary model infer failed', { modelId: r.modelId, error: err.message });
      return null;
    }),
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
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
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
 * @param {string} req.taskType
 * @param {object} req.input
 * @param {string} [req.modelId]
 * @param {object} [req.customConfig]
 * @param {object} [options]
 */
export async function dispatch(req, options = {}) {
  await ensureModels();
  const { mode = 'auto', taskType, input, modelId, customConfig } = req;

  if (options.tenantId) {
    const tenantTokenLimit = aiGatewayConfig.tenantTokenLimit;
    const quotaResult = checkTenantQuota(options.tenantId, tenantTokenLimit);
    if (!quotaResult.allowed) {
      throw new BusinessError(429, quotaResult.reason);
    }
  }

  // ── P2 动态 Token 预算分配 ──
  const budgetEnabled = aiGatewayConfig.budgetAllocator?.enabled !== false;
  let effectiveInput = input;
  if (budgetEnabled && typeof input === 'string' && taskType) {
    const budget = allocateBudget({
      taskType,
      userInput: input,
      intentId: options.intentId,
      category: options.category,
      sessionMessageCount: options.sessionMessageCount || 0,
      hourlyBudgetUsedPct: options.hourlyBudgetUsedPct || 0,
    });
    if (budget.maxTokens > 0) {
      effectiveInput = { prompt: input, maxTokens: budget.maxTokens };
      if (options.systemPrompt) effectiveInput.systemPrompt = options.systemPrompt;
      logger.debug('[ModelDispatcher] Budget applied', { taskType, band: budget.bandName, maxTokens: budget.maxTokens });
    }
  } else if (budgetEnabled && input && typeof input === 'object' && !input.maxTokens && taskType) {
    const budget = allocateBudget({
      taskType,
      userInput: input.prompt || input.text || '',
      intentId: options.intentId,
      category: options.category,
      sessionMessageCount: options.sessionMessageCount || 0,
      hourlyBudgetUsedPct: options.hourlyBudgetUsedPct || 0,
    });
    if (budget.maxTokens > 0) input.maxTokens = budget.maxTokens;
  }

  const startTime = Date.now();
  const degradationLog = [];

  try {
    let result;
    switch (mode) {
      case 'single': {
        if (!modelId) throw new BusinessError(ERROR_CODE.PARAM_ERROR);
        result = await singleMode(modelId, effectiveInput, options);
        break;
      }
      case 'custom':
        result = await customMode(taskType, effectiveInput, customConfig, { ...options, degradationLog });
        break;
      case 'auto':
      default:
        result = await autoMode(taskType, effectiveInput, { ...options, degradationLog });
        break;
    }
    result.elapsed = Date.now() - startTime;
    if (degradationLog.length > 0) result.degradationLog = degradationLog;

    if (options.tenantId && result?.result) {
      const tokensOut = result.result?.tokensOut || result.result?.usage?.output_tokens || 0;
      if (tokensOut > 0) consumeTenantTokens(options.tenantId, tokensOut);
    }

    return result;
  } catch (err) {
    if (degradationLog.length > 0) {
      const attempted = degradationLog.map(d => d.modelId).filter(Boolean);
      const reasons = degradationLog.map(d => `${d.modelId || '?'}: ${d.error || 'unknown'}`);
      err.message = `全部 ${attempted.length} 个模型调用失败. 降级链: ${reasons.join(' | ')}`;
    }
    throw err;
  }
}

// ==================== 多阶段管线 ====================

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
    throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Unknown extension: ${name}. Available: ${Object.keys(extensionHooks).join(", ")}`);
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
  refreshScoreCache,
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
