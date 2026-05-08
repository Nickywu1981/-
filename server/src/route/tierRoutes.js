import { Router } from 'express';
import { getMyTier, checkLimit, getExportPermission } from '../controller/tierController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const limitQuerySchema = z.object({
  type: z.enum(['image', 'video', 'text']).optional().default('image'),
});

router.use(authMiddleware);

router.get('/my', asyncHandler(getMyTier));
router.get('/check-limit', validate(limitQuerySchema, 'query'), asyncHandler(checkLimit));
router.get('/export-permission', asyncHandler(getExportPermission));

export default router;
