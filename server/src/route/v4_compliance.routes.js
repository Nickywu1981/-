/**
 * Movio AI v4.1 — Compliance Routes (跨境合规检查)
 * GET  /api/compliance/targets — 列出所有支持的平台/区域
 * POST /api/compliance/check   — 执行合规检查
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate } from '../utils/validate.js';
import * as complianceService from '../services/complianceService.js';

const router = Router();

// ─── GET /api/compliance/targets ──────────────────────────────
router.get('/targets', (_req, res) => {
  try {
    const targets = complianceService.listComplianceTargets();
    return success(res, targets);
  } catch (e) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, e.message);
  }
});

// ─── POST /api/compliance/check ───────────────────────────────
const checkSchema = z.object({
  platform: z.string().min(1, '请选择目标平台'),
  region: z.string().optional().nullable(),
  category: z.string().optional(),
});

router.post('/check', _validate(checkSchema), (req, res) => {
  try {
    const result = complianceService.checkCompliance(req.validated);
    return success(res, result);
  } catch (e) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, e.message);
  }
});

export default router;
