import { Router } from 'express';
import {
  submitVirtualTryon, submitColorSwap, submitStyleTransfer,
  submitWrinkleRemove, submitImageTranslate, submitOutpainting, submitGhostMannequin,
  submitModelGenerate, submitShotPanorama, submitSwapFace, submitTextEffect,
  getTaskResult, listMyTasks,
} from '../controller/advancedImageController.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const productImageUrlSchema = z.string().url('请提供有效的产品图片URL');

const virtualTryonSchema = z.object({
  productImageUrl: productImageUrlSchema,
  skinTone: z.string().optional(),
  bodyType: z.string().optional(),
  style: z.string().optional(),
});
const colorSwapSchema = z.object({
  productImageUrl: productImageUrlSchema,
  targetColors: z.array(z.string()).optional(),
  preserveTexture: z.coerce.boolean().optional(),
});
const styleTransferSchema = z.object({
  productImageUrl: productImageUrlSchema,
  targetStyle: z.string().min(1, '请选择目标风格').max(50),
  strength: z.coerce.number().min(0).max(1).optional(),
});
const wrinkleRemoveSchema = z.object({
  productImageUrl: productImageUrlSchema,
  fabricType: z.string().optional(),
});
const imageTranslateSchema = z.object({
  productImageUrl: productImageUrlSchema,
  sourceLang: z.string().optional(),
  targetLang: z.string().min(1, '请选择目标语言').max(10),
});
const outpaintingSchema = z.object({
  productImageUrl: productImageUrlSchema,
  direction: z.string().optional(),
  ratio: z.string().optional(),
});
const ghostMannequinSchema = z.object({
  productImageUrl: productImageUrlSchema,
  effect: z.string().optional(),
  category: z.enum(['top', 'bottom', 'dress', 'outerwear']).optional(),
});
const modelGenerateSchema = z.object({
  imageUrl: z.string().url('请提供有效的商品图片URL'),
  modelType: z.string().optional(),
});
const shotPanoramaSchema = z.object({
  imageUrl: z.string().url('请提供有效的商品图片URL'),
  mode: z.string().optional(),
});
const swapFaceSchema = z.object({
  baseUrl: z.string().url('请提供底图URL'),
  faceUrl: z.string().url('请提供面部图片URL'),
});
const textEffectSchema = z.object({
  text: z.string().min(1, '文字不能为空').max(500),
  effect: z.string().optional(),
});

router.post('/virtual-tryon', authMiddleware, heavyLimiter, tierGuard('image'), validate(virtualTryonSchema), submitVirtualTryon);
router.post('/color-swap', authMiddleware, heavyLimiter, tierGuard('image'), validate(colorSwapSchema), submitColorSwap);
router.post('/style-transfer', authMiddleware, heavyLimiter, tierGuard('image'), validate(styleTransferSchema), submitStyleTransfer);
router.post('/wrinkle-remove', authMiddleware, heavyLimiter, tierGuard('image'), validate(wrinkleRemoveSchema), submitWrinkleRemove);
router.post('/image-translate', authMiddleware, heavyLimiter, tierGuard('image'), validate(imageTranslateSchema), submitImageTranslate);
router.post('/outpaint', authMiddleware, heavyLimiter, tierGuard('image'), validate(outpaintingSchema), submitOutpainting);
router.post('/ghost-mannequin', authMiddleware, heavyLimiter, tierGuard('image'), validate(ghostMannequinSchema), submitGhostMannequin);
router.post('/model-generate', authMiddleware, heavyLimiter, tierGuard('image'), validate(modelGenerateSchema), submitModelGenerate);
router.post('/shot-panorama', authMiddleware, heavyLimiter, tierGuard('image'), validate(shotPanoramaSchema), submitShotPanorama);
router.post('/swap-face', authMiddleware, heavyLimiter, tierGuard('image'), validate(swapFaceSchema), submitSwapFace);
router.post('/text-effect', authMiddleware, heavyLimiter, tierGuard('image'), validate(textEffectSchema), submitTextEffect);

router.get('/tasks', authMiddleware, listMyTasks);
router.get('/tasks/:taskId', authMiddleware, validate(z.object({ taskId: z.string().regex(/^\d+$/).transform(Number) }), 'params'), getTaskResult);

export default router;
