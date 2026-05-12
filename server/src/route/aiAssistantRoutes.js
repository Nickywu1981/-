/**
 * AI 助手类 — Routes
 * POST /api/ai-assistant/faq       — FAQ 智能客服
 * POST /api/ai-assistant/review    — 内容审核
 * POST /api/ai-assistant/data      — 数据分析助手
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/aiAssistantController.js';

const router = Router();

const questionSchema = z.object({
  question: z.string().min(1).max(500),
});

const reviewSchema = z.object({
  text: z.string().min(1).max(5000),
});

router.post('/faq', authMiddleware, rateLimiter, validate(questionSchema), (req, res) => ctrl.askFAQ(req, res));
router.post('/review', authMiddleware, rateLimiter, validate(reviewSchema), (req, res) => ctrl.review(req, res));
router.post('/data', authMiddleware, rateLimiter, validate(questionSchema), (req, res) => ctrl.dataQuery(req, res));

export default router;
