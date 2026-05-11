import { Router } from 'express';
import { getBrand, saveBrand } from '../controller/brandController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const brandSchema = z.object({
  name: z.string().min(1, '品牌名称不能为空').max(100),
  logo: z.string().optional(),
  description: z.string().optional(),
});
const brandUpdateSchema = brandSchema.partial();

router.get('/', authMiddleware, rateLimiter, getBrand);
router.put('/', authMiddleware, rateLimiter, adminAuth, validate(brandUpdateSchema), saveBrand);

export default router;
