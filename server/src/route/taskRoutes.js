import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';
import { listMyWorks } from '../controller/taskController.js';

const router = Router();

const myWorksQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  type: z.string().optional(),
});

router.get('/my-works', authMiddleware, validate(myWorksQuerySchema, 'query'), asyncHandler(listMyWorks));

export default router;
