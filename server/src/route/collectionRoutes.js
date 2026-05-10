import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { listCollections, getCollection, createCollection, updateCollection, deleteCollection } from '../controller/collectionController.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const collectionSchema = z.object({
  type: z.enum(['image', 'video', 'template', 'prompt']),
  name: z.string().min(1).max(200),
  data: z.record(z.any()),
});

const updateCollectionSchema = collectionSchema.partial();
const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

const router = Router();
router.use(authMiddleware);
router.get('/', cacheMiddleware(120), asyncHandler(listCollections));
router.get('/:id', cacheMiddleware(120), validate(idParamSchema, 'params'), asyncHandler(getCollection));
router.post('/', adminAuth, validate(collectionSchema), asyncHandler(createCollection));
router.put('/:id', adminAuth, validate(idParamSchema, 'params'), validate(updateCollectionSchema), asyncHandler(updateCollection));
router.delete('/:id', adminAuth, validate(idParamSchema, 'params'), asyncHandler(deleteCollection));

export default router;
