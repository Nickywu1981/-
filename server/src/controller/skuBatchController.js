/**
 * SKU Batch Controller — 多SKU批量生成控制器
 * 职责：参数委托，不写业务逻辑
 */
import { success, error } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as skuBatchService from '../services/skuBatchImageService.js';
import logger from '../utils/logger.js';

export async function batchGenerateImages(req, res) {
  try {
    const task = await skuBatchService.submitImageBatch(req.body, req.user?.id || req.user?.userId);
    success(res, { taskId: task.id, estimatedCount: task.totalCount, status: task.status });
  } catch (err) {
    logger.error('[SKUBatch] image batch failed', err.message);
    if (err instanceof BusinessError) {
      error(res, err.status, err.message);
    } else {
      error(res, ERROR_CODE.AI_INFER_FAILED);
    }
  }
}

export async function batchGenerateVideos(req, res) {
  try {
    const task = await skuBatchService.submitVideoBatch(req.body, req.user?.id || req.user?.userId);
    success(res, { taskId: task.id, estimatedCount: task.totalCount, status: task.status });
  } catch (err) {
    logger.error('[SKUBatch] video batch failed', err.message);
    if (err instanceof BusinessError) {
      error(res, err.status, err.message);
    } else {
      error(res, ERROR_CODE.AI_INFER_FAILED);
    }
  }
}

export async function getBatchStatus(req, res) {
  try {
    const status = await skuBatchService.getTaskStatus(req.params.id);
    success(res, status);
  } catch (err) {
    logger.error('[SKUBatch] get status failed', err.message);
    if (err instanceof BusinessError) {
      error(res, err.status, err.message);
    } else {
      error(res, ERROR_CODE.NOT_FOUND);
    }
  }
}
