import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as proxyController from '../controller/proxyController.js';

const router = Router();

const configSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, '编码仅允许小写字母、数字、下划线、连字符'),
  targetUrl: z.string().url('目标URL格式不正确'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.coerce.number().int().min(1000).max(60000).optional(),
});

router.get('/', authMiddleware, adminAuth, asyncHandler(proxyController.listConfigs));
router.post('/', authMiddleware, adminAuth, validate(configSchema), asyncHandler(proxyController.createConfig));
router.put('/:id', authMiddleware, adminAuth, validate(configSchema.partial()), asyncHandler(proxyController.updateConfig));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(proxyController.deleteConfig));
router.get('/call/:code', authMiddleware, asyncHandler(proxyController.callProxy));

export default router;
