import { Router } from 'express';
import { z } from 'zod';
import { listAllConfig, updateConfig, removeConfig, getPublicSiteConfig, createConfig } from '../controller/siteConfigController.js';
import { getConfigLogs } from '../services/siteConfigService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';

const configSchema = z.object({
  key: z.string().min(1, '配置键不能为空').max(80).regex(/^[a-z][a-z0-9_.]*$/, '配置键仅允许小写字母数字下划线和点，以字母开头'),
  value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.unknown())]),
  type: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});
const updateConfigSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.unknown())]),
  type: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

const adminRouter = Router();
adminRouter.get('/', authMiddleware, rateLimiter, adminAuth, listAllConfig);
adminRouter.post('/', authMiddleware, rateLimiter, adminAuth, validate(configSchema), createConfig);
adminRouter.put('/:key', authMiddleware, rateLimiter, adminAuth, validate(updateConfigSchema), updateConfig);
adminRouter.delete('/:id', authMiddleware, rateLimiter, adminAuth, removeConfig);

// GET /api/admin/site-config/logs/:key — 审计日志
adminRouter.get('/logs/:key', authMiddleware, rateLimiter, adminAuth, asyncHandler(async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const logs = await getConfigLogs(req.params.key, limit);
    success(res, logs);
  } catch (err) { error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || 'Failed to load logs'); }
}));

const publicRouter = Router();
publicRouter.get('/', rateLimiter, getPublicSiteConfig);

export { adminRouter, publicRouter };
