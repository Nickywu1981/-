import * as distributionService from '../services/distribution.service.js';
import { success } from '../utils/response.js';
import { wrapController } from '../utils/wrapController.js';

export const getInviteCode = wrapController(async (req, res) => {
  const result = await distributionService.getMyInviteCode(req.user.id);
  return success(res, result);
});

export const getTeam = wrapController(async (req, res) => {
  const result = await distributionService.getMyTeam(req.user.id, {
    page: +req.query.page || 1,
    pageSize: +req.query.pageSize || 20,
  });
  return success(res, result);
});

export const getBalance = wrapController(async (req, res) => {
  const result = await distributionService.getCommissionBalance(req.user.id);
  return success(res, result);
});

export const withdraw = wrapController(async (req, res) => {
  const result = await distributionService.withdrawCommission(req.user.id, req.validated.amount);
  return success(res, result, `成功提现 ${result.withdrawn} 元`);
});

export const getHistory = wrapController(async (req, res) => {
  const result = await distributionService.getCommissionHistory(req.user.id, {
    page: +req.query.page || 1,
    pageSize: +req.query.pageSize || 20,
  });
  return success(res, result);
});

export const getTier = wrapController(async (req, res) => {
  const result = await distributionService.getUserTier(req.user.id);
  return success(res, result);
});

export const getTiers = wrapController(async (_req, res) => {
  return success(res, { tiers: distributionService.getDistributionTiers() });
});

export const getPerformance = wrapController(async (req, res) => {
  const result = await distributionService.getTeamPerformance(req.user.id, {
    page: +req.query.page || 1,
    pageSize: +req.query.pageSize || 20,
  });
  return success(res, result);
});

export const getPromo = wrapController(async (req, res) => {
  const result = await distributionService.getMyPromoLink(req.user.id);
  return success(res, result);
});

export const getCampaigns = wrapController(async (req, res) => {
  const result = await distributionService.getMyCampaignProgress(req.user.id);
  return success(res, result);
});
