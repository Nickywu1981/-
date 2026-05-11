/**
 * Open API Key Controller — 请求/响应处理层
 * G5 后端 | 阶段4
 */
import { wrapController } from '../utils/wrapController.js';
import { success, error } from '../utils/response.js';
import * as openApiKeyService from '../services/openApiKeyService.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listKeys = wrapController(async (req, res, next) => {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await openApiKeyService.listKeys(req.user.tenantId || 1, {
      page: parseInt(page), pageSize: parseInt(pageSize),
    });
    success(res, result);
});

export const createKey = wrapController(async (req, res, next) => {
    const { description, rateLimit, dailyLimit } = req.body;
    const result = await openApiKeyService.createKey(req.user.tenantId || 1, {
      description, rateLimit, dailyLimit,
    });
    success(res, result);
});

export const toggleKey = wrapController(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await openApiKeyService.toggleKey(parseInt(id), req.user.tenantId || 1, status);
    if (!result.ok) return error(res, ERROR_CODE.NOT_FOUND, 'API Key 不存在');
    success(res, result);
});

export const updateKey = wrapController(async (req, res, next) => {
    const { id } = req.params;
    const { description, rateLimit, dailyLimit } = req.body;
    const result = await openApiKeyService.updateKey(parseInt(id), req.user.tenantId || 1, {
      description, rateLimit, dailyLimit,
    });
    if (!result.ok) return error(res, ERROR_CODE.NOT_FOUND, 'API Key 不存在');
    success(res, result);
});

export const deleteKey = wrapController(async (req, res, next) => {
    const { id } = req.params;
    const result = await openApiKeyService.deleteKey(parseInt(id), req.user.tenantId || 1);
    if (!result.ok) return error(res, ERROR_CODE.NOT_FOUND, 'API Key 不存在');
    success(res, result);
});
