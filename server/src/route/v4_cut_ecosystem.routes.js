/**
 * Movio AI v4.1 — Cut Ecosystem Routes (剪映/CapCut 生态对接)
 * M05 #29-30: 剪映/CapCut 导出 / 画幅适配 / 作品查询
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import * as ctrl from '../controller/v4CutEcosystemController.js';

const router = Router();
router.use(authMiddleware);

const exportSchema = z.object({
  workIds: z.array(z.number().int().positive()).min(1, '请选择至少一个作品').max(50, '单次最多导出50个作品'),
  projectName: z.string().max(100).optional(),
  ratio: z.enum(['9:16', '16:9', '1:1', '4:5', '3:4']).optional(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  type: z.string().max(50).optional(),
});

// ============================================================
// 剪映/CapCut 导出
// ============================================================
router.post('/export/jianying', heavyLimiter, _validate(exportSchema), ctrl.exportJianying);

router.post('/export/capcut', heavyLimiter, _validate(exportSchema), ctrl.exportCapcut);

// ============================================================
// 画幅参数参考
// ============================================================
router.get('/ratios', ctrl.getRatios);

// ============================================================
// 可导出作品列表
// ============================================================
router.get('/works', _validate(listSchema, 'query'), ctrl.getExportableWorks);

export default router;
