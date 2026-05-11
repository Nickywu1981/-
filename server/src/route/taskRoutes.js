import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';
import { listMyWorks } from '../controller/taskController.js';

const router = Router();

const myWorksQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  type: z.string().optional(),
});

router.get('/my-works', authMiddleware, rateLimiter, validate(myWorksQuerySchema, 'query'), listMyWorks);

export default router;
