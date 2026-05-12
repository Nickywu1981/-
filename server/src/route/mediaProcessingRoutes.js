/**
 * Background Removal & Multi-Size Export Routes
 *
 * Created: 2026-05-12
 * Mounted at /api/background-removal and /api/multi-size
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { generateWhiteBg, replaceBackground, batchWhiteBg, BG_TEMPLATES } from '../services/backgroundRemovalService.js';
import { exportMultiSize, batchExportMultiSize, PLATFORM_SIZES } from '../services/multiSizeExportService.js';

const bgRouter = Router();
const msRouter = Router();

// ── Background Removal ──
const bgRemoveSchema = z.object({
  imageUrl: z.string().url(),
  mode: z.enum(['white_bg', 'replace']).default('white_bg'),
  templateId: z.string().optional(),
  productName: z.string().optional(),
});

const bgBatchSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(20),
  productName: z.string().optional(),
});

bgRouter.post('/remove', authMiddleware, heavyLimiter, validate(bgRemoveSchema), wrapController(async (req) => {
  const { imageUrl, mode, templateId, productName } = req.body;
  let result;
  if (mode === 'replace' && templateId) {
    result = await replaceBackground({ imageUrl, templateId, productName });
  } else {
    result = await generateWhiteBg({ imageUrl, productName });
  }
  return success(result);
}));

bgRouter.post('/batch', authMiddleware, heavyLimiter, validate(bgBatchSchema), wrapController(async (req) => {
  const results = await batchWhiteBg(req.body.imageUrls, req.body.productName);
  return success(results);
}));

bgRouter.get('/templates', wrapController(async () => {
  return success(BG_TEMPLATES);
}));

// ── Multi-Size Export ──
const msExportSchema = z.object({
  imageUrl: z.string().url(),
  preset: z.string().optional(),
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().int().min(1).max(100).default(90),
});

const msBatchSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(20),
  sizeKeys: z.array(z.string()).min(1).optional(),
});

msRouter.post('/export', authMiddleware, heavyLimiter, validate(msExportSchema), wrapController(async (req) => {
  const result = await exportMultiSize({
    imageUrl: req.body.imageUrl,
    preset: req.body.preset,
    format: req.body.format,
    quality: req.body.quality,
  });
  return success(result);
}));

msRouter.post('/batch', authMiddleware, heavyLimiter, validate(msBatchSchema), wrapController(async (req) => {
  const results = await batchExportMultiSize(req.body.imageUrls, req.body.sizeKeys);
  return success(results);
}));

msRouter.get('/presets', wrapController(async () => {
  return success(PLATFORM_SIZES);
}));

export { bgRouter, msRouter };
