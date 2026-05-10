/**
 * 行为埋点控制器
 */
import { wrapController } from '../utils/wrapController.js';
import analyticsService from '../services/analyticsService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const track = wrapController(async (req, res) => {
    const { event, metadata } = req.body;
    const userId = req.user?.id || null;
    await analyticsService.trackEvent(userId, event, { ...metadata, ip: req.ip });
    success(res, null, 'ok');
}

export const funnel = wrapController(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getFunnelMetrics(days);
    success(res, data);
}

export const active = wrapController(async (req, res) => {
    const data = await analyticsService.getActiveUsers();
    success(res, data);
}

export const topTools = wrapController(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 10;
    const data = await analyticsService.getTopTools(days, limit);
    success(res, data);
}

export const trend = wrapController(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getDailyTrend(days);
    success(res, data);
}

export const conversionFunnel = wrapController(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getConversionFunnel(days);
    success(res, data);
}
