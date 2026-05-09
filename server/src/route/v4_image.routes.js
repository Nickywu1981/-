/**
 * Movio AI v4.1 — Image Routes
 * G5 后端开发 | W2
 * POST /api/images/generate | /replicate | /batch-generate | /batch-edit | /batch-replace
 * GET  /api/images/works
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { tierGuard } from '../middleware/tierGuard.js';
import * as imageService from '../services/image.service.js';
import * as promptEnhanceService from '../services/prompt-enhance.service.js';

const router = Router();

const generateSchema = z.object({
  prompt: z.string().min(1, '请提供提示词').max(4000),
  ratio: z.string().optional(),
  style: z.string().max(50).optional(),
});

const replicateSchema = z.object({
  reference_image_url: z.string().url('参考图URL格式不正确'),
  product_name: z.string().min(1, '请提供商品名称').max(200),
  style: z.string().max(50).optional(),
  ratio: z.string().optional(),
});

const batchGenerateSchema = z.object({
  prompts: z.array(z.string().min(1).max(4000)).min(1, '至少一条提示词').max(20, '最多20条提示词'),
  ratio: z.string().optional(),
  style: z.string().max(50).optional(),
});

const batchEditSchema = z.object({
  images: z.array(z.string().url('图片URL格式不正确')).min(1).max(50),
  operations: z.object({}).passthrough().optional(),
});

const batchReplaceSchema = z.object({
  images: z.array(z.string().url()).min(1).max(50),
  new_background: z.string().max(500).optional(),
  new_scene: z.string().max(500).optional(),
});

const enhancePromptSchema = z.object({
  prompt: z.string().min(1, '请提供提示词').max(4000),
  type: z.enum(['image', 'video', 'detail', 'poster', 'social']).default('image'),
});

// POST /api/images/generate
router.post('/generate', _validate(generateSchema), contentModerationMiddleware('input'), async (req, res) => {
  try {
    const { prompt, ratio, style } = req.validated;
    const result = await imageService.generateImage(req.user.id, { prompt, ratio, style });
    return success(res, result, '任务已提交');
  } catch (err) {
    return error(res, err.status || 500, err.message || '生成失败', err.status || 500);
  }
});

// POST /api/images/replicate — 主图复刻
router.post('/replicate', _validate(replicateSchema), async (req, res) => {
  try {
    const { reference_image_url, product_name, style, ratio } = req.validated;
    const result = await imageService.replicateMainImage(req.user.id, { referenceImageUrl: reference_image_url, productName: product_name, style, ratio });
    return success(res, result, '任务已提交');
  } catch (err) {
    return error(res, err.status || 500, err.message || '复刻失败', err.status || 500);
  }
});

// POST /api/images/batch-generate
router.post('/batch-generate', _validate(batchGenerateSchema), tierGuard('image'), async (req, res) => {
  try {
    const { prompts, ratio, style } = req.validated;
    const result = await imageService.batchGenerateImage(req.user.id, { prompts, ratio, style });
    return success(res, result, `已提交${prompts.length}个生图任务`);
  } catch (err) {
    return error(res, err.status || 500, err.message || '批量生成失败', err.status || 500);
  }
});

// POST /api/images/batch-edit
router.post('/batch-edit', _validate(batchEditSchema), tierGuard('image'), async (req, res) => {
  try {
    const { images, operations } = req.validated;
    const result = await imageService.batchEditImage(req.user.id, { images, operations });
    return success(res, result, '批量编辑任务已提交');
  } catch (err) {
    return error(res, err.status || 500, err.message || '批量编辑失败', err.status || 500);
  }
});

// POST /api/images/batch-replace
router.post('/batch-replace', _validate(batchReplaceSchema), tierGuard('image'), async (req, res) => {
  try {
    const { images, new_background, new_scene } = req.validated;
    const result = await imageService.batchReplaceImage(req.user.id, { images, newBackground: new_background, newScene: new_scene });
    return success(res, result, '批量替换任务已提交');
  } catch (err) {
    return error(res, err.status || 500, err.message || '批量替换失败', err.status || 500);
  }
});

// GET /api/images/works
router.get('/works', async (req, res) => {
  try {
    const result = await imageService.getImageWorks(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
      status: req.query.status,
    });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || 500, err.message || '查询失败');
  }
});

// POST /api/ai/enhance-prompt — 统一提示词增强
router.post('/enhance-prompt', _validate(enhancePromptSchema), async (req, res) => {
  try {
    const { prompt, type } = req.validated;
    const result = await promptEnhanceService.enhancePrompt(prompt, type || 'image');
    return success(res, result);
  } catch (err) {
    return error(res, err.status || 500, err.message || '增强失败');
  }
});

export default router;
