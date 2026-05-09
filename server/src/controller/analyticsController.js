/**
 * 行为埋点控制器
 */
import analyticsService from '../services/analyticsService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function track(req, res) {
  try {
    const { event, metadata } = req.body;
    const userId = req.user?.id || null;
    await analyticsService.trackEvent(userId, event, { ...metadata, ip: req.ip });
    success(res, null, 'ok');
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function funnel(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getFunnelMetrics(days);
    success(res, data);
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function active(req, res) {
  try {
    const data = await analyticsService.getActiveUsers();
    success(res, data);
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function topTools(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 10;
    const data = await analyticsService.getTopTools(days, limit);
    success(res, data);
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function trend(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getDailyTrend(days);
    success(res, data);
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function conversionFunnel(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getConversionFunnel(days);
    success(res, data);
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message); }
}
