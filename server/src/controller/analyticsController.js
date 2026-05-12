/**
 * 行为埋点控制器
 */
import { wrapController } from '../utils/wrapController.js';
import analyticsService from '../services/analyticsService.js';
import { success } from '../utils/response.js';

export const track = wrapController(async (req, res) => {
    const { event, metadata } = req.body;
    const userId = req.user?.id || null;
    await analyticsService.trackEvent(userId, event, { ...metadata, ip: req.ip });
    success(res, null, 'ok');
});

const safeInt = (v, fallback) => { const n = parseInt(v, 10); return isNaN(n) ? fallback : n; };

export const funnel = wrapController(async (req, res) => {
    const days = req.validated?.days ?? safeInt(req.query.days, 30);
    const data = await analyticsService.getFunnelMetrics(days);
    success(res, data);
});

export const active = wrapController(async (req, res) => {
    const data = await analyticsService.getActiveUsers();
    success(res, data);
});

export const topTools = wrapController(async (req, res) => {
    const days = req.validated?.days ?? safeInt(req.query.days, 7);
    const limit = Math.min(req.validated?.limit ?? safeInt(req.query.limit, 10), 200);
    const data = await analyticsService.getTopTools(days, limit);
    success(res, data);
});

export const trend = wrapController(async (req, res) => {
    const days = req.validated?.days ?? safeInt(req.query.days, 30);
    const data = await analyticsService.getDailyTrend(days);
    success(res, data);
});

export const conversionFunnel = wrapController(async (req, res) => {
    const days = req.validated?.days ?? safeInt(req.query.days, 30);
    const data = await analyticsService.getConversionFunnel(days);
    success(res, data);
});
