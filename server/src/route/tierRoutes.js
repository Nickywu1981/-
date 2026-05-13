import { Router } from 'express';
import { getMyTier, checkLimit, getExportPermission } from '../controller/tierController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const limitQuerySchema = z.object({
  type: z.enum(['image', 'video', 'text']).optional().default('image'),
});

router.use(rateLimiter);

router.get('/my', getMyTier);
router.get('/check-limit', validate(limitQuerySchema, 'query'), checkLimit);
router.get('/export-permission', getExportPermission);

export default router;
