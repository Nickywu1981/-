/**
 * 运营看板控制器
 */
import { wrapController } from '../utils/wrapController.js';
import { getDashboardOverview } from '../services/dashboard.service.js';
import { success } from '../utils/response.js';

export const dashboardOverview = wrapController(async (_req, res) => {
  const data = await getDashboardOverview();
  success(res, data);
});
