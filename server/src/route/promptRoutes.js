import { Router } from 'express';
import { listTemplates, getTemplateDetail, createTemplate, submitForReview, fillAndPreview, listFavorites, toggleFavorite, listGroups, createGroup, renameGroup, deleteGroup, getRecommendations, recordUsage, usageHistory, rateTemplate, getTemplateRating } from '../controller/promptController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().max(50).optional(),
  tags: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

const fillSchema = z.object({
  values: z.record(z.string()).optional(),
});

const groupSchema = z.object({
  name: z.string().min(1).max(100),
});

router.use(authMiddleware);

// 模板（支持 /api/prompts 和 /api/prompts/templates）
router.get('/', asyncHandler(listTemplates));
router.get('/templates', asyncHandler(listTemplates));
router.get('/templates/:id', asyncHandler(getTemplateDetail));
router.post('/templates', validate(createTemplateSchema), asyncHandler(createTemplate));
router.post('/templates/:id/submit-review', asyncHandler(submitForReview));
router.post('/templates/:id/fill', validate(fillSchema), asyncHandler(fillAndPreview));

// 收藏
router.get('/favorites', asyncHandler(listFavorites));
router.post('/favorites/toggle', asyncHandler(toggleFavorite));

// 分组
router.get('/groups', asyncHandler(listGroups));
router.post('/groups', validate(groupSchema), asyncHandler(createGroup));
router.put('/groups/:id', validate(groupSchema), asyncHandler(renameGroup));
router.delete('/groups/:id', asyncHandler(deleteGroup));

// 智能推荐
router.get('/recommendations', asyncHandler(getRecommendations));

// 使用历史
router.get('/usage-history', asyncHandler(usageHistory));
router.post('/:id/use', asyncHandler(recordUsage));

// 评分
router.post('/:id/rate', asyncHandler(rateTemplate));
router.get('/:id/rating', asyncHandler(getTemplateRating));

export default router;
