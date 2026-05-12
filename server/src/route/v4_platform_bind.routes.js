/**
 * Movio AI v4.1 — Platform Routes
 * G5 后端开发 | W4
 * GET    /api/platforms/bindings  — 用户已绑定平台列表
 * POST   /api/platforms/bind      — 绑定新平台
 * DELETE /api/platforms/bind/:id  — 解绑
 * GET    /api/platforms           — 全部平台列表（缓存）
 * GET    /api/platforms/region    — 按区域查询平台
 * GET    /api/platforms/:code     — 平台详情配置（缓存）
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, idParamSchema } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter, rateLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cache.js';
import * as bindCtrl from '../controller/v4PlatformBindController.js';
import { listAllPlatforms, getPlatformConfig, getPlatformsByRegion } from '../controller/platformDetailController.js';

const router = Router();

router.use(authMiddleware);

const bindSchema = z.object({
  platform: z.string().min(1, '请提供平台标识').max(50),
  bind_type: z.enum(['shop', 'creator']).default('shop'),
  account_id: z.string().min(1, '请提供账号ID').max(100),
  account_name: z.string().max(100).optional(),
});

const publishSchema = z.object({
  work_id: z.string().min(1, '请提供作品ID').max(50),
  platform: z.string().min(1, '请提供目标平台').max(50),
  content_url: z.string().url().optional(),
});

const regionQuerySchema = z.object({
  region: z.enum(['cn', 'intl']).optional().default('cn'),
});
const codeParamsSchema = z.object({
  code: z.string().min(1, '平台代码不能为空').max(50),
});

// === 平台绑定 ===
router.get('/bindings', bindCtrl.getBindings);
router.post('/bind', heavyLimiter, _validate(bindSchema), bindCtrl.bind);
router.delete('/bind/:id', heavyLimiter, validate(idParamSchema, 'params'), bindCtrl.unbind);
router.post('/publish', heavyLimiter, _validate(publishSchema), bindCtrl.publish);

// === 平台详情（缓存 30 分钟） ===
router.get('/', rateLimiter, cacheMiddleware(1800), listAllPlatforms);
router.get('/region', rateLimiter, cacheMiddleware(1800), validate(regionQuerySchema, 'query'), getPlatformsByRegion);
router.get('/:code', rateLimiter, cacheMiddleware(1800), validate(codeParamsSchema, 'params'), getPlatformConfig);

export default router;
