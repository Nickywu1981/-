import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';
import { listTenants, getTenant, createTenant, updateTenant, deleteTenant, getMyTenant, reviewTenant } from '../controller/tenantController.js';

const router = Router();

const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(200).optional(),
  settings: z.record(z.unknown()).optional(),
});
const tenantUpdateSchema = tenantSchema.partial();

router.get('/', authMiddleware, adminAuth, listTenants);
router.get('/me', authMiddleware, getMyTenant);
router.get('/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), getTenant);
router.post('/', adminLimiter, authMiddleware, adminAuth, validate(tenantSchema), createTenant);
router.put('/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(tenantUpdateSchema), updateTenant);
router.delete('/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), deleteTenant);

const reviewSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected']),
  reviewRemark: z.string().max(500).optional(),
});
router.put('/:id/review', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(reviewSchema), reviewTenant);

export default router;
