import * as sizeTemplateDao from '../dao/sizeTemplateDao.js';

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
  if (!name || !width || !height) {
    const err = new Error('模板名称、宽度、高度不能为空');
    err.statusCode = 400;
    throw err;
  }
  if (width < 1 || height < 0) {
    const err = new Error('尺寸参数不合法');
    err.statusCode = 400;
    throw err;
  }
  const templateId = await sizeTemplateDao.insertUserTemplate({ userId, name, width, height, platform });
  return { id: templateId, name, width, height, platform };
}

export async function updateUserTemplate(userId, templateId, data) {
  const exist = await sizeTemplateDao.getUserTemplateById(templateId, userId);
  if (!exist) {
    const err = new Error('模板不存在');
    err.statusCode = 404;
    throw err;
  }
  const updated = await sizeTemplateDao.updateUserTemplate(templateId, userId, data);
  return { success: updated };
}

export async function deleteUserTemplate(userId, templateId) {
  const exist = await sizeTemplateDao.getUserTemplateById(templateId, userId);
  if (!exist) {
    const err = new Error('模板不存在');
    err.statusCode = 404;
    throw err;
  }
  await sizeTemplateDao.deleteUserTemplate(templateId, userId);
  return { success: true };
}

export async function listUserTemplates(userId) {
  const list = await sizeTemplateDao.listUserTemplates(userId);
  const total = await sizeTemplateDao.countUserTemplates(userId);
  return { list, total };
}
