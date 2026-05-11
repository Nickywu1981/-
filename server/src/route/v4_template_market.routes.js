import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import * as templateMarketController from '../controller/templateMarketController.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('模板ID无效'),
});

const createSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  category: z.enum(['ecommerce', 'social', 'brand', 'event']).default('ecommerce'),
  price: z.number().min(0).default(0),
  previewImages: z.array(z.string().url()).optional(),
});

// GET /api/template-market/search
router.get('/search', templateMarketController.search);

// GET /api/template-market/:id
router.get('/:id', _validate(idParamSchema, 'params'), templateMarketController.detail);

// POST /api/template-market/:id/download
router.post('/:id/download', authMiddleware, _validate(idParamSchema, 'params'), templateMarketController.download);

// POST /api/template-market/:id/purchase
router.post('/:id/purchase', authMiddleware, paymentLimiter, _validate(idParamSchema, 'params'), templateMarketController.purchase);

// POST /api/template-market/create
router.post('/create', authMiddleware, _validate(createSchema), templateMarketController.create);

export default router;
