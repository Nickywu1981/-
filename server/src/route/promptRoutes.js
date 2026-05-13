import { Router } from 'express';
import { listTemplates, getTemplateDetail, createTemplate, submitForReview, fillAndPreview, listFavorites, toggleFavorite, listGroups, createGroup, renameGroup, deleteGroup, getRecommendations, recordUsage, usageHistory, rateTemplate, getTemplateRating } from '../controller/promptController.js';

import { validate, idParamSchema } from '../utils/validate.js';
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

const toggleFavoriteSchema = z.object({
  templateId: z.coerce.number().int().positive('模板ID无效'),
  groupId: z.coerce.number().int().positive().optional(),
});
const recordUsageSchema = z.object({
  filledContent: z.string().max(10000).optional(),
  modelType: z.string().max(50).optional(),
});
const rateSchema = z.object({
  score: z.coerce.number().int().min(1, '最低1分').max(5, '最高5分'),
});
// (idParamSchema imported from validate.js)


// 模板（支持 /api/prompts 和 /api/prompts/templates）
router.get('/', listTemplates);
router.get('/templates', listTemplates);
const submitReviewSchema = z.object({
  id: z.coerce.number().int().positive('模板ID无效'),
});
router.get('/templates/:id', validate(idParamSchema, 'params'), getTemplateDetail);
router.post('/templates', validate(createTemplateSchema), createTemplate);
router.post('/templates/:id/submit-review', validate(submitReviewSchema, 'params'), submitForReview);
router.post('/templates/:id/fill', validate(idParamSchema, 'params'), validate(fillSchema), fillAndPreview);

// 收藏
router.get('/favorites', listFavorites);
router.post('/favorites/toggle', validate(toggleFavoriteSchema), toggleFavorite);

// 分组
router.get('/groups', listGroups);
router.post('/groups', validate(groupSchema), createGroup);
router.put('/groups/:id', validate(idParamSchema, 'params'), validate(groupSchema), renameGroup);
router.delete('/groups/:id', validate(idParamSchema, 'params'), deleteGroup);

// 智能推荐
router.get('/recommendations', getRecommendations);

// 使用历史
router.get('/usage-history', usageHistory);
router.post('/:id/use', validate(idParamSchema, 'params'), validate(recordUsageSchema), recordUsage);

// 评分
router.post('/:id/rate', validate(idParamSchema, 'params'), validate(rateSchema), rateTemplate);
router.get('/:id/rating', validate(idParamSchema, 'params'), getTemplateRating);

export default router;
