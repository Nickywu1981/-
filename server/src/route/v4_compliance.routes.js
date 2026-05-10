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
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '合规检查失败');
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
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '合规检查失败');
  }
});

// ─── GET /api/compliance/rules/:code ─────────────────────────────
router.get('/rules/:code', _validate(z.object({ code: z.string().min(1) }), 'params'), (req, res) => {
  try {
    const rules = complianceService.getPlatformCompliance(req.params.code)
      || complianceService.getRegionCompliance(req.params.code);
    if (!rules) return error(res, ERROR_CODE.NOT_FOUND, '未找到合规规则');
    return success(res, rules);
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '合规检查失败');
  }
});

export default router;
