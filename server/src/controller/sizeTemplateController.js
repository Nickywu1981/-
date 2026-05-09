import * as sizeTemplateService from '../services/sizeTemplateService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';

/**
 * GET /api/templates/platforms
 * 获取所有平台及分组尺寸
 */
export async function getAllPlatforms(req, res, next) {
  try {
    const data = await sizeTemplateService.getAllPlatformSizes();
    return sendSuccess(res, data);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.status, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/templates/platforms/list
 * 获取平台代码列表
 */
export async function getPlatformList(req, res, next) {
  try {
    const data = await sizeTemplateService.getPlatformList();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/templates/platforms/:platform
 * 按平台获取尺寸
 */
export async function getSizesByPlatform(req, res, next) {
  try {
    const data = await sizeTemplateService.getSizesByPlatform(req.params.platform);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

// ==================== 用户自定义模板 ====================

/**
 * POST /api/templates/my
 * 创建用户自定义模板
 */
export async function createUserTemplate(req, res, next) {
  try {
    const { name, width, height, platform } = req.body;
    const data = await sizeTemplateService.createUserTemplate(req.user.id, { name, width, height, platform });
    return sendSuccess(res, data, '模板创建成功');
  } catch (err) {
    if (err.status) {
      return sendError(res, err.status, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/templates/my
 * 获取用户自定义模板列表
 */
export async function listUserTemplates(req, res, next) {
  try {
    const data = await sizeTemplateService.listUserTemplates(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/templates/my/:id
 * 更新用户自定义模板
 */
export async function updateUserTemplate(req, res, next) {
  try {
    const { name, width, height, platform } = req.body;
    const data = await sizeTemplateService.updateUserTemplate(req.user.id, req.params.id, { name, width, height, platform });
    return sendSuccess(res, data, '模板更新成功');
  } catch (err) {
    if (err.status) {
      return sendError(res, err.status, err.message);
    }
    next(err);
  }
}

/**
 * DELETE /api/templates/my/:id
 * 删除用户自定义模板
 */
export async function deleteUserTemplate(req, res, next) {
  try {
    const data = await sizeTemplateService.deleteUserTemplate(req.user.id, req.params.id);
    return sendSuccess(res, data, '模板已删除');
  } catch (err) {
    if (err.status) {
      return sendError(res, err.status, err.message);
    }
    next(err);
  }
}
