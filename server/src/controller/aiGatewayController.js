/**
 * AI Gateway Controller — Token 集约化中台
 * 所有大模型/AI 调用统一通过 /api/ai/gateway/* 入口
 */
import { wrapController } from '../utils/wrapController.js';
import { gatewayInfer, gatewayDispatch, gatewayRoute, getGatewayStats, getGatewayPricing } from '../gateway/aiGatewayHub.js';
import { getDashboardSummary, getModelBreakdown, getTimeSeries, getTopUsers } from '../services/monitorService.js';
import { checkAlerts, getAlertRules } from '../services/alertService.js';
import logger from '../utils/logger.js';

export const aiGatewayController = {

  infer: wrapController(async (req) => {
    const { modelId, input, taskType, source, maxRetries, skipCache } = req.body;
    logger.info(`[Gateway] POST /infer model=${modelId} taskType=${taskType || '-'} source=${source || 'consumer'}`);
    const result = await gatewayInfer(modelId, input, {
      userId: req.user?.id,
      tenantId: req.tenantId,
      taskType: taskType || 'unknown',
      source: source || 'consumer',
      correlationId: req.headers['x-correlation-id'] || null,
      maxRetries,
      skipCache,
    });
    return {
      modelId: result.modelId,
      output: result.output,
      elapsed: result.elapsed,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cost: result.cost,
      correlationId: result.correlationId,
    };
  }),

  dispatch: wrapController(async (req) => {
    return await gatewayDispatch(req.body, {
      userId: req.user?.id,
      tenantId: req.tenantId,
      taskType: req.body.taskType || 'unknown',
      source: req.body.source || 'consumer',
      correlationId: req.headers['x-correlation-id'] || null,
    });
  }),

  route: wrapController(async (req) => {
    return await gatewayRoute(req.body, {
      userId: req.user?.id,
      tenantId: req.tenantId,
      taskType: req.body.taskType || 'unknown',
      source: req.body.source || 'consumer',
      correlationId: req.headers['x-correlation-id'] || null,
    });
  }),

  statsTokens: wrapController(async () => {
    return await getGatewayStats();
  }),

  pricing: wrapController(async (req) => {
    const { category } = req.query;
    return await getGatewayPricing(category || null);
  }),

  // ── 监控看板 ──
  dashboard: wrapController(async (req) => {
    const hours = parseInt(req.query.hours || '24', 10);
    const summary = getDashboardSummary(hours);
    const alerts = checkAlerts(summary);
    return { summary, alerts, timestamp: new Date().toISOString() };
  }),

  modelBreakdown: wrapController(async () => {
    return getModelBreakdown();
  }),

  timeSeries: wrapController(async (req) => {
    const hours = parseInt(req.query.hours || '24', 10);
    return getTimeSeries(hours);
  }),

  topUsers: wrapController(async (req) => {
    const limit = parseInt(req.query.limit || '10', 10);
    return getTopUsers(limit);
  }),

  alertRules: wrapController(async () => {
    const stats = getDashboardSummary(1);
    const alerts = checkAlerts(stats);
    return { rules: getAlertRules(), lastCheck: alerts };
  }),
};
