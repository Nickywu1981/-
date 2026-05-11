/**
 * Open API 路由 — 第三方开发者接入端点
 * 调用链: Routes → Controller → Service → DAO
 */
import { Router } from 'express';
import { openApiAuth, openApiRateLimit } from '../middleware/openApi.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as openApiController from '../controller/openApiController.js';

const router = Router();

const imageUrlSchema = z.object({ imageUrl: z.string().url('图片URL格式不正确') });
const sceneSchema = z.object({
  imageUrl: z.string().url('图片URL格式不正确'),
  sceneType: z.string().min(1, '场景类型不能为空'),
});
const videoGenSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1, '至少需要1张图片'),
  effect: z.string().optional(),
  duration: z.number().int().min(1).max(60).optional(),
});

router.use(openApiAuth);
router.use(openApiRateLimit);

router.get('/v1/ping', openApiController.ping);

router.post('/v1/image/remove-bg', heavyLimiter, validate(imageUrlSchema), openApiController.removeBackground);

router.post('/v1/image/scene', heavyLimiter, validate(sceneSchema), openApiController.generateScene);

router.post('/v1/image/retouch', heavyLimiter, validate(imageUrlSchema), openApiController.retouchImage);

router.post('/v1/video/generate', heavyLimiter, validate(videoGenSchema), openApiController.generateVideo);

router.get('/v1/usage', openApiController.getUsage);

export default router;
