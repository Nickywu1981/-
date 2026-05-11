import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema, numericParamSchema } from '../utils/validate.js';
import { z } from 'zod';
import * as automationController from '../controller/automationController.js';

const router = Router();

const accountSchema = z.object({
  platform: z.enum(['taobao', 'jd', 'pdd', 'douyin', 'kuaishou', 'xiaohongshu', 'shopee', 'lazada', 'amazon', 'ebay']),
  name: z.string().min(1).max(100),
  credentials: z.record(z.string()).optional(),
});

const taskSchema = z.object({
  type: z.enum(['sync-product', 'sync-order', 'auto-reply', 'bulk-update']),
  accountId: z.number().int().positive(),
  schedule: z.string().max(100).optional(),
  config: z.record(z.unknown()).optional(),
});
const taskIdParamSchema = numericParamSchema('taskId');

router.get('/', authMiddleware, automationController.listTasks);
router.get('/tasks', authMiddleware, automationController.listTasks);
router.get('/accounts', authMiddleware, automationController.listAccounts);
router.post('/accounts', heavyLimiter, authMiddleware, validate(accountSchema), automationController.createAccount);
router.delete('/accounts/:id', heavyLimiter, authMiddleware, validate(idParamSchema, 'params'), automationController.deleteAccount);
router.post('/tasks', heavyLimiter, authMiddleware, validate(taskSchema), automationController.createTask);
router.post('/tasks/:id/cancel', heavyLimiter, authMiddleware, validate(idParamSchema, 'params'), automationController.cancelTask);
router.post('/admin/execute/:taskId', authMiddleware, adminAuth, validate(taskIdParamSchema, 'params'), automationController.executeTask);

export default router;
