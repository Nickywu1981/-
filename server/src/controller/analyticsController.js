/**
 * 行为埋点控制器
 */
import analyticsService from '../services/analyticsService.js';
import { success } from '../utils/response.js';

/** POST /api/analytics/track — 记录用户行为事件 */
export async function track(req, res) {
  const { event, metadata } = req.body;
  const userId = req.user?.id || null;
  await analyticsService.trackEvent(userId, event, { ...metadata, ip: req.ip });
  success(res, null, 'ok');
}

/** GET /api/analytics/funnel — 注册漏斗数据 */
export async function funnel(req, res) {
  const days = parseInt(req.query.days) || 30;
  const data = await analyticsService.getFunnelMetrics(days);
  success(res, data);
}

/** GET /api/analytics/active — DAU/MAU */
export async function active(req, res) {
  const data = await analyticsService.getActiveUsers();
  success(res, data);
}

/** GET /api/analytics/top-tools — 热门工具 */
export async function topTools(req, res) {
  const days = parseInt(req.query.days) || 7;
  const limit = parseInt(req.query.limit) || 10;
  const data = await analyticsService.getTopTools(days, limit);
  success(res, data);
}

/** GET /api/analytics/trend — 每日趋势 */
export async function trend(req, res) {
  const days = parseInt(req.query.days) || 30;
  const data = await analyticsService.getDailyTrend(days);
  success(res, data);
}
