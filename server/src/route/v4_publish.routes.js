/**
 * Movio AI v4.1 — Publish Routes (多平台内容分发)
 * M06 独家王牌功能
 *
 * GET    /api/publish/platforms     — 获取可选分发平台列表
 * POST   /api/publish/submit        — 提交一键分发
 * GET    /api/publish/batch/:id     — 查看分发批次详情
 * POST   /api/publish/retry/:id     — 重发失败平台
 * GET    /api/publish/history       — 分发历史分页
 * GET    /api/publish/stats         — 分发概览统计
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate, validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as publishService from '../services/publishService.js';

const router = Router();
router.use(authMiddleware);

const submitSchema = z.object({
  workId: z.number().int().positive(),
  platforms: z.array(z.string().min(1)).min(1, '请至少选择一个目标平台'),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).max(20).optional(),
  scheduleAt: z.string().datetime().optional(),
});

const retryParamsSchema = z.object({
  id: z.coerce.number().int().positive('ID必须为正整数'),
});

// GET /api/publish/platforms
router.get('/platforms', (_req, res) => {
  try {
    return success(res, publishService.getPublishPlatforms());
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// POST /api/publish/submit
router.post('/submit', heavyLimiter, _validate(submitSchema), async (req, res) => {
  try {
    const { workId, platforms, title, description, tags, scheduleAt } = req.validated;
    const result = await publishService.submitPublish(
      req.user.id, workId, platforms,
      { title, description, tags, scheduleAt },
    );
    return success(res, result, '分发任务已提交');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// GET /api/publish/batch/:id
router.get('/batch/:id', validate(retryParamsSchema, 'params'), async (req, res) => {
  try {
    const result = await publishService.getPublishBatch(req.params.id, req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// POST /api/publish/retry/:id
router.post('/retry/:id', heavyLimiter, validate(retryParamsSchema, 'params'), async (req, res) => {
  try {
    const result = await publishService.retryPublish(req.params.id, req.user.id);
    return success(res, result, '已重新提交分发');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  status: z.string().optional(),
  platform: z.string().optional(),
});

// GET /api/publish/history
router.get('/history', _validate(historyQuerySchema, 'query'), async (req, res) => {
  try {
    const { page, pageSize, status, platform } = req.validated;
    const result = await publishService.listPublishHistory(req.user.id, { page, pageSize, status, platform });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// GET /api/publish/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await publishService.getPublishStats(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

export default router;
