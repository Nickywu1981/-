import { Router } from 'express';
import { listPlatforms, getSpec, getSpecsByPlatform, createSpec, updateSpec, deleteSpec, adaptImage } from '../controller/platformSpecController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

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
  inputPath: z.string().min(1).max(500),
  platformCode: z.string().min(1).max(50),
  outputDir: z.string().optional(),
});

router.get('/', rateLimiter, listPlatforms);
router.get('/:id', rateLimiter, validate(idParamSchema, 'params'), getSpec);
router.get('/platform/:code', rateLimiter, validate(codeParamSchema, 'params'), getSpecsByPlatform);

router.use(authMiddleware);
router.post('/', rateLimiter, requireRole('admin'), validate(createSchema), createSpec);
router.post('/adapt', rateLimiter, requireRole('admin'), validate(adaptSchema), adaptImage);
router.put('/:id', rateLimiter, requireRole('admin'), validate(idParamSchema, 'params'), validate(updateSchema), updateSpec);
router.delete('/:id', rateLimiter, requireRole('admin'), validate(idParamSchema, 'params'), deleteSpec);

export default router;
