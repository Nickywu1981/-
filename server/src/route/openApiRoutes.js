/**
 * Open API 路由 — 第三方开发者接入端点
 */
import { Router } from 'express';
import { openApiAuth, openApiRateLimit } from '../middleware/openApi.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validate } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { z } from 'zod';
import * as imageService from '../services/imageService.js';
import * as videoService from '../services/videoService.js';

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

router.get('/v1/ping', (req, res) => {
  success(res, { version: '1.0.0', tenantId: req.tenantId });
});

router.post('/v1/image/remove-bg', validate(imageUrlSchema), asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  const result = await imageService.removeBackground(req.tenantId, imageUrl);
  success(res, result);
}));

router.post('/v1/image/scene', validate(sceneSchema), asyncHandler(async (req, res) => {
  const { imageUrl, sceneType } = req.body;
  const result = await imageService.generateScene(req.tenantId, imageUrl, sceneType);
  success(res, result);
}));

router.post('/v1/image/retouch', validate(imageUrlSchema), asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  const result = await imageService.retouchImage(req.tenantId, imageUrl);
  success(res, result);
}));

router.post('/v1/video/generate', validate(videoGenSchema), asyncHandler(async (req, res) => {
  const { imageUrls, effect, duration } = req.body;
  const result = await videoService.generateVideo(req.tenantId, imageUrls, { effect, duration });
  success(res, result);
}));

router.get('/v1/usage', asyncHandler(async (req, res) => {
  success(res, {
    tenantId: req.tenantId,
    dailyUsed: req.apiKeyRecord && req.apiKeyRecord.daily_used || 0,
    dailyLimit: req.apiKeyRecord && req.apiKeyRecord.daily_limit || 1000,
    rateLimit: req.apiKeyRecord && req.apiKeyRecord.rate_limit || 60,
  });
}));

export default router;
