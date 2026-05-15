import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { listCollections, getCollection, createCollection, updateCollection, deleteCollection } from '../controller/collectionController.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const collectionSchema = z.object({
  type: z.enum(['image', 'video', 'template', 'prompt']),
  name: z.string().min(1).max(200),
  data: z.record(z.unknown()).refine(v => Object.keys(v).length <= 200, '数据字段过多'),
});

const updateCollectionSchema = collectionSchema.partial();

const router = Router();
router.use(rateLimiter);
router.get('/', authMiddleware, cacheMiddleware(120), listCollections);
router.get('/:id', authMiddleware, cacheMiddleware(120), validate(idParamSchema, 'params'), getCollection);
router.post('/', adminAuth, validate(collectionSchema), createCollection);
router.put('/:id', adminAuth, validate(idParamSchema, 'params'), validate(updateCollectionSchema), updateCollection);
router.delete('/:id', adminAuth, validate(idParamSchema, 'params'), deleteCollection);

export default router;
