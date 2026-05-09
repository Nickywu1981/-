import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import templateMarketController from '../controller/templateMarketController.js';

const router = Router();

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
router.get('/:id', templateMarketController.detail);

// POST /api/template-market/:id/download
router.post('/:id/download', templateMarketController.download);

// POST /api/template-market/:id/purchase
router.post('/:id/purchase', templateMarketController.purchase);

// POST /api/template-market/create
router.post('/create', _validate(createSchema), templateMarketController.create);

export default router;
