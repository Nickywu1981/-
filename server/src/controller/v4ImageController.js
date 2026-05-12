/**
 * Movio AI v4.1 — Image Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as imageService from '../services/image.service.js';
import * as promptEnhanceService from '../services/prompt-enhance.service.js';

export const generateImage = wrapController(async (req, res) => {
  const { prompt, ratio, style } = req.validated;
  const result = await imageService.generateImage(req.user.id, { prompt, ratio, style });
  return success(res, result, '任务已提交');
});

export const replicateMainImage = wrapController(async (req, res) => {
  const { reference_image_url, product_name, style, ratio } = req.validated;
  const result = await imageService.replicateMainImage(req.user.id, { referenceImageUrl: reference_image_url, productName: product_name, style, ratio });
  return success(res, result, '任务已提交');
});

export const batchGenerateImage = wrapController(async (req, res) => {
  const { prompts, ratio, style } = req.validated;
  const result = await imageService.batchGenerateImage(req.user.id, { prompts, ratio, style });
  return success(res, result, `已提交${prompts.length}个生图任务`);
});

export const batchEditImage = wrapController(async (req, res) => {
  const { images, operations } = req.validated;
  const result = await imageService.batchEditImage(req.user.id, { images, operations });
  return success(res, result, '批量编辑任务已提交');
});

export const batchReplaceImage = wrapController(async (req, res) => {
  const { images, new_background, new_scene } = req.validated;
  const result = await imageService.batchReplaceImage(req.user.id, { images, newBackground: new_background, newScene: new_scene });
  return success(res, result, '批量替换任务已提交');
});

export const getImageWorks = wrapController(async (req, res) => {
  const result = await imageService.getImageWorks(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20,
    status: req.query.status,
  });
  return success(res, result);
});

export const enhancePrompt = wrapController(async (req, res) => {
  const { prompt, type } = req.validated;
  const result = await promptEnhanceService.enhancePrompt(prompt, type || 'image');
  return success(res, result);
});
