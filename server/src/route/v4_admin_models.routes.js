/**
 * Movio AI v4.1 — Model Router Monitoring Routes
 * G5 后端开发 | W4
 * GET /api/admin/models/status — 所有模型状态 + 熔断器
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { requireRole } from '../middleware/rbac.js';
import * as modelRouterService from '../services/model-router.service.js';

const router = Router();

function _validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return error(res, 400, r.error.errors.map(e => e.message).join('; '));
    }
    req.validated = r.data;
    next();
  };
}

const resetBreakerSchema = z.object({
  model_id: z.string().min(1, '请提供模型ID').max(50),
});

// GET /api/admin/models/status
router.get('/status', requireRole('admin'), async (req, res) => {
  try {
    const status = await modelRouterService.getModelStatus();
    return success(res, status);
  } catch (err) {
    return error(res, 500, err.message);
  }
});

// POST /api/admin/models/reset-breaker — 重置指定模型的熔断器
router.post('/reset-breaker', requireRole('admin'), _validate(resetBreakerSchema), async (req, res) => {
  try {
    const { model_id } = req.validated;
    const result = modelRouterService.resetBreaker(model_id);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
});

export default router;
