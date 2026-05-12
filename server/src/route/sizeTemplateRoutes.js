import { Router } from 'express';
import {
  getAllPlatforms, getPlatformList, getSizesByPlatform,
  createUserTemplate, listUserTemplates, updateUserTemplate, deleteUserTemplate,
} from '../controller/sizeTemplateController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const platformParamSchema = z.object({ platform: z.string().min(1).max(30) });
const myListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).optional().default('20'),
});

const templateSchema = z.object({
  platform: z.string().min(1, '平台不能为空').max(30),
  name: z.string().min(1, '模板名称不能为空').max(100),
  width: z.coerce.number().int().positive('宽度必须为正整数'),
  height: z.coerce.number().int().positive('高度必须为正整数'),
  category: z.string().optional(),
});
const updateTemplateSchema = templateSchema.partial();

// 公共 — 平台尺寸查询（缓存 30 分钟）
router.get('/platforms', rateLimiter, cacheMiddleware(1800), getAllPlatforms);
router.get('/platforms/list', rateLimiter, cacheMiddleware(1800), getPlatformList);
router.get('/platforms/:platform', rateLimiter, cacheMiddleware(1800), validate(platformParamSchema, 'params'), getSizesByPlatform);

// 用户自定义模板（需要登录）
router.post('/my', authMiddleware, rateLimiter, validate(templateSchema), createUserTemplate);
router.get('/my', authMiddleware, rateLimiter, validate(myListQuerySchema, 'query'), listUserTemplates);
router.put('/my/:id', authMiddleware, rateLimiter, validate(idParamSchema, 'params'), validate(updateTemplateSchema), updateUserTemplate);
router.delete('/my/:id', authMiddleware, rateLimiter, validate(idParamSchema, 'params'), deleteUserTemplate);

export default router;
