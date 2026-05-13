/**
 * AI Gateway Controller — Token 集约化中台
 * 所有大模型/AI 调用统一通过 /api/ai/gateway/* 入口
 */
import { wrapController } from '../utils/wrapController.js';
import { gatewayInfer, gatewayDispatch, gatewayRoute, getGatewayStats, getGatewayPricing } from '../gateway/aiGatewayHub.js';
import { getDashboardSummary, getModelBreakdown, getTimeSeries, getTopUsers } from '../services/monitorService.js';
import { checkAlerts, getAlertRules } from '../services/alertService.js';
import { submitAsyncTask, getTaskStatus as _getTaskStatus, createSSEStream, processStreamingOutput } from '../services/streamingService.js';
import { streamInfer } from '../services/aiEngine.js';
import { moderateText } from '../services/moderation.service.js';
import { moderateOutput } from '../services/outputModerationService.js';
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
    const hours = Number.isFinite(+req.query.hours) ? +req.query.hours : 24;
    const summary = getDashboardSummary(hours);
    const alerts = checkAlerts(summary);
    return { summary, alerts, timestamp: new Date().toISOString() };
  }),

  modelBreakdown: wrapController(async () => {
    return getModelBreakdown();
  }),

  timeSeries: wrapController(async (req) => {
    const hours = Number.isFinite(+req.query.hours) ? +req.query.hours : 24;
    return getTimeSeries(hours);
  }),

  topUsers: wrapController(async (req) => {
    const limit = Number.isFinite(+req.query.limit) ? +req.query.limit : 10;
    return getTopUsers(limit);
  }),

  alertRules: wrapController(async () => {
    const stats = getDashboardSummary(1);
    const alerts = checkAlerts(stats);
    return { rules: getAlertRules(), lastCheck: alerts };
  }),

  // ── 异步任务 ──
  asyncSubmit: wrapController(async (req) => {
    const { modelId, input, taskType } = req.body;
    const taskId = submitAsyncTask({
      modelId, input, taskType,
      userId: req.user?.id,
    });
    return { taskId, status: 'queued' };
  }),

  asyncStatus: wrapController(async (req) => {
    const { taskId } = req.params;
    return _getTaskStatus(taskId);
  }),


	  streamInfer: wrapController(async (req, res) => {
	    const { modelId, input } = req.body;
	    const stream = createSSEStream(res);

	    try {
	      // Pre-invoke: 快速输入安全检查
	      const textInput = typeof input === 'string' ? input : JSON.stringify(input);
	      const preCheck = await moderateText(textInput, req.user?.id, { stage: 'input' });
	      if (preCheck.action === 'block') {
	        stream.error('内容包含违规信息，请修改后重试', 400);
	        return;
	      }

	      // 创建真实流式源（优先原生 streaming，不支持时自动降级模拟）
	      const sourceStream = streamInfer(modelId, input, {
	        onProgress: (p) => logger.debug(`[Stream] ${modelId} progress: ${p}%`),
	      });

	      // 边输出边审核管线
	      const { accumulated, blocked } = await processStreamingOutput(sourceStream, stream, {
	        moderateInterval: 5,
	        moderator: async (accumulatedText) => {
	          if (!accumulatedText || accumulatedText.length < 20) return { passed: true };
	          try {
	            const result = await moderateOutput(accumulatedText, { level: 5, enableAliyun: false });
	            return { passed: result.passed, violations: result.violations };
	          } catch {
	            return { passed: true };
	          }
	        },
	      });

	      if (blocked) {
	        logger.warn(`[Stream] 输出审核拦截: model=${modelId} user=${req.user?.id}`);
	      }
	    } catch (err) {
	      logger.error(`[Stream] 流式推理失败: ${err.message}`);
	      stream.error(err.message);
	    }
	  }),
};
