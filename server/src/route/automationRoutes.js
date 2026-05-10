import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
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
const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });
const taskIdParamSchema = z.object({ taskId: z.string().regex(/^\d+$/).transform(Number) });

router.get('/', authMiddleware, asyncHandler(automationController.listTasks));
router.get('/tasks', authMiddleware, asyncHandler(automationController.listTasks));
router.get('/accounts', authMiddleware, asyncHandler(automationController.listAccounts));
router.post('/accounts', authMiddleware, validate(accountSchema), asyncHandler(automationController.createAccount));
router.delete('/accounts/:id', authMiddleware, validate(idParamSchema, 'params'), asyncHandler(automationController.deleteAccount));
router.post('/tasks', authMiddleware, validate(taskSchema), asyncHandler(automationController.createTask));
router.post('/tasks/:id/cancel', authMiddleware, validate(idParamSchema, 'params'), asyncHandler(automationController.cancelTask));
router.post('/admin/execute/:taskId', authMiddleware, adminAuth, validate(taskIdParamSchema, 'params'), asyncHandler(automationController.executeTask));

export default router;
