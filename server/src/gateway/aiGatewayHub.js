/**
 * AI Gateway Hub — Token 集约化运营核心中台
 *
 * 所有大模型/AI 调用统一收口到此，严禁业务模块私自直连大模型接口。
 *
 * 三条调用路径:
 *  - infer(modelId, input, ctx)     → 委托 aiEngine.infer()
 *  - dispatch(dispatchReq, ctx)     → 委托 modelDispatcher.dispatch()
 *  - route(params, ctx)             → 委托 modelRouter.routeModel()
 *
 * 生命周期钩子 (每一条路径都经过):
 *  pre-invoke  → GEO检查 + PII脱敏 + 内容审核 + 定价查询 + 上下文窗口
 *  invoke      → 委托执行引擎（超时控制 + 熔断降级）
 *  post-invoke → Token 归一化 + 成本计算 + 输出审核 + 统一日志 + 聚合统计 + 长期记忆
 */
import logger from '../utils/logger.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import { infer, listModels, getFallbackModel } from '../services/aiEngine.js';
import { extractUsage, estimateTokens } from '../services/tokenMeteringService.js';
import * as tokenPricingDao from '../dao/tokenPricingDao.js';
import * as tokenStatsDao from '../dao/tokenStatsDao.js';
import * as modelConfigDao from '../dao/modelConfigDao.js';
import { dispatch as _dispatch } from '../services/modelDispatcher.js';
import * as _modelRouter from '../services/model-router.service.js';
import { manageContextWindow, saveBudgetLog } from '../services/contextWindowService.js';
import * as ltmService from '../services/longTermMemoryService.js';
import { sanitizePII, sanitizeObject } from '../services/inputSanitizerService.js';
import { moderateText } from '../services/moderation.service.js';

// ==================== 统一调用上下文 ====================

function normalizeContext(ctx) {
  return {
    userId: ctx?.userId || null,
    tenantId: ctx?.tenantId || null,
    taskType: ctx?.taskType || 'unknown',
    source: ctx?.source || 'consumer',
    correlationId: ctx?.correlationId || _genCorrelationId(),
  };
}

function _genCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ==================== 熔断器 + 超时 ====================

const modelBreakers = new Map();
const BREAKER_CONFIG = {
  enabled: process.env.AI_CIRCUIT_BREAKER_ENABLED !== 'false',
  failureThreshold: parseInt(process.env.AI_BREAKER_FAILURE_COUNT || '5', 10),
  cooldownMs: parseInt(process.env.AI_BREAKER_COOLDOWN_MS || '60000', 10),
  useErrorRate: true,
  errorRateThreshold: parseFloat(process.env.AI_BREAKER_ERROR_RATE || '0.5'),
  windowDuration: parseInt(process.env.AI_BREAKER_WINDOW_MS || '120000', 10),
};

const SINGLE_REQUEST_TIMEOUT = parseInt(process.env.AI_SINGLE_REQUEST_TIMEOUT_MS || '120000', 10);
const TOTAL_TIMEOUT = parseInt(process.env.AI_TOTAL_TIMEOUT_MS || '300000', 10);
const STREAMING_TIMEOUT = parseInt(process.env.AI_STREAMING_TIMEOUT_MS || '600000', 10);

function getModelBreaker(modelId) {
  if (!BREAKER_CONFIG.enabled) return null;
  if (!modelBreakers.has(modelId)) {
    modelBreakers.set(modelId, new CircuitBreaker(BREAKER_CONFIG));
  }
  return modelBreakers.get(modelId);
}

