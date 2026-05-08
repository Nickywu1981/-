import { Router } from 'express';
import {
  submitVirtualTryon, submitColorSwap, submitStyleTransfer,
  submitWrinkleRemove, submitImageTranslate, submitOutpainting, submitGhostMannequin,
  submitModelGenerate, submitShotPanorama, submitSwapFace, submitTextEffect,
  getTaskResult, listMyTasks,
} from '../controller/advancedImageController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const imageUrlSchema = z.string().url('请提供有效的图片URL');
const singleImageSchema = z.object({ imageUrl: imageUrlSchema });
const twoImageSchema = z.object({
  imageUrl: imageUrlSchema,
  targetImage: z.string().url().optional(),
});
const ghostMannequinSchema = z.object({
  imageUrl: imageUrlSchema,
  category: z.enum(['top', 'bottom', 'dress', 'outerwear']).optional(),
});
const modelGenerateSchema = z.object({
  imageUrl: imageUrlSchema,
  gender: z.enum(['male', 'female']).optional(),
  skinTone: z.string().optional(),
  pose: z.string().optional(),
});
const textEffectSchema = z.object({
  imageUrl: imageUrlSchema,
  text: z.string().min(1, '文字不能为空').max(500),
  style: z.string().optional(),
});

router.post('/virtual-tryon', authMiddleware, heavyLimiter, validate(twoImageSchema), asyncHandler(submitVirtualTryon));
router.post('/color-swap', authMiddleware, heavyLimiter, validate(singleImageSchema), asyncHandler(submitColorSwap));
router.post('/style-transfer', authMiddleware, heavyLimiter, validate(singleImageSchema), asyncHandler(submitStyleTransfer));
router.post('/wrinkle-remove', authMiddleware, heavyLimiter, validate(singleImageSchema), asyncHandler(submitWrinkleRemove));
router.post('/image-translate', authMiddleware, heavyLimiter, validate(singleImageSchema), asyncHandler(submitImageTranslate));
router.post('/outpaint', authMiddleware, heavyLimiter, validate(singleImageSchema), asyncHandler(submitOutpainting));
router.post('/ghost-mannequin', authMiddleware, heavyLimiter, validate(ghostMannequinSchema), asyncHandler(submitGhostMannequin));
router.post('/model-generate', authMiddleware, heavyLimiter, validate(modelGenerateSchema), asyncHandler(submitModelGenerate));
router.post('/shot-panorama', authMiddleware, heavyLimiter, validate(singleImageSchema), asyncHandler(submitShotPanorama));
router.post('/swap-face', authMiddleware, heavyLimiter, validate(twoImageSchema), asyncHandler(submitSwapFace));
router.post('/text-effect', authMiddleware, heavyLimiter, validate(textEffectSchema), asyncHandler(submitTextEffect));

router.get('/tasks', authMiddleware, asyncHandler(listMyTasks));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(getTaskResult));

export default router;
