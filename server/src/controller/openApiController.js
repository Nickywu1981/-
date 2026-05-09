/**
 * Open API Controller — 请求/响应处理层
 * G5 后端开发 | G-03 修复
 */
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as openApiService from '../services/openApiService.js';

export async function ping(req, res, next) {
  try { success(res, await openApiService.ping(req.tenantId)); } catch (e) { next(e); }
}

export async function getUsage(req, res, next) {
  try { success(res, await openApiService.getUsage(req.tenantId, req.apiKeyRecord)); } catch (e) { next(e); }
}

export async function removeBackground(req, res, next) {
  try {
    const result = await openApiService.removeBackground(req.tenantId, req.body.imageUrl);
    success(res, result);
  } catch (e) { next(e); }
}

export async function generateScene(req, res, next) {
  try {
    const result = await openApiService.generateScene(req.tenantId, req.body.imageUrl, req.body.sceneType);
    success(res, result);
  } catch (e) { next(e); }
}

export async function retouchImage(req, res, next) {
  try {
    const result = await openApiService.retouchImage(req.tenantId, req.body.imageUrl);
    success(res, result);
  } catch (e) { next(e); }
}

export async function generateVideo(req, res, next) {
  try {
    const result = await openApiService.generateVideo(req.tenantId, req.body.imageUrls, {
      effect: req.body.effect,
      duration: req.body.duration,
    });
    success(res, result);
  } catch (e) { next(e); }
}
