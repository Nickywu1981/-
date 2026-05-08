import { Router } from 'express';
import {
  getAllPlatforms, getPlatformList, getSizesByPlatform,
  createUserTemplate, listUserTemplates, updateUserTemplate, deleteUserTemplate,
} from '../controller/sizeTemplateController.js';
import { authMiddleware } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const templateSchema = z.object({
  platform: z.string().min(1, '平台不能为空'),
  name: z.string().min(1, '模板名称不能为空').max(100),
  width: z.coerce.number().int().positive('宽度必须为正整数'),
  height: z.coerce.number().int().positive('高度必须为正整数'),
  category: z.string().optional(),
});
const updateTemplateSchema = templateSchema.partial();

// 公共 — 平台尺寸查询（缓存 30 分钟）
router.get('/platforms', cacheMiddleware(1800), asyncHandler(getAllPlatforms));
router.get('/platforms/list', cacheMiddleware(1800), asyncHandler(getPlatformList));
router.get('/platforms/:platform', cacheMiddleware(1800), asyncHandler(getSizesByPlatform));

// 用户自定义模板（需要登录）
router.post('/my', authMiddleware, validate(templateSchema), asyncHandler(createUserTemplate));
router.get('/my', authMiddleware, asyncHandler(listUserTemplates));
router.put('/my/:id', authMiddleware, validate(updateTemplateSchema), asyncHandler(updateUserTemplate));
router.delete('/my/:id', authMiddleware, asyncHandler(deleteUserTemplate));

export default router;
