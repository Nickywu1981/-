/**
 * Open API Controller — 请求/响应处理层
 * G5 后端开发 | G-03 修复
 */
import { success } from '../utils/response.js';
import * as openApiService from '../services/openApiService.js';

export async function ping(req, res) {
  success(res, await openApiService.ping(req.tenantId));
}

export async function getUsage(req, res) {
  success(res, await openApiService.getUsage(req.tenantId, req.apiKeyRecord));
}

export async function removeBackground(req, res) {
  const result = await openApiService.removeBackground(req.tenantId, req.body.imageUrl);
  success(res, result);
}

export async function generateScene(req, res) {
  const result = await openApiService.generateScene(req.tenantId, req.body.imageUrl, req.body.sceneType);
  success(res, result);
}

export async function retouchImage(req, res) {
  const result = await openApiService.retouchImage(req.tenantId, req.body.imageUrl);
  success(res, result);
}

export async function generateVideo(req, res) {
  const result = await openApiService.generateVideo(req.tenantId, req.body.imageUrls, {
    effect: req.body.effect,
    duration: req.body.duration,
  });
  success(res, result);
}
