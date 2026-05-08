import * as batchService from '../services/batchService.js';
import { success, error, listResult } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

export async function submitBatchTask(req, res, next) {
  try {
    const { imageUrls, operation, platform, style, nightMode } = req.body;
    if (!imageUrls || !imageUrls.length) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传至少一张图片');
    }
    if (!operation) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请选择操作类型');
    }
    const data = await batchService.submitBatchTask(req.user.id, { imageUrls, operation, platform, style, nightMode });
    const msg = nightMode ? '夜间托管任务已提交，凌晨2点自动执行（6折优惠）' : '批量任务已提交';
    return success(res, data, msg);
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

export async function redoBatchTask(req, res, next) {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请提供源任务ID');
    }
    const data = await batchService.redoBatchTask(req.user.id, taskId);
    return success(res, data, '已复刻批量任务');
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

export async function listBatchHistory(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 10, maxPageSize: 50 });
    const data = await batchService.listBatchHistory(req.user.id, { page, pageSize });
    return listResult(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getBatchZipUrl(req, res, next) {
  try {
    const data = await batchService.getBatchZipUrl(req.params.taskId, req.user.id);
    return success(res, data);
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

export async function getTaskResult(req, res, next) {
  try {
    const data = await batchService.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

// ==================== 批量模板 ====================

export async function saveBatchTemplate(req, res, next) {
  try {
    const { name, operation, platform, style, nightMode, imageCount } = req.body;
    const data = await batchService.saveBatchTemplate(req.user.id, { name, operation, platform, style, nightMode, imageCount });
    return success(res, { id: data }, '模板已保存');
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

export async function listBatchTemplates(req, res, next) {
  try {
    const data = await batchService.listBatchTemplates(req.user.id);
    return success(res, { list: data });
  } catch (err) {
    next(err);
  }
}

export async function deleteBatchTemplate(req, res, next) {
  try {
    await batchService.deleteBatchTemplate(req.user.id, parseInt(req.params.id, 10));
    return success(res, {}, '模板已删除');
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}
