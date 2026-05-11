/**
 * Movio AI v4.2 — Model Config Controller
 * P4: AI 模型配置 CRUD + 调用日志查询
 */
import { wrapController } from '../utils/wrapController.js';
import * as modelConfigService from '../services/modelConfigService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ============ 模型配置 CRUD ============

export const list = wrapController(async (req, res) => {
    const includeDisabled = req.query.all === '1';
    const rows = await modelConfigService.list(includeDisabled);
    return success(res, rows);
})

export const getOne = wrapController(async (req, res) => {
    const row = await modelConfigService.getByKey(req.params.modelKey);
    return success(res, row);
})

export const create = wrapController(async (req, res) => {
    const result = await modelConfigService.create(req.validated);
    return success(res, result, '模型注册成功');
})

export const update = wrapController(async (req, res) => {
    const result = await modelConfigService.update(req.params.modelKey, req.validated);
    return success(res, result, '模型更新成功');
})

export const remove = wrapController(async (req, res) => {
    await modelConfigService.remove(req.params.modelKey);
    return success(res, null, '模型已删除');
})

export const toggle = wrapController(async (req, res) => {
    const { enabled } = req.validated;
    const result = await modelConfigService.toggle(req.params.modelKey, enabled);
    return success(res, result, enabled ? '已启用' : '已禁用');
})

// ============ 调用日志 ============

export const callLogs = wrapController(async (req, res) => {
    const { userId, modelKey, status, days } = req.query;
    const pager = parsePagination(req.query, { defaultPageSize: 50, maxPageSize: 200, defaultSort: 'created_at' });
    const result = await modelConfigService.getCallLogs({
      userId: userId ? parseInt(userId, 10) : undefined,
      modelKey,
      status,
      days: days ? parseInt(days, 10) : 7,
      offset: pager.offset,
      limit: pager.pageSize,
    });
    return success(res, result);
})

export const callStats = wrapController(async (req, res) => {
    const { modelKey } = req.params;
    const { days } = req.query;
    const stats = await modelConfigService.getCallStats(modelKey, days ? parseInt(days, 10) : 7);
    return success(res, stats);
})
