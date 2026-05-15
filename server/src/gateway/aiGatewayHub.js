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
 * 全链路强制管线 (每条路径严格按顺序):
 *  意图识别 → 合规校验 → 模板匹配 → 提示词封装 → GEO检查 → PII脱敏 → 内容审核 → invoke → post-invoke
 *
 * 共享基础设施已拆分至 gatewayCore.js，本文件仅保留三条核心路径 + 管理API。
 */
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';
import { infer, listModels, getFallbackModel } from '../services/aiEngine.js';
import { estimateTokens } from '../services/tokenMeteringService.js';
import * as tokenPricingDao from '../dao/tokenPricingDao.js';
import * as tokenStatsDao from '../dao/tokenStatsDao.js';
import * as modelConfigDao from '../dao/modelConfigDao.js';
import { dispatch as _dispatch } from '../services/modelDispatcher.js';
import * as _modelRouter from '../services/model-router.service.js';
import { manageContextWindow, saveBudgetLog } from '../services/contextWindowService.js';
import * as ltmService from '../services/longTermMemoryService.js';
import { recordCall, recordCircuitBreakerTrip } from '../services/monitorService.js';
import { getTraceContext } from '../services/traceService.js';
import { buildErrorResponse } from '../services/outputPostProcessor.js';
import { allocateBudget } from '../services/budgetAllocator.js';
import { registerBuiltinHooks, runPreHooks, runPostHooks } from '../services/hookRegistryService.js';
import { aiGatewayConfig, securityConfig } from '../config/index.js';
import {
  normalizeContext,
  getModelBreaker,
  timeoutPromise,
  runBusinessPipeline,
  runPreInvokeSecurityChecks,
  runOutputModerationAndPostProcess,
  TOTAL_TIMEOUT,
} from './gatewayCore.js';

