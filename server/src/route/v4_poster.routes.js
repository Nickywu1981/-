/**
 * Movio AI v4.1 — Poster Routes
 * G5 后端开发 | Phase 2
 * POST /api/posters/generate | /enhance-prompt
 * GET  /api/posters/sizes | /api/posters/works
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import * as posterService from '../services/poster.service.js';
import * as promptEnhanceService from '../services/prompt-enhance.service.js';

const router = Router();

// ─── POST /api/posters/generate ───────────────────────────────
const generateSchema = z.object({
  posterType: z.enum(['product', 'holiday', 'event', 'private', 'xhs', 'wechat']),
  prompt: z.string().min(1, '请提供海报描述').max(4000),
  enhancedPrompt: z.string().max(4000).optional(),
  style: z.string().max(2000).optional(),
});

router.post('/generate',
  _validate(generateSchema),
  contentModerationMiddleware('input'),
  async (req, res) => {
    try {
      const job = await posterService.generatePoster(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '海报任务已提交');
    } catch (e) {
      if (e.status) return error(res, e.status, e.message);
      return error(res, ERROR_CODE.INTERNAL_ERROR, '海报生成失败');
    }
  },
);

// ─── POST /api/posters/enhance-prompt ─────────────────────────
const enhanceSchema = z.object({
  prompt: z.string().min(1).max(4000),
  posterType: z.enum(['product', 'holiday', 'event', 'private', 'xhs', 'wechat']),
});

router.post('/enhance-prompt', _validate(enhanceSchema), async (req, res) => {
  try {
    // poster类型的poster→poster策略，xhs/wechat→social策略
    const promptType = ['xhs', 'wechat'].includes(req.validated.posterType) ? 'social' : 'poster';
    const result = await promptEnhanceService.enhancePrompt(req.validated.prompt, promptType);
    return success(res, result);
  } catch (__) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, '提示词增强失败');
  }
});

// ─── GET /api/posters/sizes ────────────────────────────────────
router.get('/sizes', (_req, res) => {
  return success(res, {
    sizes: posterService.getPosterSizes(),
    styles: posterService.getPosterStyles(),
  });
});

// ─── GET /api/posters/works ────────────────────────────────────
router.get('/works', async (req, res) => {
  try {
    const { type, page, limit } = req.query;
    const rows = await posterService.getUserPosters(req.userId, { type, page: +page || 1, limit: +limit || 20 });
    return success(res, rows);
  } catch (__) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, '获取作品列表失败');
  }
});

export default router;
