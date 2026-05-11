import { wrapController } from '../utils/wrapController.js';
import * as sizeTemplateService from '../services/sizeTemplateService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';

/**
 * GET /api/templates/platforms
 * 获取所有平台及分组尺寸
 */
export const getAllPlatforms = wrapController(async (req, res, next) => {
    const data = await sizeTemplateService.getAllPlatformSizes();
    return sendSuccess(res, data);
  })

/**
 * GET /api/templates/platforms/list
 * 获取平台代码列表
 */
export const getPlatformList = wrapController(async (req, res, next) => {
    const data = await sizeTemplateService.getPlatformList();
    return sendSuccess(res, data);
  })

/**
 * GET /api/templates/platforms/:platform
 * 按平台获取尺寸
 */
export const getSizesByPlatform = wrapController(async (req, res, next) => {
    const data = await sizeTemplateService.getSizesByPlatform(req.params.platform);
    return sendSuccess(res, data);
  })

// ==================== 用户自定义模板 ====================

/**
 * POST /api/templates/my
 * 创建用户自定义模板
 */
export const createUserTemplate = wrapController(async (req, res, next) => {
    const { name, width, height, platform } = req.body;
    const data = await sizeTemplateService.createUserTemplate(req.user.id, { name, width, height, platform });
    return sendSuccess(res, data, '模板创建成功');
  })

/**
 * GET /api/templates/my
 * 获取用户自定义模板列表
 */
export const listUserTemplates = wrapController(async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 20, 100);
    const data = await sizeTemplateService.listUserTemplates(req.user.id, { page, pageSize });
    return sendSuccess(res, data);
  })

/**
 * PUT /api/templates/my/:id
 * 更新用户自定义模板
 */
export const updateUserTemplate = wrapController(async (req, res, next) => {
    const { name, width, height, platform } = req.body;
    const data = await sizeTemplateService.updateUserTemplate(req.user.id, req.params.id, { name, width, height, platform });
    return sendSuccess(res, data, '模板更新成功');
  })

/**
 * DELETE /api/templates/my/:id
 * 删除用户自定义模板
 */
export const deleteUserTemplate = wrapController(async (req, res, next) => {
    const data = await sizeTemplateService.deleteUserTemplate(req.user.id, req.params.id);
    return sendSuccess(res, data, '模板已删除');
  })
