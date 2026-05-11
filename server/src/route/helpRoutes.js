import { Router } from 'express';
import { getFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from '../controller/helpController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const faqSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空'),
  category: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const faqQuerySchema = z.object({ keyword: z.string().max(200).optional() });

router.get('/', validate(faqQuerySchema, 'query'), getFaqs);
router.get('/:id', validate(idParamSchema, 'params'), getFaqById);
router.post('/', adminLimiter, authMiddleware, adminAuth, validate(faqSchema), createFaq);
router.put('/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(faqSchema.partial()), updateFaq);
router.delete('/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), deleteFaq);

export default router;
