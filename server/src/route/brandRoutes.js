import { Router } from 'express';
import { getBrand, saveBrand } from '../controller/brandController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const brandSchema = z.object({
  name: z.string().min(1, '品牌名称不能为空').max(100),
  logo: z.string().optional(),
  description: z.string().optional(),
});

router.get('/', authMiddleware, asyncHandler(getBrand));
router.put('/', authMiddleware, adminAuth, validate(brandSchema), asyncHandler(saveBrand));

export default router;
