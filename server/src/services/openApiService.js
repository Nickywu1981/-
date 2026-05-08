/**
 * Open API Service — 第三方开发者业务逻辑
 * G5 后端开发 | G-03 修复
 * 封装用量查询、计费统计等 Open API 特有逻辑
 */
import * as imageService from './imageService.js';
import * as videoService from './videoService.js';

export async function ping(tenantId) {
  return { version: '1.0.0', tenantId };
}

export async function getUsage(tenantId, apiKeyRecord) {
  return {
    tenantId,
    dailyUsed: apiKeyRecord?.daily_used || 0,
    dailyLimit: apiKeyRecord?.daily_limit || 1000,
    rateLimit: apiKeyRecord?.rate_limit || 60,
  };
}

export async function removeBackground(tenantId, imageUrl) {
  return imageService.removeBackground(tenantId, imageUrl);
}

export async function generateScene(tenantId, imageUrl, sceneType) {
  return imageService.generateScene(tenantId, imageUrl, sceneType);
}

export async function retouchImage(tenantId, imageUrl) {
  return imageService.retouchImage(tenantId, imageUrl);
}

export async function generateVideo(tenantId, imageUrls, options) {
  return videoService.generateVideo(tenantId, imageUrls, options);
}
