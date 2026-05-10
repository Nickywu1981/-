import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { listTenants, getTenant, createTenant, updateTenant, deleteTenant, getMyTenant } from '../controller/tenantController.js';

const router = Router();

const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(200).optional(),
  settings: z.record(z.unknown()).optional(),
});
const tenantUpdateSchema = tenantSchema.partial();
const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

router.get('/', authMiddleware, adminAuth, asyncHandler(listTenants));
router.get('/me', authMiddleware, asyncHandler(getMyTenant));
router.get('/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(getTenant));
router.post('/', authMiddleware, adminAuth, validate(tenantSchema), asyncHandler(createTenant));
router.put('/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(tenantUpdateSchema), asyncHandler(updateTenant));
router.delete('/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(deleteTenant));

export default router;
