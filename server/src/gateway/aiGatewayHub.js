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
 *  pre-invoke  → 提取上下文 + 查定价 + [Phase2: 配额检查/预算冻结]
 *  invoke      → 委托执行引擎
 *  post-invoke → Token 归一化 + 成本计算 + 统一日志 + 聚合统计 + [Phase2: 扣费]
 */
import logger from '../utils/logger.js';
import { infer, listModels } from '../services/aiEngine.js';
import { extractUsage, estimateTokens } from '../services/tokenMeteringService.js';
import * as tokenPricingDao from '../dao/tokenPricingDao.js';
import * as tokenStatsDao from '../dao/tokenStatsDao.js';
import * as modelConfigDao from '../dao/modelConfigDao.js';
import { dispatch as _dispatch } from '../services/modelDispatcher.js';
import * as _modelRouter from '../services/model-router.service.js';

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

// ==================== 核心方法 ====================

/**
 * 统一推理入口 — 替换 routes 中直接的 infer() 调用
 */
export async function gatewayInfer(modelId, input, ctx = {}) {
  const context = normalizeContext(ctx);
  const start = Date.now();

  const pricing = await tokenPricingDao.getActiveByKey(modelId);
  const model = listModels().find((m) => m.id === modelId);

  let result, status = 'success', errorMsg = '';
  try {
    result = await infer(modelId, input, { onProgress: ctx.onProgress, maxRetries: ctx.maxRetries, skipCache: ctx.skipCache });
  } catch (err) {
    status = 'error';
    errorMsg = err.message;
    result = { modelId, output: null, elapsed: Date.now() - start, retries: 0, degraded: false, tokensIn: 0, tokensOut: 0 };
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
  await modelConfigDao.logCall({
    userId: context.userId, tenantId: context.tenantId,
    modelKey: modelId, taskType: context.taskType, inputHash: '',
    status, latencyMs, tokensIn: effectiveTokensIn, tokensOut: effectiveTokensOut,
    errorMsg, moderationResult: null,
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

  try {
    result = await _dispatch(dispatchReq);
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

  await modelConfigDao.logCall({
    userId: context.userId, tenantId: context.tenantId,
    modelKey: modelId, taskType: context.taskType, inputHash: '',
    status, latencyMs, tokensIn, tokensOut,
    errorMsg, moderationResult: null,
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

  const router = _modelRouter;
  let result, status = 'success', errorMsg = '';

  try {
    result = await router.routeModel(params);
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

  // 追加 Gateway 层日志（含成本字段）— model-router 已写基础行，此行补全成本核算
  await modelConfigDao.logCall({
    userId: context.userId, tenantId: context.tenantId,
    modelKey, taskType: context.taskType, inputHash: '',
    status, latencyMs, tokensIn, tokensOut,
    errorMsg, moderationResult: null,
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
