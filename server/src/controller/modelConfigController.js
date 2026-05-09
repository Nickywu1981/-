/**
 * Movio AI v4.2 — Model Config Controller
 * P4: AI 模型配置 CRUD + 调用日志查询
 */
import * as modelConfigService from '../services/modelConfigService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

// ============ 模型配置 CRUD ============

export async function list(req, res) {
  try {
    const includeDisabled = req.query.all === '1';
    const rows = await modelConfigService.list(includeDisabled);
    return success(res, rows);
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

export async function getOne(req, res) {
  try {
    const row = await modelConfigService.getByKey(req.params.modelKey);
    return success(res, row);
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

export async function create(req, res) {
  try {
    const result = await modelConfigService.create(req.validated);
    return success(res, result, '模型注册成功');
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

export async function update(req, res) {
  try {
    const result = await modelConfigService.update(req.params.modelKey, req.validated);
    return success(res, result, '模型更新成功');
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

export async function remove(req, res) {
  try {
    await modelConfigService.remove(req.params.modelKey);
    return success(res, null, '模型已删除');
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

export async function toggle(req, res) {
  try {
    const { enabled } = req.validated;
    const result = await modelConfigService.toggle(req.params.modelKey, enabled);
    return success(res, result, enabled ? '已启用' : '已禁用');
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

// ============ 调用日志 ============

export async function callLogs(req, res) {
  try {
    const { userId, modelKey, status, days } = req.query;
    const pager = parsePagination(req.query, { defaultPageSize: 50, maxPageSize: 200, defaultSort: 'created_at' });
    const result = await modelConfigService.getCallLogs({
      userId: userId ? parseInt(userId) : undefined,
      modelKey,
      status,
      days: days ? parseInt(days) : 7,
      offset: pager.offset,
      limit: pager.pageSize,
    });
    return success(res, result);
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}

export async function callStats(req, res) {
  try {
    const { modelKey } = req.params;
    const { days } = req.query;
    const stats = await modelConfigService.getCallStats(modelKey, days ? parseInt(days) : 7);
    return success(res, stats);
  } catch (e) {
    return error(res, e.status || 500, e.message);
  }
}
