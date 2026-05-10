import { Router } from 'express';
import { listAllRecords, checkAbuse } from '../controller/abuseController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const userIdParamSchema = z.object({ userId: z.string().regex(/^\d+$/).transform(Number) });

const recordsQuerySchema = paginationSchema.extend({
  userId: z.coerce.number().int().positive().optional(),
});

// 管理端：滥用记录列表 + 检测单用户
router.get('/records', authMiddleware, adminAuth, validate(recordsQuerySchema, 'query'), asyncHandler(listAllRecords));
router.get('/check/:userId', authMiddleware, adminAuth, validate(userIdParamSchema, 'params'), asyncHandler(checkAbuse));

export default router;
