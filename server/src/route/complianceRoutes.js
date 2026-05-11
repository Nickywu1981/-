import { Router } from 'express';
import { listTargets, check, getRules } from '../controller/complianceController.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const checkSchema = z.object({
  platform: z.string().min(1, '平台不能为空'),
  region: z.string().optional(),
  category: z.string().optional(),
});

router.use(authMiddleware);

router.get('/targets', asyncHandler(listTargets));
router.get('/rules/:code', asyncHandler(getRules));
router.post('/check', heavyLimiter, validate(checkSchema), asyncHandler(check));

export default router;
