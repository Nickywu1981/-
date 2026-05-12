import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controller/siteConfigController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
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
adminRouter.get('/', authMiddleware, rateLimiter, adminAuth, ctrl.listAllConfig);
adminRouter.post('/', authMiddleware, rateLimiter, adminAuth, validate(configSchema), ctrl.createConfig);
adminRouter.put('/:key', authMiddleware, rateLimiter, adminAuth, validate(updateConfigSchema), ctrl.updateConfig);
adminRouter.delete('/:id', authMiddleware, rateLimiter, adminAuth, ctrl.removeConfig);

// GET /api/admin/site-config/logs/:key — 审计日志
adminRouter.get('/logs/:key', authMiddleware, rateLimiter, adminAuth, ctrl.getConfigLogs);

const publicRouter = Router();
publicRouter.get('/', rateLimiter, ctrl.getPublicSiteConfig);

export { adminRouter, publicRouter };
