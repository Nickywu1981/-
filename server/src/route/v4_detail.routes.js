/**
 * Movio AI v4.1 — Detail Image Routes
 * G5 后端开发 | W2
 * POST /api/detail/generate-set | /replicate
 * GET  /api/detail/works
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as detailService from '../services/detail-image.service.js';

const router = Router();

const generateSetSchema = z.object({
  product_name: z.string().min(1, '请提供商品名称').max(200),
  product_images: z.array(z.string().url('图片URL格式不正确')).min(1, '至少1张商品图').max(10, '最多10张'),
  highlights: z.array(z.string().max(100)).max(10).optional().default([]),
  template: z.string().max(50).optional().default('standard'),
});

const replicateSchema = z.object({
  reference_url: z.string().url('参考图URL格式不正确'),
  product_name: z.string().min(1, '请提供商品名称').max(200),
  product_images: z.array(z.string().url()).min(1).max(10).optional().default([]),
  template: z.string().max(50).optional().default('standard'),
});

// POST /api/detail/generate-set
router.post('/generate-set', heavyLimiter, _validate(generateSetSchema), contentModerationMiddleware('input'), async (req, res) => {
  try {
    const { product_name, product_images, highlights, template } = req.validated;
    const result = await detailService.generateDetailSet(req.user.id, {
      productName: product_name,
      productImages: product_images,
      highlights,
      template,
    });
    return success(res, result, '详情图套图生成任务已提交');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '生成失败');
  }
});

// POST /api/detail/replicate
router.post('/replicate', heavyLimiter, _validate(replicateSchema), async (req, res) => {
  try {
    const { reference_url, product_name, product_images, template } = req.validated;
    const result = await detailService.replicateDetail(req.user.id, {
      referenceUrl: reference_url,
      productName: product_name,
      productImages: product_images,
      template,
    });
    return success(res, result, '详情图复刻任务已提交');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '复刻失败');
  }
});

// GET /api/detail/works
router.get('/works', async (req, res) => {
  try {
    const result = await detailService.getDetailWorks(req.user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '查询失败');
  }
});

export default router;
