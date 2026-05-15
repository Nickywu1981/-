/**
 * SKU Batch Controller — 多SKU批量生成控制器
 * 职责：参数委托，不写业务逻辑
 */
import { success, error } from '../utils/response.js';
import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as skuBatchService from '../services/skuBatchImageService.js';
import logger from '../utils/logger.js';

export const batchGenerateImages = wrapController(async (req) => {
  const task = await skuBatchService.submitImageBatch(req.body, req.user?.id || req.user?.userId);
  return { taskId: task.id, estimatedCount: task.totalCount, status: task.status };
});

export const batchGenerateVideos = wrapController(async (req) => {
  const task = await skuBatchService.submitVideoBatch(req.body, req.user?.id || req.user?.userId);
  return { taskId: task.id, estimatedCount: task.totalCount, status: task.status };
});

export const getBatchStatus = wrapController(async (req) => {
  return await skuBatchService.getTaskStatus(req.params.id);
});
