import { Router } from 'express';
import { listAiLogs, getAiLogStats } from '../controller/aiLogController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const logsQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  status: z.string().optional(),
});

router.get('/', authMiddleware, rateLimiter, adminAuth, validate(logsQuerySchema, 'query'), asyncHandler(listAiLogs));
router.get('/stats', authMiddleware, rateLimiter, adminAuth, asyncHandler(getAiLogStats));

export default router;