// 钩子注册中心开关
const USE_HOOK_REGISTRY = aiGatewayConfig.useHookRegistry;
if (USE_HOOK_REGISTRY) {
  registerBuiltinHooks();
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

  // ── Step 0: 业务管线 (意图识别 → 合规校验 → 模板匹配 → 提示词封装) ──
  const businessPipeline = await runBusinessPipeline(input, {
    ...context,
    platform: ctx.platform || ctx.platformCode || null,
    platformCode: ctx.platformCode || ctx.taskType || null,
    industry: ctx.industry || null,
    brandTone: ctx.brandTone || null,
    variables: ctx.variables || {},
  });
  if (businessPipeline.blocked) {
    return {
      modelId, output: null, elapsed: 0, retries: 0, degraded: false,
      tokensIn: 0, tokensOut: 0, blocked: true, correlationId: context.correlationId,
      error: buildErrorResponse(businessPipeline.blockReason, { modelId, traceId: getTraceContext()?.traceId }),
      businessPipeline: businessPipeline.wrapResult,
    };
  }

  // 若有封装结果，用封装后的 prompt 替换原始输入
  let effectiveInput = input;
  if (businessPipeline.wrapResult?.wrapped) {
    effectiveInput = businessPipeline.wrapResult.wrapped.prompt;
    ctx._systemPrompt = businessPipeline.wrapResult.wrapped.system;
    ctx._intentId = businessPipeline.wrapResult.intent?.intentId;
    ctx._category = businessPipeline.wrapResult.wrapped.category;
  }

  // ── Pre-invoke 安全检测 (GEO + PII脱敏 + 内容审核) ──
  let security;
  if (USE_HOOK_REGISTRY) {
    const hookResult = await runPreHooks({
      modelId, input: effectiveInput, userId: context.userId, taskType: context.taskType,
      countryCode: ctx.countryCode || ctx.geo?.country || null,
      platformCode: ctx.platformCode || ctx.taskType || null,
    });
    if (hookResult.blocked) {
      return {
        modelId, output: null, elapsed: 0, retries: 0, degraded: false,
        tokensIn: 0, tokensOut: 0, blocked: true, correlationId: context.correlationId,
        error: buildErrorResponse(hookResult.reason || '请求被阻止', { modelId, traceId: getTraceContext()?.traceId }),
      };
    }
    const modCtx = hookResult.modifiedContext || {};
    security = {
      blocked: false,
      sanitizedInput: modCtx.input || effectiveInput,
      geoConstraints: modCtx._geoConstraints || null,
      moderationResult: modCtx._moderationResult || null,
    };
  } else {
    security = await runPreInvokeSecurityChecks(modelId, effectiveInput, {
      ...context,
      countryCode: ctx.countryCode || ctx.geo?.country || null,
      platformCode: ctx.platformCode || ctx.taskType || null,
    });
  }
  if (security.blocked) {
    return {
      modelId, output: null, elapsed: 0, retries: 0, degraded: false,
      tokensIn: 0, tokensOut: 0, blocked: true, correlationId: context.correlationId,
      error: buildErrorResponse(security.blockReason, { modelId, traceId: getTraceContext()?.traceId }),
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

  // ── P2 动态 Token 预算分配 ──
  const budgetEnabled = aiGatewayConfig.budgetAllocator?.enabled !== false;
  let budgetInfo = null;
  let effectiveInferInput = sanitizedInput;
  if (budgetEnabled && typeof sanitizedInput === 'string' && ctx.taskType) {
    budgetInfo = allocateBudget({
      taskType: ctx.taskType,
      userInput: sanitizedInput,
      intentId: ctx._intentId,
      category: ctx._category,
      sessionMessageCount: (ctx.historyMessages || []).length,
      hourlyBudgetUsedPct: ctx._hourlyBudgetUsedPct || 0,
    });
    if (budgetInfo.maxTokens > 0) {
      effectiveInferInput = { prompt: sanitizedInput, maxTokens: budgetInfo.maxTokens };
      if (ctx._systemPrompt) effectiveInferInput.systemPrompt = ctx._systemPrompt;
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
          infer(fallbacks[0], effectiveInferInput, { onProgress: ctx.onProgress, maxRetries: 1, skipCache: true }),
          timeoutPromise(TOTAL_TIMEOUT, '降级模型调用'),
        ]);
      } else {
        throw new BusinessError(ERROR_CODE.PARAM_MISSING, `Model ${modelId} unavailable, no fallback`);
      }
    } else {
      // 正常调用（总超时兜底）
      result = await Promise.race([
        infer(modelId, effectiveInferInput, { onProgress: ctx.onProgress, maxRetries: ctx.maxRetries, skipCache: ctx.skipCache }),
        timeoutPromise(TOTAL_TIMEOUT, '模型调用'),
      ]);
    }

    if (breaker) breaker.recordSuccess();

    // ── P2 截断检测 + 自动升档重试 ──
    if (result && budgetInfo && budgetInfo.maxTokens > 0 && !result.degraded && result.tokensOut > 0) {
      const usageRatio = result.tokensOut / budgetInfo.maxTokens;
      if (usageRatio >= 0.95 || result.output?.finishReason === 'length') {
        const upgraded = (await import('../services/budgetAllocator.js')).upgradeBand(budgetInfo);
        if (upgraded) {
          logger.warn('[Gateway] 检测到截断，自动升档重试', {
            prevBand: budgetInfo.bandName, prevTokens: budgetInfo.maxTokens,
            newBand: upgraded.bandName, newTokens: upgraded.maxTokens,
            usageRatio: (usageRatio * 100).toFixed(1) + '%',
          });
          try {
            const retryInput = { prompt: sanitizedInput, maxTokens: upgraded.maxTokens };
            if (ctx._systemPrompt) retryInput.systemPrompt = ctx._systemPrompt;
            const retryResult = await Promise.race([
              infer(modelId, retryInput, { onProgress: ctx.onProgress, maxRetries: 0, skipCache: true }),
              timeoutPromise(TOTAL_TIMEOUT, '升档重试'),
            ]);
            if (retryResult && !retryResult.degraded) {
              result = retryResult;
              budgetInfo = upgraded;
            }
          } catch (retryErr) {
            logger.warn('[Gateway] 升档重试失败，使用原结果', { error: retryErr.message });
          }
        }
      }
    }
  } catch (err) {
    status = 'error';
    errorMsg = err.message;

    if (breaker) { breaker.recordFailure(); recordCircuitBreakerTrip(modelId); }

    // 未降级过则尝试降级
    if (!triedFallback) {
      const fallbacks = getFallbackModel(modelId);
      if (fallbacks.length > 0) {
        try {
          logger.warn(`[Gateway] 模型 ${modelId} 失败，降级到 ${fallbacks[0]}`);
          result = await Promise.race([
            infer(fallbacks[0], effectiveInferInput, { onProgress: ctx.onProgress, maxRetries: 1, skipCache: true }),
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
      const errResp = buildErrorResponse(errorMsg, { modelId, traceId: getTraceContext()?.traceId });
      logger.error(`[Gateway] infer 失败: ${errResp.code} — ${errResp.message} (detail: ${errorMsg})`);
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

  // ── 输出审核 + 后处理 (共用管线) ──
  let moderationResult = null;
  {
    const mod = await runOutputModerationAndPostProcess({
      getOutput: () => result.output,
      setOutput: (v) => { result.output = v; },
      clearOutput: () => { result.output = null; },
    }, geoConstraints, ctx);
    moderationResult = mod.moderationResult;
    if (mod.status !== 'success') { status = mod.status; errorMsg = mod.errorMsg; }
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

  // ── 监控指标记录 ──
  recordCall({
    modelId, userId: context.userId,
    status, tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut,
    cost, latencyMs,
  });

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

  // ── Post-invoke 钩子（输出审核 + Token泄漏检测）──
  if (USE_HOOK_REGISTRY && status === 'success') {
    try {
      const postCtx = await runPostHooks({
        modelId, userId: context.userId, taskType: context.taskType,
        output: result.output || null,
        tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut, cost, latencyMs,
      });
      if (postCtx.output !== undefined && result.output !== undefined) {
        result.output = postCtx.output;
      }
    } catch (e) {
      logger.warn(`[Gateway] Post-hook 执行异常: ${e.message}`);
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

  // ── Step 0: 业务管线 ──
  const dispatchInput = dispatchReq.input || dispatchReq;
  const dispatchBusiness = await runBusinessPipeline(dispatchInput, {
    ...context,
    platform: ctx.platform || ctx.platformCode || null,
    platformCode: ctx.platformCode || ctx.taskType || null,
    industry: ctx.industry || null,
    brandTone: ctx.brandTone || null,
    variables: ctx.variables || {},
  });
  if (dispatchBusiness.blocked) {
    return {
      mode: dispatchReq.mode || 'auto', matchLog: [], selected: null, result: null,
      elapsed: 0, degradationLog: [], blocked: true, correlationId: context.correlationId,
      error: buildErrorResponse(dispatchBusiness.blockReason, { modelId: dispatchReq?.modelId || 'unknown', traceId: getTraceContext()?.traceId }),
      businessPipeline: dispatchBusiness.wrapResult,
    };
  }

  let effectiveDispatchInput = dispatchInput;
  if (dispatchBusiness.wrapResult?.wrapped) {
    effectiveDispatchInput = dispatchBusiness.wrapResult.wrapped.prompt;
    ctx._systemPrompt = dispatchBusiness.wrapResult.wrapped.system;
    ctx._intentId = dispatchBusiness.wrapResult.intent?.intentId;
    ctx._category = dispatchBusiness.wrapResult.wrapped.category;
  }

  // ── Pre-invoke 安全检测 ──
  const dispatchModelId = dispatchReq?.modelId || dispatchReq?.candidates?.[0] || 'unknown';
  let dispatchSecurity;
  if (USE_HOOK_REGISTRY) {
    const hookResult = await runPreHooks({
      modelId: dispatchModelId, input: effectiveDispatchInput,
      userId: context.userId, taskType: context.taskType,
      countryCode: ctx.countryCode || ctx.geo?.country || null,
      platformCode: ctx.platformCode || ctx.taskType || null,
    });
    if (hookResult.blocked) {
      return {
        mode: dispatchReq.mode || 'auto', matchLog: [], selected: null, result: null,
        elapsed: 0, degradationLog: [], blocked: true, correlationId: context.correlationId,
        error: buildErrorResponse(hookResult.reason || '请求被阻止', { modelId: dispatchModelId, traceId: getTraceContext()?.traceId }),
      };
    }
    const modCtx = hookResult.modifiedContext || {};
    dispatchSecurity = {
      blocked: false,
      sanitizedInput: modCtx.input || effectiveDispatchInput,
      geoConstraints: modCtx._geoConstraints || null,
      moderationResult: modCtx._moderationResult || null,
    };
  } else {
    dispatchSecurity = await runPreInvokeSecurityChecks(dispatchModelId, effectiveDispatchInput, {
      ...context,
      countryCode: ctx.countryCode || ctx.geo?.country || null,
      platformCode: ctx.platformCode || ctx.taskType || null,
    });
  }
  if (dispatchSecurity.blocked) {
    return {
      mode: dispatchReq.mode || 'auto', matchLog: [], selected: null, result: null,
      elapsed: 0, degradationLog: [], blocked: true, correlationId: context.correlationId,
      error: buildErrorResponse(dispatchSecurity.blockReason, { modelId: dispatchModelId, traceId: getTraceContext()?.traceId }),
    };
  }
  const geoConstraints = dispatchSecurity.geoConstraints;

  // 传入脱敏后的 input
  const safeDispatchReq = { ...dispatchReq };
  if (dispatchSecurity.sanitizedInput !== effectiveDispatchInput) {
    safeDispatchReq.input = dispatchSecurity.sanitizedInput;
  }

  try {
    result = await _dispatch(safeDispatchReq);
  } catch (err) {
    status = 'error';
    errorMsg = err.message;
    result = { mode: dispatchReq.mode || 'auto', matchLog: [], selected: null, result: null, elapsed: Date.now() - start, degradationLog: [] };
    const errResp = buildErrorResponse(errorMsg, { modelId: dispatchModelId, traceId: getTraceContext()?.traceId });
    logger.error(`[Gateway] dispatch 失败: ${errResp.code} — ${errResp.message} (detail: ${errorMsg})`);
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

  // ── 输出审核 + 后处理 (共用管线) ──
  // dispatcher 返回 { mode, matchLog, selected, result }，实际文本在 result.result.output
  let moderationResult = null;
  {
    const mod = await runOutputModerationAndPostProcess({
      getOutput: () => result?.result?.output || null,
      setOutput: (v) => { if (result?.result) result.result.output = v; },
      clearOutput: () => { if (result?.result) result.result.output = null; },
    }, geoConstraints, ctx);
    moderationResult = mod.moderationResult;
    if (mod.status !== 'success') { status = mod.status; errorMsg = mod.errorMsg; }
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

  // ── 监控指标记录 ──
  recordCall({
    modelId, userId: context.userId,
    status, tokensIn, tokensOut,
    cost, latencyMs,
  });

  // ── Post-invoke 钩子（输出审核 + Token泄漏检测）──
  if (USE_HOOK_REGISTRY && status === 'success') {
    try {
      const postCtx = await runPostHooks({
        modelId, userId: context.userId, taskType: context.taskType,
        // dispatcher 包装: result.result 是 infer() 返回值，其中 .output 是实际文本
        output: (result.result && typeof result.result === 'object' ? result.result.output : result.result) || null,
        tokensIn, tokensOut, cost, latencyMs,
      });
      if (postCtx.output !== undefined) {
        if (result.result && typeof result.result === 'object') {
          result.result.output = postCtx.output;
        } else {
          result.result = postCtx.output;
        }
      }
    } catch (e) {
      logger.warn(`[Gateway] Post-hook 执行异常: ${e.message}`);
    }
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

  // ── Step 0: 业务管线 ──
  const routeInput = params?.params || params;
  const routeBusiness = await runBusinessPipeline(routeInput, {
    ...context,
    platform: ctx.platform || ctx.platformCode || null,
    platformCode: ctx.platformCode || ctx.taskType || null,
    industry: ctx.industry || null,
    brandTone: ctx.brandTone || null,
    variables: ctx.variables || {},
  });
  if (routeBusiness.blocked) {
    return {
      blocked: true, tokensIn: 0, tokensOut: 0, cost: { amount: 0, currency: 'CNY' },
      correlationId: context.correlationId,
      error: buildErrorResponse(routeBusiness.blockReason, { modelId: params?.modelKey || 'unknown', traceId: getTraceContext()?.traceId }),
      businessPipeline: routeBusiness.wrapResult,
    };
  }

  let effectiveRouteInput = routeInput;
  if (routeBusiness.wrapResult?.wrapped) {
    effectiveRouteInput = routeBusiness.wrapResult.wrapped.prompt;
    ctx._systemPrompt = routeBusiness.wrapResult.wrapped.system;
    ctx._intentId = routeBusiness.wrapResult.intent?.intentId;
    ctx._category = routeBusiness.wrapResult.wrapped.category;
  }

  // ── Pre-invoke 安全检测 ──
  const routeModelId = params?.modelKey || 'unknown';
  let routeSecurity;
  if (USE_HOOK_REGISTRY) {
    const hookResult = await runPreHooks({
      modelId: routeModelId, input: effectiveRouteInput,
      userId: context.userId, taskType: context.taskType,
      countryCode: ctx.countryCode || ctx.geo?.country || null,
      platformCode: ctx.platformCode || ctx.taskType || null,
    });
    if (hookResult.blocked) {
      return {
        blocked: true, tokensIn: 0, tokensOut: 0, cost: { amount: 0, currency: 'CNY' },
        correlationId: context.correlationId,
        error: buildErrorResponse(hookResult.reason || '请求被阻止', { modelId: routeModelId, traceId: getTraceContext()?.traceId }),
      };
    }
    const modCtx = hookResult.modifiedContext || {};
    routeSecurity = {
      blocked: false,
      sanitizedInput: modCtx.input || effectiveRouteInput,
      geoConstraints: modCtx._geoConstraints || null,
      moderationResult: modCtx._moderationResult || null,
    };
  } else {
    routeSecurity = await runPreInvokeSecurityChecks(routeModelId, effectiveRouteInput, {
      ...context,
      countryCode: ctx.countryCode || ctx.geo?.country || null,
      platformCode: ctx.platformCode || ctx.taskType || null,
    });
  }
  if (routeSecurity.blocked) {
    return {
      blocked: true, tokensIn: 0, tokensOut: 0, cost: { amount: 0, currency: 'CNY' },
      correlationId: context.correlationId,
      error: buildErrorResponse(routeSecurity.blockReason, { modelId: routeModelId, traceId: getTraceContext()?.traceId }),
    };
  }
  const geoConstraints = routeSecurity.geoConstraints;

  // 传入脱敏后的 params
  let safeParams = params;
  if (routeSecurity.sanitizedInput !== effectiveRouteInput) {
    const rawParams = params?.params || params;
    if (typeof rawParams === 'string') {
      safeParams = { ...params, params: routeSecurity.sanitizedInput };
    } else {
      // 结构化输入：仅更新 messages 中的用户消息内容，保留 model/temperature 等字段
      const userMsgIdx = rawParams?.messages?.findIndex(m => m.role === 'user');
      if (userMsgIdx >= 0) {
        const updatedMessages = [...rawParams.messages];
        updatedMessages[userMsgIdx] = { ...updatedMessages[userMsgIdx], content: routeSecurity.sanitizedInput };
        safeParams = { ...params, params: { ...rawParams, messages: updatedMessages } };
      }
    }
  }

  const router = _modelRouter;
  let result, status = 'success', errorMsg = '', triedFallback = false;
  const breaker = getModelBreaker(routeModelId);

  try {
    // 熔断器检查
    if (breaker && !breaker.isAvailable()) {
      const fallbackModels = getFallbackModel(routeModelId);
      if (fallbackModels.length > 0) {
        logger.warn(`[Gateway] 模型 ${routeModelId} 已熔断，降级到 ${fallbackModels[0]}`);
        triedFallback = true;
        const fallbackParams = { ...safeParams, modelKey: fallbackModels[0] };
        result = await Promise.race([
          router.routeModel(fallbackParams),
          timeoutPromise(TOTAL_TIMEOUT, '降级模型路由'),
        ]);
      } else {
        throw new BusinessError(ERROR_CODE.MODEL_UNAVAILABLE, `Model ${routeModelId} unavailable and no fallback`);
      }
    } else {
      result = await Promise.race([
        router.routeModel(safeParams),
        timeoutPromise(TOTAL_TIMEOUT, '模型路由'),
      ]);
    }
    if (breaker) breaker.recordSuccess();
  } catch (err) {
    status = 'error';
    errorMsg = err.message;
    if (breaker) { breaker.recordFailure(); recordCircuitBreakerTrip(routeModelId); }

    // 未降级过则尝试降级
    if (!triedFallback) {
      const fallbackModels = getFallbackModel(routeModelId);
      if (fallbackModels.length > 0) {
        try {
          logger.warn(`[Gateway] 模型 ${routeModelId} 失败，降级到 ${fallbackModels[0]}`);
          const fallbackParams = { ...safeParams, modelKey: fallbackModels[0] };
          result = await Promise.race([
            router.routeModel(fallbackParams),
            timeoutPromise(TOTAL_TIMEOUT, '降级模型路由'),
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
      result = null;
      const errResp = buildErrorResponse(errorMsg, { modelId: routeModelId, traceId: getTraceContext()?.traceId });
      logger.error(`[Gateway] route 失败: ${errResp.code} — ${errResp.message} (detail: ${errorMsg})`);
    }
  }

  const tokensIn = result?.usage?.input_tokens || result?.usage?.prompt_tokens || 0;
  const tokensOut = result?.usage?.output_tokens || result?.usage?.completion_tokens || 0;
  const modelKey = params?.modelKey || 'unknown';
  const latencyMs = Date.now() - start;

  const pricing = await tokenPricingDao.getActiveByKey(modelKey);
  const cost = pricing
    ? await tokenPricingDao.calculateCost(modelKey, tokensIn, tokensOut, 1)
    : { amount: 0, currency: 'CNY', pricingId: null, details: null };

  // ── 输出审核 + 后处理 (共用管线) ──
  let moderationResult = null;
  {
    const mod = await runOutputModerationAndPostProcess({
      getOutput: () => result?.response?.choices?.[0]?.message?.content || null,
      setOutput: (v) => { if (result?.response?.choices?.[0]?.message) result.response.choices[0].message.content = v; },
      clearOutput: () => { result.response = null; },
    }, geoConstraints, ctx);
    moderationResult = mod.moderationResult;
    if (mod.status !== 'success') { status = mod.status; errorMsg = mod.errorMsg; }
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

  // ── 监控指标记录 ──
  recordCall({
    modelId: modelKey, userId: context.userId,
    status, tokensIn, tokensOut,
    cost, latencyMs,
  });

  // ── Post-invoke 钩子（输出审核 + Token泄漏检测）──
  if (USE_HOOK_REGISTRY && status === 'success') {
    try {
      const postCtx = await runPostHooks({
        modelId: modelKey, userId: context.userId, taskType: context.taskType,
        output: result?.response?.choices?.[0]?.message?.content || (result?.output || null),
        tokensIn, tokensOut, cost, latencyMs,
      });
      if (postCtx.output !== undefined) {
        if (result?.response?.choices?.[0]?.message) {
          result.response.choices[0].message.content = postCtx.output;
        } else if (result?.output !== undefined) {
          result.output = postCtx.output;
        }
      }
    } catch (e) {
      logger.warn(`[Gateway] Post-hook 执行异常: ${e.message}`);
    }
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
