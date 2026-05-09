import * as imageService from '../services/imageService.js';
import { success, error, listResult } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

/**
 * POST /api/images/main-image
 * 提交主图生成任务
 */
export async function submitMainImage(req, res, next) {
  try {
    const { imageUrl, platform, style } = req.body;
    if (!imageUrl || !platform) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传商品图并选择平台');
    }
    const data = await imageService.submitMainImage(req.user.id, { imageUrl, platform, style });
    return success(res, data, '主图任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * POST /api/images/scene
 * 提交场景图生成任务
 */
export async function submitSceneImage(req, res, next) {
  try {
    const { imageUrl, sceneCategory, customBgUrl } = req.body;
    if (!imageUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传产品图');
    }
    const data = await imageService.submitSceneImage(req.user.id, { imageUrl, sceneCategory, customBgUrl });
    return success(res, data, '场景图任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * POST /api/images/detail-h5
 * 提交详情页生成任务
 */
export async function submitDetailH5(req, res, next) {
  try {
    const { imageUrl, category, templateId } = req.body;
    if (!imageUrl || !category) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传产品图并选择商品类目');
    }
    const data = await imageService.submitDetailH5(req.user.id, { imageUrl, category, templateId });
    return success(res, data, '详情页任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * POST /api/images/batch
 * 提交批量处理任务
 */
export async function submitBatchTask(req, res, next) {
  try {
    const { imageUrls, operation, platform, style } = req.body;
    if (!imageUrls || !imageUrls.length) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传至少一张图片');
    }
    const data = await imageService.submitBatchTask(req.user.id, { imageUrls, operation, platform, style });
    return success(res, data, '批量任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * POST /api/images/retouch
 * 提交图片精修任务
 */
export async function submitRetouch(req, res, next) {
  try {
    const { imageUrl, level, features } = req.body;
    if (!imageUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传需要精修的图片');
    }
    const data = await imageService.submitRetouch(req.user.id, { imageUrl, level, features });
    return success(res, data, '精修任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * POST /api/images/remove-bg
 * 智能抠图任务
 */
export async function submitRemoveBg(req, res, next) {
  try {
    const { imageUrl, format } = req.body;
    if (!imageUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传需要抠图的图片');
    }
    const data = await imageService.submitRemoveBg(req.user.id, { imageUrl, format });
    return success(res, data, '抠图任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * POST /api/images/white-bg
 * 白底图生成任务
 */
export async function submitWhiteBg(req, res, next) {
  try {
    const { imageUrl, bgColor } = req.body;
    if (!imageUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传需要换白底的图片');
    }
    const data = await imageService.submitWhiteBg(req.user.id, { imageUrl, bgColor });
    return success(res, data, '白底图任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * GET /api/images/tasks/:taskId
 * 查询任务状态
 */
export async function getTaskResult(req, res, next) {
  try {
    const data = await imageService.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

/**
 * GET /api/images/tasks
 * 我的任务列表
 */
export async function listMyTasks(req, res, next) {
  try {
    const { status, type } = req.query;
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const data = await imageService.listMyTasks(req.user.id, { status, type, page, pageSize });
    return listResult(res, data);
  } catch (err) {
    next(err);
  }
}
