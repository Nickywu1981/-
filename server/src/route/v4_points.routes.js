/**
 * Movio AI v4.1 — Points Routes (积分系统)
 * G5 后端开发 | W4
 * GET  /api/points/account      — 积分账户
 * GET  /api/points/transactions  — 积分流水
 * POST /api/points/redeem        — 积分兑换点数
 * POST /api/points/earn          — 手动赚取(管理后台)
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { adminAuth } from '../middleware/auth.js';
import * as pointsService from '../services/points.service.js';

const router = Router();

function _validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, r.error.errors.map(e => e.message).join('; '));
    }
    req.validated = r.data;
    next();
  };
}

const redeemSchema = z.object({
  points: z.number().int().positive('积分数必须为正整数').max(100000),
});

const earnSchema = z.object({
  user_id: z.number().int().positive('请提供有效的用户ID'),
  amount: z.number().int().positive('积分数量必须为正整数').max(100000),
  remark: z.string().max(200).optional(),
});

// GET /api/points/account
router.get('/account', async (req, res) => {
  try {
    const result = await pointsService.getPointsAccount(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.status || 500);
  }
});

// GET /api/points/transactions
router.get('/transactions', async (req, res) => {
  try {
    const result = await pointsService.getPointsTransactions(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.status || 500);
  }
});

// POST /api/points/redeem — 积分兑换点数
router.post('/redeem', _validate(redeemSchema), async (req, res) => {
  try {
    const { points } = req.validated;
    const result = await pointsService.redeemPointsForCredits(req.user.id, points);
    return success(res, result, `成功兑换 ${result.redeemed_credits} 点数`);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.status || 500);
  }
});

// POST /api/points/earn — 管理后台手动发放积分
router.post('/earn', adminAuth, _validate(earnSchema), async (req, res) => {
  try {
    const { user_id, amount, remark } = req.validated;
    const result = await pointsService.earnPoints(user_id, {
      amount,
      businessType: 'admin_adjust',
      remark: remark || '管理员手动发放',
    });
    return success(res, result, '积分发放成功');
  } catch (err) {
    return error(res, err.status || 500, err.message, err.status || 500);
  }
});

export default router;
