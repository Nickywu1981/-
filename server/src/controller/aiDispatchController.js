/**
 * AI 调度 Controller — 多模型统一入口
 */
import { wrapController } from '../utils/wrapController.js';
import { getCategories, getModelsByCategory, getUsageStats, healthCheck, clearCache, extensionHooks } from '../services/modelDispatcher.js';
import { gatewayDispatch } from '../gateway/aiGatewayHub.js';

export const aiDispatchController = {

  dispatch: wrapController(async (req) => {
    const { mode, taskType, input, modelId, customConfig } = req.body;
    return await gatewayDispatch(
      { mode, taskType, input, modelId, customConfig },
      { skipCache: req.body.skipCache, userId: req.user?.id, tenantId: req.tenantId, taskType, source: 'consumer', correlationId: req.headers['x-correlation-id'] },
    );
  }),

  getCategories: wrapController(async () => {
    return getCategories();
  }),

  getModelsByCategory: wrapController(async (req) => {
    const models = getModelsByCategory(req.params.category);
    return { category: req.params.category, models: models.map((m) => m.id) };
  }),

  health: wrapController(async () => {
    const health = await healthCheck();
    const stats = getUsageStats();
    const extensions = Object.keys(extensionHooks).reduce((acc, k) => {
      acc[k] = extensionHooks[k] ? 'registered' : 'available';
      return acc;
    }, {});
    return { health, stats, extensions };
  }),

  stats: wrapController(async () => {
    return getUsageStats();
  }),

  clearCache: wrapController(async () => {
    clearCache();
    return {};
  }),
};
