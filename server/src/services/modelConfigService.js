import * as modelConfigDao from '../dao/modelConfigDao.js';
import { BusinessError } from '../utils/businessError.js';
import { encrypt } from '../utils/crypto.js';
import { invalidateCache } from './model-router.service.js';

function _maskApiKey(row) {
  if (!row) return row;
  const r = { ...row };
  delete r.api_key_enc;
  r.api_key_masked = '••••••••';
  return r;
}

function _maskApiKeys(rows) { return rows.map(_maskApiKey); }

// ============ 模型配置 CRUD ============

export async function list(includeDisabled = false) {
  const rows = await modelConfigDao.listAll(includeDisabled);
  return _maskApiKeys(rows);
}

export async function getByKey(modelKey) {
  const row = await modelConfigDao.getByKey(modelKey);
  if (!row) throw new BusinessError(404, '模型不存在');
  return _maskApiKey(row);
}

export async function create(data) {
  const existing = await modelConfigDao.getByKey(data.model_key);
  if (existing) throw new BusinessError(409, '模型标识已存在');
  const { api_key, ...rest } = data;
  const result = await modelConfigDao.create({ ...rest, api_key_enc: encrypt(api_key) });
  invalidateCache();
  return _maskApiKey(result);
}

export async function update(modelKey, data) {
  const { api_key, ...rest } = data;
  const updateData = { ...rest };
  if (api_key) updateData.api_key_enc = encrypt(api_key);
  const result = await modelConfigDao.update(modelKey, updateData);
  if (!result) throw new BusinessError(404, '模型不存在');
  invalidateCache();
  return _maskApiKey(result);
}

export async function remove(modelKey) {
  const ok = await modelConfigDao.remove(modelKey);
  if (!ok) throw new BusinessError(404, '模型不存在');
  invalidateCache();
  return true;
}

export async function toggle(modelKey, enabled) {
  const ok = await modelConfigDao.toggle(modelKey, enabled);
  if (!ok) throw new BusinessError(404, '模型不存在');
  invalidateCache();
  return { model_key: modelKey, enabled };
}

// ============ 调用日志 ============

export async function getCallLogs({ userId, modelKey, status, days = 7, offset = 0, limit = 50 }) {
  return modelConfigDao.queryCallLogs({ userId, modelKey, status, days, offset, limit });
}

export async function getCallStats(modelKey, days = 7) {
  return modelConfigDao.getCallStats(modelKey, days);
}
