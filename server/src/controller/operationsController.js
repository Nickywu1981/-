/**
 * 跨租户运营看板 Controller
 */
import { wrapController } from '../utils/wrapController.js';
import {
  getOpsOverview,
  getTokenAggregation,
  getProfitOverview,
  getOpsTrends,
  getTenantRanking,
} from '../services/operationsService.js';

export const operationsController = {

  overview: wrapController(async () => {
    return await getOpsOverview();
  }),

  tokens: wrapController(async (req) => {
    return await getTokenAggregation({ days: req.query.days });
  }),

  profits: wrapController(async () => {
    return await getProfitOverview();
  }),

  trends: wrapController(async (req) => {
    return await getOpsTrends({ days: req.query.days });
  }),

  tenantRanking: wrapController(async (req) => {
    return await getTenantRanking({ metric: req.query.metric, limit: req.query.limit });
  }),
};
