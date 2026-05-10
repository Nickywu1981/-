import { wrapController } from '../utils/wrapController.js';
import * as batchService from '../services/batchService.js';
import { success, error, listResult } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

export const submitBatchTask = wrapController(async (req, res, next) => {
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
  })

export const redoBatchTask = wrapController(async (req, res, next) => {
    const { taskId } = req.body;
    if (!taskId) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请提供源任务ID');
    }
    const data = await batchService.redoBatchTask(req.user.id, taskId);
    return success(res, data, '已复刻批量任务');
  })

export const listBatchHistory = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 10, maxPageSize: 50 });
    const data = await batchService.listBatchHistory(req.user.id, { page, pageSize });
    return listResult(res, data);
  })

export const getBatchZipUrl = wrapController(async (req, res, next) => {
    const data = await batchService.getBatchZipUrl(req.params.taskId, req.user.id);
    return success(res, data);
  })

export const getTaskResult = wrapController(async (req, res, next) => {
    const data = await batchService.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  })

// ==================== 批量模板 ====================

export const saveBatchTemplate = wrapController(async (req, res, next) => {
    const { name, operation, platform, style, nightMode, imageCount } = req.body;
    const data = await batchService.saveBatchTemplate(req.user.id, { name, operation, platform, style, nightMode, imageCount });
    return success(res, { id: data }, '模板已保存');
  })

export const listBatchTemplates = wrapController(async (req, res, next) => {
    const data = await batchService.listBatchTemplates(req.user.id);
    return success(res, { list: data });
  })

export const deleteBatchTemplate = wrapController(async (req, res, next) => {
    await batchService.deleteBatchTemplate(req.user.id, parseInt(req.params.id, 10));
    return success(res, {}, '模板已删除');
  })
