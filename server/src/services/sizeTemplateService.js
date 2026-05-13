import * as sizeTemplateDao from '../dao/sizeTemplateDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 获取平台列表 + 分组尺寸
 */
export async function getAllPlatformSizes() {
  const all = await sizeTemplateDao.listPlatformSizes();

  // 按平台分组
  const platforms = {};
  for (const row of all) {
    if (!platforms[row.platform]) {
      platforms[row.platform] = [];
    }
    platforms[row.platform].push(row);
  }
  return platforms;
}

/**
 * 获取所有平台代码列表
 */
export async function getPlatformList() {
  return sizeTemplateDao.listPlatforms();
}

/**
 * 按平台获取尺寸
 */
export async function getSizesByPlatform(platform) {
  return sizeTemplateDao.listPlatformSizes(platform);
}

// ==================== 用户自定义模板 ====================

export async function createUserTemplate(userId, { name, width, height, platform = '' }) {
  if (!name || !width || !height) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (width < 1 || height < 0) throw new BusinessError(ERROR_CODE.PARAM_INVALID);
  const templateId = await sizeTemplateDao.insertUserTemplate({ userId, name, width, height, platform });
  return { id: templateId, name, width, height, platform };
}

export async function updateUserTemplate(userId, templateId, data) {
  const exist = await sizeTemplateDao.getUserTemplateById(templateId, userId);
  if (!exist) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const updated = await sizeTemplateDao.updateUserTemplate(templateId, userId, data);
  return { success: updated };
}

export async function deleteUserTemplate(userId, templateId) {
  const exist = await sizeTemplateDao.getUserTemplateById(templateId, userId);
  if (!exist) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  await sizeTemplateDao.deleteUserTemplate(templateId, userId);
  return { success: true };
}

export async function listUserTemplates(userId, { page = 1, pageSize = 20 } = {}) {
  const list = await sizeTemplateDao.listUserTemplates(userId, { page, pageSize });
  const total = await sizeTemplateDao.countUserTemplates(userId);
  return { list, total, page, pageSize };
}
