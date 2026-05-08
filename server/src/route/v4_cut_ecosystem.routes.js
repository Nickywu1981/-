/**
 * Movio AI v4.1 — Cut Ecosystem Routes (剪映/CapCut 生态对接)
 * M05 #29-30: 剪映/CapCut 导出 / 画幅适配 / 作品查询
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as cutEcosystemService from '../services/cutEcosystemService.js';

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
router.post('/export/jianying', _validate(exportSchema), async (req, res) => {
  try {
    const result = await cutEcosystemService.exportJianyingDraft(req.user.id, req.validated);
    success(res, result);
  } catch (err) {
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '导出剪映失败', err.status || 500);
  }
});

router.post('/export/capcut', _validate(exportSchema), async (req, res) => {
  try {
    const result = await cutEcosystemService.exportCapCutDraft(req.user.id, req.validated);
    success(res, result);
  } catch (err) {
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '导出CapCut失败', err.status || 500);
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
router.get('/works', async (req, res) => {
  try {
    const query = listSchema.safeParse(req.query);
    if (!query.success) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, query.error.errors.map(e => e.message).join('; '));
    }
    const result = await cutEcosystemService.getUserExportableWorks(req.user.id, query.data);
    success(res, result);
  } catch (err) {
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '查询作品失败', err.status || 500);
  }
});

export default router;
