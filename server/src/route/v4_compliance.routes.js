/**
 * Movio AI v4.1 — Compliance Routes (跨境合规检查)
 * GET  /api/compliance/targets — 列出所有支持的平台/区域
 * POST /api/compliance/check   — 执行合规检查
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4ComplianceController.js';

const router = Router();
router.use(authMiddleware);
router.use(rateLimiter);

// ─── GET /api/compliance/targets ──────────────────────────────
router.get('/targets', ctrl.getTargets);

// ─── POST /api/compliance/check ───────────────────────────────
const checkSchema = z.object({
  platform: z.string().min(1, '请选择目标平台'),
  region: z.string().optional().nullable(),
  category: z.string().optional(),
});

router.post('/check', _validate(checkSchema), ctrl.checkCompliance);

// ─── GET /api/compliance/rules/:code ─────────────────────────────
router.get('/rules/:code', _validate(z.object({ code: z.string().min(1) }), 'params'), ctrl.getRules);

export default router;
