import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import auditLogDao from '../dao/auditLogDao.js';
import { listResult, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

const router = Router();

const querySchema = z.object({
  userId: z.coerce.number().int().optional(),
  action: z.string().max(64).optional(),
  targetType: z.string().max(64).optional(),
  targetId: z.coerce.number().int().optional(),
});

router.get('/', authMiddleware, adminAuth, validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const result = await auditLogDao.list({ ...req.query, page, pageSize });
    listResult(res, result);
  } catch (e) { error(res, ERROR_CODE.INTERNAL_ERROR, e.message); }
}));

export default router;
