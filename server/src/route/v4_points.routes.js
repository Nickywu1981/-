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
import { validateV4 as _validate, validate, paginationSchema } from '../utils/validate.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { paymentLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4PointsController.js';

const router = Router();

const redeemSchema = z.object({
  points: z.number().int().positive('积分数必须为正整数').max(100000),
});

const earnSchema = z.object({
  user_id: z.number().int().positive('请提供有效的用户ID'),
  amount: z.number().int().positive('积分数量必须为正整数').max(100000),
  remark: z.string().max(200).optional(),
});

// GET /api/points/account
router.get('/account', authMiddleware, ctrl.getAccount);

// GET /api/points/transactions
router.get('/transactions', authMiddleware, validate(paginationSchema, 'query'), ctrl.getTransactions);

// POST /api/points/redeem — 积分兑换点数
router.post('/redeem', paymentLimiter, authMiddleware, _validate(redeemSchema), ctrl.redeemPoints);

// POST /api/points/earn — 管理后台手动发放积分
router.post('/earn', adminLimiter, authMiddleware, adminAuth, _validate(earnSchema), ctrl.earnPoints);

export default router;
