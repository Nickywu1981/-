/**
 * Movio AI v4.1 — Detail Image Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as detailService from '../services/detail-image.service.js';

export const generateDetailSet = wrapController(async (req, res) => {
  const { product_name, product_images, highlights, template } = req.validated;
  const result = await detailService.generateDetailSet(req.user.id, {
    productName: product_name,
    productImages: product_images,
    highlights,
    template,
  });
  return success(res, result, '详情图套图生成任务已提交');
});

export const replicateDetail = wrapController(async (req, res) => {
  const { reference_url, product_name, product_images, template } = req.validated;
  const result = await detailService.replicateDetail(req.user.id, {
    referenceUrl: reference_url,
    productName: product_name,
    productImages: product_images,
    template,
  });
  return success(res, result, '详情图复刻任务已提交');
});

export const getDetailWorks = wrapController(async (req, res) => {
  const result = await detailService.getDetailWorks(req.user.id, {
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20,
  });
  return success(res, result);
});

export const generateLongImage = wrapController(async (req, res) => {
  const { product_name, scenes, platform, style, width } = req.validated;
  const result = await detailService.generateLongImage(req.user.id, {
    productName: product_name,
    scenes,
    platform,
    style,
    width,
  });
  return success(res, result, '详情长图合成任务已提交');
});
