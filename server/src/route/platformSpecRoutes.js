import { Router } from 'express';
import { listPlatforms, getSpec, getSpecsByPlatform, createSpec, updateSpec, deleteSpec, adaptImage } from '../controller/platformSpecController.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });
const codeParamSchema = z.object({ code: z.string().min(1).max(30) });

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

router.get('/', rateLimiter, asyncHandler(listPlatforms));
router.get('/:id', rateLimiter, validate(idParamSchema, 'params'), asyncHandler(getSpec));
router.get('/platform/:code', rateLimiter, validate(codeParamSchema, 'params'), asyncHandler(getSpecsByPlatform));

router.use(authMiddleware);
router.post('/', rateLimiter, requireRole('admin'), validate(createSchema), asyncHandler(createSpec));
router.post('/adapt', rateLimiter, requireRole('admin'), validate(adaptSchema), asyncHandler(adaptImage));
router.put('/:id', rateLimiter, requireRole('admin'), validate(idParamSchema, 'params'), validate(updateSchema), asyncHandler(updateSpec));
router.delete('/:id', rateLimiter, requireRole('admin'), validate(idParamSchema, 'params'), asyncHandler(deleteSpec));

export default router;
