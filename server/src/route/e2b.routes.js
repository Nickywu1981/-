/**
 * Movio AI v4.1 — E2B Sandbox Routes
 * POST /api/e2b/sandbox | /sandbox/:id/execute | DELETE /sandbox/:id
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/e2bController.js';

const router = Router();

const codeSchema = z.object({
  code: z.string().min(1, '请提供代码').max(100000, '代码过长'),
  language: z.enum(['python', 'javascript', 'typescript', 'bash', 'r', 'ruby']).optional().default('python'),
});

router.post('/sandbox', ctrl.createSandbox);
router.post('/sandbox/:sandboxId/execute', validate(codeSchema), ctrl.executeCode);
router.get('/sandbox/:sandboxId', ctrl.getSandbox);
router.get('/sandboxes', ctrl.listSandboxes);
router.delete('/sandbox/:sandboxId', ctrl.destroySandbox);

export default router;
