/**
 * Movio AI v4.1 — Distribution Routes (分销系统)
 * G5 后端开发 | W4
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, paginationSchema } from '../utils/validate.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4DistributionController.js';

const router = Router();

const withdrawSchema = z.object({
  amount: z.number().positive('提现金额必须大于0').max(100000),
});

// 推广转化统计
router.get('/stats', ctrl.getStats);

// 邀请码
router.get('/invite-code', ctrl.getMyInviteCode);

// 我的团队
router.get('/team', validate(paginationSchema, 'query'), ctrl.getMyTeam);

// 佣金余额
router.get('/balance', ctrl.getCommissionBalance);

// 提现
router.post('/withdraw', paymentLimiter, _validate(withdrawSchema), ctrl.withdrawCommission);

// 佣金流水
router.get('/history', validate(paginationSchema, 'query'), ctrl.getCommissionHistory);

// 分销等级
router.get('/tier', ctrl.getUserTier);

// 所有等级定义
router.get('/tiers', ctrl.getDistributionTiers);

// 团队业绩明细
router.get('/performance', validate(paginationSchema, 'query'), ctrl.getTeamPerformance);

// 推广素材+邀请链接
router.get('/promo', ctrl.getMyPromoLink);

// 裂变活动列表+进度
router.get('/campaigns', ctrl.getMyCampaignProgress);

export default router;
