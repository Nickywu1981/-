/**
 * Movio AI v4.1 — Video Translate Routes
 * G5 后端开发 | Phase 2
 * POST /api/video-translate/voice | /subtitles | /face
 * GET  /api/video-translate/langs | /api/video-translate/works
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import * as translateService from '../services/video-translate.service.js';

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

const baseTranslateSchema = z.object({
  videoUrl: z.string().url('请提供有效视频链接'),
  sourceLang: z.string().default('zh'),
  targetLang: z.string().min(1, '请选择目标语言'),
});

// ─── POST /api/video-translate/voice ──────────────────────────
router.post('/voice',
  _validate(baseTranslateSchema.extend({
    voiceType: z.string().default('natural'),
  })),
  contentModerationMiddleware,
  async (req, res) => {
    try {
      const job = await translateService.translateVoice(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '语音翻译任务已提交');
    } catch (e) {
      if (e.status) return error(res, e.status, e.message);
      return error(res, ERROR_CODE.INTERNAL_ERROR, '语音翻译失败');
    }
  },
);

// ─── POST /api/video-translate/subtitles ──────────────────────
router.post('/subtitles',
  _validate(baseTranslateSchema.extend({
    subtitleStyle: z.string().default('default'),
  })),
  async (req, res) => {
    try {
      const job = await translateService.translateSubtitles(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '字幕翻译任务已提交');
    } catch (e) {
      if (e.status) return error(res, e.status, e.message);
      return error(res, ERROR_CODE.INTERNAL_ERROR, '字幕翻译失败');
    }
  },
);

// ─── POST /api/video-translate/face ───────────────────────────
router.post('/face',
  _validate(baseTranslateSchema.extend({
    avatarStyle: z.string().default('original'),
  })),
  contentModerationMiddleware,
  async (req, res) => {
    try {
      const job = await translateService.translateFace(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '面容翻译任务已提交');
    } catch (e) {
      if (e.status) return error(res, e.status, e.message);
      return error(res, ERROR_CODE.INTERNAL_ERROR, '面容翻译失败');
    }
  },
);

// ─── GET /api/video-translate/langs ────────────────────────────
router.get('/langs', (_req, res) => {
  return success(res, { langs: translateService.SUPPORTED_LANGS });
});

// ─── GET /api/video-translate/works ────────────────────────────
router.get('/works', async (req, res) => {
  try {
    const { type, page, limit } = req.query;
    const rows = await translateService.getUserTranslateHistory(req.userId, { type, page: +page || 1, limit: +limit || 20 });
    return success(res, rows);
  } catch (e) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, '获取翻译历史失败');
  }
});

export default router;
