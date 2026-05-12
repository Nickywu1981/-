/**
 * Movio AI v4.1 — Distribution Controller (分销系统)
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as distributionService from '../services/distribution.service.js';

export const getStats = wrapController(async (req, res) => {
  const result = await distributionService.getStats(req.user.id);
  return success(res, result);
});

export const getMyInviteCode = wrapController(async (req, res) => {
  const result = await distributionService.getMyInviteCode(req.user.id);
  return success(res, result);
});

export const getMyTeam = wrapController(async (req, res) => {
  const result = await distributionService.getMyTeam(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20,
  });
  return success(res, result);
});

export const getCommissionBalance = wrapController(async (req, res) => {
  const result = await distributionService.getCommissionBalance(req.user.id);
  return success(res, result);
});

export const withdrawCommission = wrapController(async (req, res) => {
  const { amount } = req.validated;
  const result = await distributionService.withdrawCommission(req.user.id, amount);
  return success(res, result, `成功提现 ${result.withdrawn} 元`);
});

export const getCommissionHistory = wrapController(async (req, res) => {
  const result = await distributionService.getCommissionHistory(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20,
  });
  return success(res, result);
});

export const getUserTier = wrapController(async (req, res) => {
  const result = await distributionService.getUserTier(req.user.id);
  return success(res, result);
});

export const getDistributionTiers = wrapController(async (_req, res) => {
  return success(res, { tiers: distributionService.getDistributionTiers() });
});

export const getTeamPerformance = wrapController(async (req, res) => {
  const result = await distributionService.getTeamPerformance(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20,
  });
  return success(res, result);
});

export const getMyPromoLink = wrapController(async (req, res) => {
  const result = await distributionService.getMyPromoLink(req.user.id);
  return success(res, result);
});

export const getMyCampaignProgress = wrapController(async (req, res) => {
  const result = await distributionService.getMyCampaignProgress(req.user.id);
  return success(res, result);
});
