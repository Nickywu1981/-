/**
 * Movio AI v4.2 — Model Config Controller
 * P4: AI 模型配置 CRUD + 调用日志查询
 */
import * as modelConfigDao from '../dao/modelConfigDao.js';
import { success, error } from '../utils/response.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { BusinessError } from '../utils/businessError.js';

function _maskApiKey(row) {
  if (!row) return row;
  const r = { ...row };
  delete r.api_key_enc;
  r.api_key_masked = '••••••••';
  return r;
}

function _maskApiKeys(rows) { return rows.map(_maskApiKey); }

// ============ 模型配置 CRUD ============

export async function list(req, res) {
  try {
    const includeDisabled = req.query.all === '1';
    const rows = await modelConfigDao.listAll(includeDisabled);
    return success(res, _maskApiKeys(rows));
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function getOne(req, res) {
  try {
    const row = await modelConfigDao.getByKey(req.params.modelKey);
    if (!row) return error(res, 404, '模型不存在');
    return success(res, _maskApiKey(row));
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function create(req, res) {
  try {
    const { model_key, api_key, ...rest } = req.validated;
    const existing = await modelConfigDao.getByKey(model_key);
    if (existing) return error(res, 409, '模型标识已存在');
    const data = { ...rest, model_key, api_key_enc: encrypt(api_key) };
    const result = await modelConfigDao.create(data);
    return success(res, _maskApiKey(result), '模型注册成功');
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function update(req, res) {
  try {
    const { api_key, ...rest } = req.validated;
    const data = { ...rest };
    if (api_key) data.api_key_enc = encrypt(api_key);
    const result = await modelConfigDao.update(req.params.modelKey, data);
    if (!result) return error(res, 404, '模型不存在');
    return success(res, _maskApiKey(result), '模型更新成功');
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function remove(req, res) {
  try {
    const ok = await modelConfigDao.remove(req.params.modelKey);
    if (!ok) return error(res, 404, '模型不存在');
    return success(res, null, '模型已删除');
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function toggle(req, res) {
  try {
    const { enabled } = req.validated;
    const ok = await modelConfigDao.toggle(req.params.modelKey, enabled);
    if (!ok) return error(res, 404, '模型不存在');
    return success(res, { model_key: req.params.modelKey, enabled }, enabled ? '已启用' : '已禁用');
  } catch (e) {
    return error(res, 500, e.message);
  }
}

// ============ 调用日志 ============

export async function callLogs(req, res) {
  try {
    const { userId, modelKey, status, days, offset, limit } = req.query;
    const result = await modelConfigDao.queryCallLogs({
      userId: userId ? parseInt(userId) : undefined,
      modelKey,
      status,
      days: days ? parseInt(days) : 7,
      offset: offset ? parseInt(offset) : 0,
      limit: limit ? parseInt(limit) : 50,
    });
    return success(res, result);
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function callStats(req, res) {
  try {
    const { modelKey } = req.params;
    const { days } = req.query;
    const stats = await modelConfigDao.getCallStats(modelKey, days ? parseInt(days) : 7);
    return success(res, stats);
  } catch (e) {
    return error(res, 500, e.message);
  }
}
