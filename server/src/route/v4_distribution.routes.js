/**
 * Movio AI v4.1 — Distribution Routes (分销系统)
 * G5 后端开发 | W4
 * GET  /api/distribution/invite-code  — 我的邀请码
 * GET  /api/distribution/team          — 我的团队
 * GET  /api/distribution/balance       — 佣金余额
 * POST /api/distribution/withdraw      — 提现
 * GET  /api/distribution/history       — 佣金流水
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate, validate, paginationSchema } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import * as distributionService from '../services/distribution.service.js';

const router = Router();
router.use(authMiddleware);

const withdrawSchema = z.object({
  amount: z.number().positive('提现金额必须大于0').max(100000),
});

// GET /api/distribution/invite-code
router.get('/invite-code', async (req, res) => {
  try {
    const result = await distributionService.getMyInviteCode(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// GET /api/distribution/team
router.get('/team', validate(paginationSchema, 'query'), async (req, res) => {
  try {
    const result = await distributionService.getMyTeam(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// GET /api/distribution/balance
router.get('/balance', async (req, res) => {
  try {
    const result = await distributionService.getCommissionBalance(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// POST /api/distribution/withdraw
router.post('/withdraw', paymentLimiter, _validate(withdrawSchema), async (req, res) => {
  try {
    const { amount } = req.validated;
    const result = await distributionService.withdrawCommission(req.user.id, amount);
    return success(res, result, `成功提现 ${result.withdrawn} 元`);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// GET /api/distribution/history
router.get('/history', validate(paginationSchema, 'query'), async (req, res) => {
  try {
    const result = await distributionService.getCommissionHistory(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// ── Phase 2: 分销等级 ──
router.get('/tier', async (req, res) => {
  try {
    const result = await distributionService.getUserTier(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// GET /api/distribution/tiers — 所有等级定义
router.get('/tiers', (_req, res) => {
  return success(res, { tiers: distributionService.getDistributionTiers() });
});

// GET /api/distribution/performance — 团队业绩明细
router.get('/performance', validate(paginationSchema, 'query'), async (req, res) => {
  try {
    const result = await distributionService.getTeamPerformance(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// GET /api/distribution/promo — 推广素材+邀请链接
router.get('/promo', async (req, res) => {
  try {
    const result = await distributionService.getMyPromoLink(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

// GET /api/distribution/campaigns — 裂变活动列表+进度
router.get('/campaigns', async (req, res) => {
  try {
    const result = await distributionService.getMyCampaignProgress(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '服务器内部错误');
  }
});

export default router;