function timeoutPromise(ms, label) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} 超时 (${ms}ms)`)), ms),
  );
}

// ==================== Pre-invoke 安全检测 ====================

/**
 * 统一 pre-invoke 安全检查管线
 * GEO 规则 → PII 脱敏 → 内容安全审核
 * @returns {{ blocked: boolean, blockReason?: string, sanitizedInput: any, geoConstraints: object|null, moderationResult: object|null }}
 */
async function runPreInvokeSecurityChecks(modelId, input, context) {
  const result = {
    blocked: false,
    blockReason: null,
    sanitizedInput: input,
    geoConstraints: null,
    moderationResult: null,
  };

  // 1. GEO 规则检查
  const countryCode = context.countryCode || context.geo?.country || null;
  const platformCode = context.platformCode || context.taskType || null;
  if (countryCode) {
    try {
      const { evaluateRules } = await import('../services/geoRulesService.js');
      const geoConstraints = await evaluateRules(countryCode, platformCode);
      result.geoConstraints = geoConstraints;
      if (geoConstraints?.blockedModels?.includes(modelId)) {
        result.blocked = true;
        result.blockReason = `Model ${modelId} is not available in your region`;
        return result;
      }
    } catch (e) {
      logger.warn(`[Gateway] GEO evaluation failed: ${e.message}`);
    }
  }

  // 2. PII 敏感信息脱敏
  const sanitizeEnabled = process.env.SECURITY_SANITIZE_INPUT !== 'false';
  if (sanitizeEnabled) {
    try {
      if (typeof input === 'string') {
        const { sanitized, maskedCount } = sanitizePII(input);
        if (maskedCount > 0) {
          result.sanitizedInput = sanitized;
          logger.info(`[Gateway] PII 脱敏: ${maskedCount} 处 (user=${context.userId})`);
        }
      } else if (typeof input === 'object' && input !== null) {
        result.sanitizedInput = sanitizeObject(input);
      }
    } catch (e) {
      logger.warn(`[Gateway] PII sanitization failed: ${e.message}`);
    }
  }

  // 3. 内容安全审核（敏感词/违禁词检测）
  const moderationEnabled = process.env.SECURITY_SELF_BUILT_WORDLIST_ENABLED !== 'false';
  if (moderationEnabled && context.userId) {
    try {
      const textToCheck = typeof input === 'string' ? input : JSON.stringify(input);
      const modResult = await moderateText(textToCheck, context.userId, { stage: 'input' });
      result.moderationResult = modResult;
      if (modResult.action === 'block') {
        result.blocked = true;
        result.blockReason = '内容包含违规信息，请修改后重试';
        return result;
      }
    } catch (e) {
      logger.warn(`[Gateway] Content moderation failed: ${e.message}`);
    }
  }

  return result;
}

// ==================== 核心方法 ====================

/**
 * 统一推理入口 — 替换 routes 中直接的 infer() 调用
 */
export async function gatewayInfer(modelId, input, ctx = {}) {
  const context = normalizeContext(ctx);
  const start = Date.now();

  const pricing = await tokenPricingDao.getActiveByKey(modelId);
  const model = listModels().find((m) => m.id === modelId);

  // ── Pre-invoke 安全检测 (GEO + PII脱敏 + 内容审核) ──
  const security = await runPreInvokeSecurityChecks(modelId, input, {
    ...context,
    countryCode: ctx.countryCode || ctx.geo?.country || null,
    platformCode: ctx.platformCode || ctx.taskType || null,
  });
  if (security.blocked) {
    return {
      modelId, output: null, elapsed: 0, retries: 0, degraded: false,
      tokensIn: 0, tokensOut: 0, blocked: true,
      blockReason: security.blockReason,
      correlationId: context.correlationId,
    };
  }
  const geoConstraints = security.geoConstraints;
  const sanitizedInput = security.sanitizedInput;

  // ── 上下文窗口管理（Pre-invoke）──
  let cwResult = null;
  if (ctx.enableContextWindow !== false && typeof sanitizedInput === 'string') {
    try {
      cwResult = await manageContextWindow({
        modelId,
        userInput: sanitizedInput,
        historyMessages: ctx.historyMessages || [],
        ragContent: ctx.ragContent || '',
        sessionId: ctx.sessionId,
        importanceMap: ctx.importanceMap || {},
      });
      // 如果有分块，先不分块，由调用方自行处理
      if (cwResult?.budget?.overflow > 0) {
        logger.warn(`[Gateway] Context overflow: ${cwResult.budget.overflow} tokens, strategy: ${cwResult.strategy}`);
      }
    } catch (e) {
      logger.warn(`[Gateway] ContextWindow failed: ${e.message}`);
    }
  }

  let result, status = 'success', errorMsg = '', triedFallback = false;
  const breaker = getModelBreaker(modelId);

  try {
    // 熔断器检查
    if (breaker && !breaker.isAvailable()) {
      // 尝试降级模型
      const fallbacks = getFallbackModel(modelId);
      if (fallbacks.length > 0) {
        logger.warn(`[Gateway] 模型 ${modelId} 已熔断，降级到 ${fallbacks[0]}`);
        triedFallback = true;
        result = await Promise.race([
          infer(fallbacks[0], sanitizedInput, { onProgress: ctx.onProgress, maxRetries: 1, skipCache: true }),
          timeoutPromise(TOTAL_TIMEOUT, '降级模型调用'),
        ]);
      } else {
        throw new Error(`模型 ${modelId} 不可用且无可用降级模型，请稍后重试`);
      }
    } else {
      // 正常调用（总超时兜底）
      result = await Promise.race([
        infer(modelId, sanitizedInput, { onProgress: ctx.onProgress, maxRetries: ctx.maxRetries, skipCache: ctx.skipCache }),
        timeoutPromise(TOTAL_TIMEOUT, '模型调用'),
      ]);
    }

    if (breaker) breaker.recordSuccess();
  } catch (err) {
    status = 'error';
    errorMsg = err.message;

    if (breaker) breaker.recordFailure();

    // 未降级过则尝试降级
    if (!triedFallback) {
      const fallbacks = getFallbackModel(modelId);
      if (fallbacks.length > 0) {
        try {
          logger.warn(`[Gateway] 模型 ${modelId} 失败，降级到 ${fallbacks[0]}`);
          result = await Promise.race([
            infer(fallbacks[0], sanitizedInput, { onProgress: ctx.onProgress, maxRetries: 1, skipCache: true }),
            timeoutPromise(TOTAL_TIMEOUT, '降级模型调用'),
          ]);
          status = 'success';
          errorMsg = '';
          triedFallback = true;
        } catch (fallbackErr) {
          errorMsg = `${err.message} | fallback: ${fallbackErr.message}`;
        }
      }
    }

    if (status === 'error') {
      result = { modelId, output: null, elapsed: Date.now() - start, retries: 0, degraded: triedFallback, tokensIn: 0, tokensOut: 0 };
    }
  }

  const tokensIn = result.tokensIn || 0;
  const tokensOut = result.tokensOut || 0;

  let effectiveTokensIn = tokensIn;
  let effectiveTokensOut = tokensOut;
  if (tokensIn === 0 && tokensOut === 0 && model?.type !== 'text') {
    const estimated = estimateTokens(model?.type || 'image', result.output);
    effectiveTokensIn = estimated.tokensIn;
    effectiveTokensOut = estimated.tokensOut;
  }

  let cost = { amount: 0, currency: 'CNY', pricingId: null, details: null };
  if (pricing) {
    const isPerImage = pricing.pricing_type === 'image';
    cost = await tokenPricingDao.calculateCost(
      modelId,
      isPerImage ? 0 : effectiveTokensIn,
      isPerImage ? 0 : effectiveTokensOut,
      1,
    );
  }

  const latencyMs = result.elapsed || (Date.now() - start);

  // 输出审核 — 后置过滤 + PII二次脱敏 + 高风险拦截
  let moderationResult = null;
  if (result.output && status === 'success') {
    try {
      const { moderateOutput } = await import('../services/outputModerationService.js');
      const textOutput = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      const reviewLevel = geoConstraints?.reviewLevel || 5;
      const blockedTerms = geoConstraints?.outputConstraints?.forbiddenTerms || [];
      const requiredPatterns = geoConstraints?.outputConstraints?.requiredPatterns || null;
      const enableAliyun = process.env.SECURITY_ALIYUN_GREEN_ENABLED === 'true';
      const modResult = await moderateOutput(textOutput, { level: reviewLevel, blockedTerms, requiredPatterns, enableAliyun });
      moderationResult = JSON.stringify(modResult);
      // 应用脱敏后的输出
      if (modResult.sanitizedOutput) {
        result.output = modResult.sanitizedOutput;
      }
      // 高风险输出拦截
      if (!modResult.passed && modResult.riskLevel === 'high') {
        status = 'blocked';
        errorMsg = '输出包含违规内容，已被拦截';
        result.output = null;
      }
    } catch (e) {
      logger.warn(`[Gateway] Moderation failed: ${e.message}`);
    }
  }

  await modelConfigDao.logCall({
    userId: context.userId, tenantId: context.tenantId,
    modelKey: modelId, taskType: context.taskType, inputHash: '',
    status, latencyMs, tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut,
    errorMsg, moderationResult,
    costAmount: cost.amount, costCurrency: cost.currency,
    pricingId: cost.pricingId, costDetails: cost.details,
    correlationId: context.correlationId, source: context.source,
  });

  await modelConfigDao.incrementUsage(modelId, {
    latencyMs, tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut, isError: status === 'error',
  });

  if (status === 'success') {
    tokenStatsDao.incrementAllDimensions({
      userId: context.userId, tenantId: context.tenantId,
      modelKey: modelId, taskType: context.taskType, source: context.source,
      tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut,
      cost: cost.amount, isError: false, latencyMs,
    }).catch((e) => logger.warn(`[Gateway] 聚合写入失败: ${e.message}`));
  }

  // ── 长期记忆自动存储（Post-invoke）──
  if (ctx.enableLTM !== false && context.userId && status === 'success') {
    try {
      const callId = null; // logCall doesn't return id in current impl
      if (cwResult?.budget) {
        saveBudgetLog(ctx.sessionId, cwResult.budget, callId).catch(err => logger.warn('[Gateway] budget log save failed:', err.message));
      }
      // 自动记住关键交互
      const userInputSnippet = typeof input === 'string' ? input.slice(0, 500) : '';
      const outputSnippet = typeof result.output === 'string' ? result.output.slice(0, 500) : '';
      if (userInputSnippet && outputSnippet) {
        ltmService.store({
          namespace: 'user', subjectId: String(context.userId),
          memoryKey: `call_${Date.now()}`,
          content: `[Q] ${userInputSnippet}\n[A] ${outputSnippet}`,
          memoryType: 'conversation', importance: 0.3,
          source: ctx.sessionId || 'gateway',
          tags: [modelId, context.taskType].filter(Boolean),
          metadata: { modelId, tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut, cost: cost.amount },
        }).catch(err => logger.warn('[Gateway] LTM auto-store failed:', err.message));
      }
    } catch (e) {
      logger.warn(`[Gateway] LTM auto-store failed: ${e.message}`);
    }
  }

  return {
    ...result, tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut,
    cost, correlationId: context.correlationId,
  };
}

/**
 * 统一调度入口 — 替换 routes 中直接的 dispatch() 调用
 */
export async function gatewayDispatch(dispatchReq, ctx = {}) {
  const context = normalizeContext(ctx);
  const start = Date.now();
  let result, status = 'success', errorMsg = '';

  // ── Pre-invoke 安全检测 ──
  const dispatchModelId = dispatchReq?.modelId || dispatchReq?.candidates?.[0] || 'unknown';
  const security = await runPreInvokeSecurityChecks(dispatchModelId, dispatchReq.input || dispatchReq, {
    ...context,
    countryCode: ctx.countryCode || ctx.geo?.country || null,
    platformCode: ctx.platformCode || ctx.taskType || null,
  });
  if (security.blocked) {
    return {
      mode: dispatchReq.mode || 'auto', matchLog: [], selected: null, result: null,
      elapsed: 0, degradationLog: [], blocked: true,
      blockReason: security.blockReason,
      correlationId: context.correlationId,
    };
  }
  const geoConstraints = security.geoConstraints;

  // 传入脱敏后的 input
  const safeDispatchReq = { ...dispatchReq };
  if (security.sanitizedInput !== dispatchReq.input) {
    safeDispatchReq.input = security.sanitizedInput;
  }

  try {
    result = await _dispatch(safeDispatchReq);
  } catch (err) {
    status = 'error';
    errorMsg = err.message;
    result = { mode: dispatchReq.mode || 'auto', matchLog: [], selected: null, result: null, elapsed: Date.now() - start, degradationLog: [] };
  }

  const rawUsage = result?.result;
  const tokensIn = rawUsage?.tokensIn || rawUsage?.output?.tokensIn || 0;
  const tokensOut = rawUsage?.tokensOut || rawUsage?.output?.tokensOut || 0;
  const modelId = result?.selected?.id || result?.selected?.modelId || dispatchReq?.modelId || 'unknown';
  const latencyMs = result?.elapsed || (Date.now() - start);

  const pricing = await tokenPricingDao.getActiveByKey(modelId);
  const cost = pricing
    ? await tokenPricingDao.calculateCost(modelId, tokensIn, tokensOut, 1)
    : { amount: 0, currency: 'CNY', pricingId: null, details: null };

  // 输出审核 — 后置过滤 + PII二次脱敏 + 高风险拦截
  let moderationResult = null;
  if (result?.result && status === 'success') {
    try {
      const { moderateOutput } = await import('../services/outputModerationService.js');
      const textOutput = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
      const reviewLevel = geoConstraints?.reviewLevel || 5;
      const blockedTerms = geoConstraints?.outputConstraints?.forbiddenTerms || [];
      const requiredPatterns = geoConstraints?.outputConstraints?.requiredPatterns || null;
      const enableAliyun = process.env.SECURITY_ALIYUN_GREEN_ENABLED === 'true';
      const modResult = await moderateOutput(textOutput, { level: reviewLevel, blockedTerms, requiredPatterns, enableAliyun });
      moderationResult = JSON.stringify(modResult);
      if (modResult.sanitizedOutput) {
        result.result = modResult.sanitizedOutput;
      }
      if (!modResult.passed && modResult.riskLevel === 'high') {
        status = 'blocked';
        errorMsg = '输出包含违规内容，已被拦截';
        result.result = null;
      }
    } catch (e) {
      logger.warn(`[Gateway] Moderation failed: ${e.message}`);
    }
  }

  await modelConfigDao.logCall({
    userId: context.userId, tenantId: context.tenantId,
    modelKey: modelId, taskType: context.taskType, inputHash: '',
    status, latencyMs, tokensIn, tokensOut,
    errorMsg, moderationResult,
    costAmount: cost.amount, costCurrency: cost.currency,
    pricingId: cost.pricingId, costDetails: cost.details,
    correlationId: context.correlationId, source: context.source,
  });

  await modelConfigDao.incrementUsage(modelId, {
    latencyMs, tokensIn, tokensOut, isError: status === 'error',
  });

  if (status === 'success') {
    tokenStatsDao.incrementAllDimensions({
      userId: context.userId, tenantId: context.tenantId,
      modelKey: modelId, taskType: context.taskType, source: context.source,
      tokensIn, tokensOut, cost: cost.amount, isError: false, latencyMs,
    }).catch((e) => logger.warn(`[Gateway] 聚合写入失败: ${e.message}`));
  }

  return { ...result, tokensIn, tokensOut, cost, correlationId: context.correlationId };
}

/**
 * 统一路由入口 — 替换 routes 中直接的 routeModel() 调用
 * model-router.service.js 内部已自行写 ai_call_log + incrementUsage
 * 此处追加成本字段到 ai_call_log(row)，并写入聚合统计
 */
export async function gatewayRoute(params, ctx = {}) {
  const context = normalizeContext(ctx);
  const start = Date.now();

  // ── Pre-invoke 安全检测 ──
  const routeModelId = params?.modelKey || 'unknown';
  const routeInput = params?.params || params;
  const security = await runPreInvokeSecurityChecks(routeModelId, routeInput, {
    ...context,
    countryCode: ctx.countryCode || ctx.geo?.country || null,
    platformCode: ctx.platformCode || ctx.taskType || null,
  });
  if (security.blocked) {
    return {
      blocked: true, blockReason: security.blockReason,
      tokensIn: 0, tokensOut: 0, cost: { amount: 0, currency: 'CNY' },
      correlationId: context.correlationId,
    };
  }
  const geoConstraints = security.geoConstraints;

  // 传入脱敏后的 params
  const safeParams = security.sanitizedInput !== routeInput
    ? { ...params, params: security.sanitizedInput }
    : params;

  const router = _modelRouter;
  let result, status = 'success', errorMsg = '';

  try {
    result = await router.routeModel(safeParams);
  } catch (err) {
    status = 'error';
    errorMsg = err.message;
    result = null;
  }

  const tokensIn = result?.usage?.input_tokens || result?.usage?.prompt_tokens || 0;
  const tokensOut = result?.usage?.output_tokens || result?.usage?.completion_tokens || 0;
  const modelKey = params?.modelKey || 'unknown';
  const latencyMs = Date.now() - start;

  const pricing = await tokenPricingDao.getActiveByKey(modelKey);
  const cost = pricing
    ? await tokenPricingDao.calculateCost(modelKey, tokensIn, tokensOut, 1)
    : { amount: 0, currency: 'CNY', pricingId: null, details: null };

  // 输出审核 — 后置过滤 + PII二次脱敏 + 高风险拦截
  let moderationResult = null;
  if (result?.response && status === 'success') {
    try {
      const { moderateOutput } = await import('../services/outputModerationService.js');
      const textOutput = result.response?.choices?.[0]?.message?.content || JSON.stringify(result.response);
      const reviewLevel = geoConstraints?.reviewLevel || 5;
      const blockedTerms = geoConstraints?.outputConstraints?.forbiddenTerms || [];
      const requiredPatterns = geoConstraints?.outputConstraints?.requiredPatterns || null;
      const enableAliyun = process.env.SECURITY_ALIYUN_GREEN_ENABLED === 'true';
      const modResult = await moderateOutput(textOutput, { level: reviewLevel, blockedTerms, requiredPatterns, enableAliyun });
      moderationResult = JSON.stringify(modResult);
      if (modResult.sanitizedOutput) {
        if (result.response?.choices?.[0]?.message) {
          result.response.choices[0].message.content = modResult.sanitizedOutput;
        }
      }
      if (!modResult.passed && modResult.riskLevel === 'high') {
        status = 'blocked';
        errorMsg = '输出包含违规内容，已被拦截';
        result.response = null;
      }
    } catch (e) {
      logger.warn(`[Gateway] Moderation failed: ${e.message}`);
    }
  }

  // 追加 Gateway 层日志（含成本字段）— model-router 已写基础行，此行补全成本核算
  await modelConfigDao.logCall({
    userId: context.userId, tenantId: context.tenantId,
    modelKey, taskType: context.taskType, inputHash: '',
    status, latencyMs, tokensIn, tokensOut,
    errorMsg, moderationResult,
    costAmount: cost.amount, costCurrency: cost.currency,
    pricingId: cost.pricingId, costDetails: cost.details,
    correlationId: context.correlationId, source: context.source,
  });

  if (status === 'success') {
    tokenStatsDao.incrementAllDimensions({
      userId: context.userId, tenantId: context.tenantId,
      modelKey, taskType: context.taskType, source: context.source,
      tokensIn, tokensOut, cost: cost.amount, isError: false, latencyMs,
    }).catch((e) => logger.warn(`[Gateway] 聚合写入失败: ${e.message}`));
  }

  return { ...(result || {}), tokensIn, tokensOut, cost, correlationId: context.correlationId };
}

// ==================== 扩展点钩子 (Phase 2 预留) ====================

export let quotaCheckHook = null;
export let freezeBudgetHook = null;
export let confirmDeductHook = null;

export function registerHooks({ onQuotaCheck, onFreeze, onConfirm }) {
  if (onQuotaCheck) quotaCheckHook = onQuotaCheck;
  if (onFreeze) freezeBudgetHook = onFreeze;
  if (onConfirm) confirmDeductHook = onConfirm;
  logger.info('[Gateway] 计费扩展钩子已注册');
}

// ==================== 综合信息 ====================

export async function getGatewayStats() {
  const summary = await tokenStatsDao.getDashboardSummary(7);
  const costByModel = await tokenStatsDao.getCostByModel(7);
  const costBySource = await tokenStatsDao.getCostBySource(7);
  const models = listModels();
  return {
    uptime: process.uptime(),
    registeredModels: models.length,
    models: models.map((m) => m.id),
    last7Days: summary,
    costByModel,
    costBySource,
  };
}

export async function getGatewayPricing(category) {
  return tokenPricingDao.listActive(category);
}

logger.info('[Gateway] AI Gateway Hub 已初始化');
