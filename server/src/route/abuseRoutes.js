import { Router } from 'express';
import { listAllRecords, checkAbuse } from '../controller/abuseController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware, adminAuth, heavyLimiter);

const userIdParamSchema = z.object({ userId: z.string().regex(/^\d+$/).transform(Number) });

const recordsQuerySchema = paginationSchema.extend({
  userId: z.coerce.number().int().positive().optional(),
});

router.get('/records', validate(recordsQuerySchema, 'query'), listAllRecords);
router.get('/check/:userId', validate(userIdParamSchema, 'params'), checkAbuse);

export default router;
