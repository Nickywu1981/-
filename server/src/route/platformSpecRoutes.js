import { Router } from 'express';
import { listPlatforms, getSpec, getSpecsByPlatform, createSpec, updateSpec, deleteSpec, adaptImage } from '../controller/platformSpecController.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  platform: z.string().min(2).max(30),
  category: z.string().min(1).max(50),
  label: z.string().min(1).max(80),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sortOrder: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

const adaptSchema = z.object({
  inputPath: z.string().min(1),
  platformCode: z.string().min(1),
  outputDir: z.string().optional(),
});

router.get('/', asyncHandler(listPlatforms));
router.get('/:id', asyncHandler(getSpec));
router.get('/platform/:code', asyncHandler(getSpecsByPlatform));

router.use(authMiddleware);
router.post('/', requireRole('admin'), validate(createSchema), asyncHandler(createSpec));
router.post('/adapt', requireRole('admin'), validate(adaptSchema), asyncHandler(adaptImage));
router.put('/:id', requireRole('admin'), validate(updateSchema), asyncHandler(updateSpec));
router.delete('/:id', requireRole('admin'), asyncHandler(deleteSpec));

export default router;
