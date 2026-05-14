/**
 * Chat Routes — 全局 AI 对话模块路由
 * POST /api/chat/message  (SSE 流式)
 * GET  /api/chat/suggestions  (快捷指令建议)
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/chatController.js';

const router = Router();

const messageSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().max(64).optional(),
  mode: z.enum(['chat', 'image', 'video', 'ecommerce']).optional().default('chat'),
  attachments: z.array(z.object({
    type: z.enum(['image', 'video', 'link']),
    url: z.string().max(2048),
  })).max(5).optional(),
  context: z.record(z.unknown()).optional(),
});

router.post('/message', authMiddleware, heavyLimiter, validate(messageSchema), ctrl.sendMessage);
router.get('/suggestions', authMiddleware, ctrl.getSuggestions);

export default router;
