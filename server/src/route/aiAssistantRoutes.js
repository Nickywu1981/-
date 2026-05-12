/**
 * AI 助手类 — Routes
 * POST /api/ai-assistant/faq       — FAQ 智能客服
 * POST /api/ai-assistant/review    — 内容审核
 * POST /api/ai-assistant/data      — 数据分析助手
 *
 * authMiddleware + apiLimiter 在 app.js 挂载层统一应用
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/aiAssistantController.js';

const router = Router();

const questionSchema = z.object({
  question: z.string().min(1).max(500),
});

const reviewSchema = z.object({
  text: z.string().min(1).max(5000),
});

router.post('/faq', validate(questionSchema), ctrl.askFAQ);
router.post('/review', validate(reviewSchema), ctrl.review);
router.post('/data', validate(questionSchema), ctrl.dataQuery);

export default router;
