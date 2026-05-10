import * as distributionService from '../services/distribution.service.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export default {
  async getInviteCode(req, res) {
    try {
      const result = await distributionService.getMyInviteCode(req.user.id);
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getTeam(req, res) {
    try {
      const result = await distributionService.getMyTeam(req.user.id, {
        page: +req.query.page || 1,
        pageSize: +req.query.pageSize || 20,
      });
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getBalance(req, res) {
    try {
      const result = await distributionService.getCommissionBalance(req.user.id);
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async withdraw(req, res) {
    try {
      const result = await distributionService.withdrawCommission(req.user.id, req.validated.amount);
      return success(res, result, `成功提现 ${result.withdrawn} 元`);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getHistory(req, res) {
    try {
      const result = await distributionService.getCommissionHistory(req.user.id, {
        page: +req.query.page || 1,
        pageSize: +req.query.pageSize || 20,
      });
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getTier(req, res) {
    try {
      const result = await distributionService.getUserTier(req.user.id);
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  getTiers(_req, res) {
    return success(res, { tiers: distributionService.getDistributionTiers() });
  },

  async getPerformance(req, res) {
    try {
      const result = await distributionService.getTeamPerformance(req.user.id, {
        page: +req.query.page || 1,
        pageSize: +req.query.pageSize || 20,
      });
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getPromo(req, res) {
    try {
      const result = await distributionService.getMyPromoLink(req.user.id);
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getCampaigns(req, res) {
    try {
      const result = await distributionService.getMyCampaignProgress(req.user.id);
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },
};
