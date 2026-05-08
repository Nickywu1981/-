import { Router } from 'express';
import { getFaqs, getFaqById, createFaq, updateFaq, deleteFaq } from '../controller/helpController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const faqSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空'),
  category: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const faqQuerySchema = z.object({ keyword: z.string().max(200).optional() });

router.get('/', validate(faqQuerySchema, 'query'), asyncHandler(getFaqs));
router.get('/:id', asyncHandler(getFaqById));
router.post('/', authMiddleware, adminAuth, validate(faqSchema), asyncHandler(createFaq));
router.put('/:id', authMiddleware, adminAuth, validate(faqSchema.partial()), asyncHandler(updateFaq));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(deleteFaq));

export default router;
