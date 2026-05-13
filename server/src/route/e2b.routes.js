/**
 * Movio AI v4.2 — E2B Sandbox Routes
 * POST /api/e2b/sandbox | /sandbox/:id/execute | DELETE /sandbox/:id
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/e2bController.js';
import { e2bLimiter, e2bExecuteLimiter, e2bListLimiter, e2bDestroyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const codeSchema = z.object({
  code: z.string().min(1, '请提供代码').max(50000, '代码过长（上限50000字符）'),
  language: z.enum(['python', 'javascript', 'typescript', 'bash', 'r', 'ruby']).optional().default('python'),
});

const sandboxIdSchema = z.object({
  sandboxId: z.string().min(1).max(64),
});

router.post('/sandbox', e2bLimiter, ctrl.createSandbox);
router.post('/sandbox/:sandboxId/execute', e2bExecuteLimiter, validate(codeSchema), validate(sandboxIdSchema, 'params'), ctrl.executeCode);
router.get('/sandbox/:sandboxId', e2bListLimiter, validate(sandboxIdSchema, 'params'), ctrl.getSandbox);
router.get('/sandboxes', e2bListLimiter, ctrl.listSandboxes);
router.delete('/sandbox/:sandboxId', e2bDestroyLimiter, validate(sandboxIdSchema, 'params'), ctrl.destroySandbox);

export default router;
