import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as ctrl from '../controller/auditLogController.js';

const router = Router();

const querySchema = z.object({
  userId: z.coerce.number().int().optional(),
  action: z.string().max(64).optional(),
  targetType: z.string().max(64).optional(),
  targetId: z.coerce.number().int().optional(),
});

router.get('/', authMiddleware, rateLimiter, adminAuth, validate(querySchema, 'query'), (req, res) => ctrl.list(req, res));

export default router;
