/**
 * Movio AI v4.1 — Points Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as pointsService from '../services/points.service.js';

export const getAccount = wrapController(async (req, res) => {
  const result = await pointsService.getPointsAccount(req.user.id);
  return success(res, result);
});

export const getTransactions = wrapController(async (req, res) => {
  const result = await pointsService.getPointsTransactions(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: Math.min(parseInt(req.query.pageSize, 10) || 20, 200),
  });
  return success(res, result);
});

export const redeemPoints = wrapController(async (req, res) => {
  const { points } = req.validated;
  const result = await pointsService.redeemPointsForCredits(req.user.id, points);
  return success(res, result, `成功兑换 ${result.redeemed_credits} 点数`);
});

export const earnPoints = wrapController(async (req, res) => {
  const { user_id, amount, remark } = req.validated;
  const result = await pointsService.earnPoints(user_id, {
    amount,
    businessType: 'admin_adjust',
    remark: remark || '管理员手动发放',
  });
  return success(res, result, '积分发放成功');
});
