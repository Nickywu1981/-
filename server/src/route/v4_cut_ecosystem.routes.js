/**
 * Movio AI v4.1 — Cut Ecosystem Routes (剪映/CapCut 生态对接)
 * M05 #29-30: 剪映/CapCut 导出 / 画幅适配 / 作品查询
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import cutEcosystemService from '../services/cutEcosystemService.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const exportSchema = z.object({
  workIds: z.array(z.number().int().positive()).min(1, '请选择至少一个作品').max(50, '单次最多导出50个作品'),
  projectName: z.string().max(100).optional(),
  ratio: z.enum(['9:16', '16:9', '1:1', '4:5', '3:4']).optional(),
});

// 作品列表查询参数
const listSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  type: z.string().max(50).optional(),
});

// ============================================================
// 剪映/CapCut 导出
// ============================================================
router.post('/export/jianying', heavyLimiter, _validate(exportSchema), async (req, res) => {
  try {
    const result = await cutEcosystemService.exportJianyingDraft(req.user.id, req.validated);
    success(res, result);
  } catch (err) {
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '导出剪映失败');
  }
});

router.post('/export/capcut', heavyLimiter, _validate(exportSchema), async (req, res) => {
  try {
    const result = await cutEcosystemService.exportCapCutDraft(req.user.id, req.validated);
    success(res, result);
  } catch (err) {
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '导出CapCut失败');
  }
});

// ============================================================
// 画幅参数参考
// ============================================================
router.get('/ratios', (_req, res) => {
  success(res, cutEcosystemService.getPlatformRatios());
});

// ============================================================
// 可导出作品列表
// ============================================================
router.get('/works', _validate(listSchema, 'query'), async (req, res) => {
  try {
    const result = await cutEcosystemService.getUserExportableWorks(req.user.id, req.validated);
    success(res, result);
  } catch (err) {
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '查询作品失败');
  }
});

export default router;
