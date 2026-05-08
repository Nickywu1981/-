import { Router } from 'express';
import { listPlatforms, getSpec, getSpecsByPlatform, createSpec, updateSpec, deleteSpec } from '../controller/platformSpecController.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  platformCode: z.string().min(2).max(20),
  specType: z.enum(['mainImage', 'detailImage', 'video', 'carousel', 'skuImage', 'logo', 'banner']),
  label: z.string().min(1).max(50),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.enum(['jpg', 'png', 'webp', 'mp4', 'mov']).default('jpg'),
  maxSizeKB: z.number().int().positive().optional(),
  bgMustWhite: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial();

router.get('/', asyncHandler(listPlatforms));
router.get('/:id', asyncHandler(getSpec));
router.get('/platform/:code', asyncHandler(getSpecsByPlatform));

router.use(authMiddleware);
router.post('/', requireRole('admin'), validate(createSchema), asyncHandler(createSpec));
router.put('/:id', requireRole('admin'), validate(updateSchema), asyncHandler(updateSpec));
router.delete('/:id', requireRole('admin'), asyncHandler(deleteSpec));

export default router;
