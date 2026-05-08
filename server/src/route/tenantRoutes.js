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

router.get('/', authMiddleware, adminAuth, asyncHandler(listTenants));
router.get('/me', authMiddleware, asyncHandler(getMyTenant));
router.get('/:id', authMiddleware, adminAuth, asyncHandler(getTenant));
router.post('/', authMiddleware, adminAuth, validate(tenantSchema), asyncHandler(createTenant));
router.put('/:id', authMiddleware, adminAuth, validate(tenantSchema), asyncHandler(updateTenant));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(deleteTenant));

export default router;
