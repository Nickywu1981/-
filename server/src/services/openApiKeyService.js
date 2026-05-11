/**
 * Open API Key Service — API Key 生命周期管理
 * G5 后端 | 阶段4
 */
import crypto from 'crypto';
import * as openApiKeyDao from '../dao/openApiKeyDao.js';

export function generateApiKey(tenantId, description = '') {
  const prefix = 'movio_';
  const raw = `${tenantId}_${Date.now()}_${crypto.randomBytes(18).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const apiKey = `${prefix}${hash.slice(0, 40)}`;
  const apiSecret = crypto.randomBytes(32).toString('hex');
  return { apiKey, apiSecret, description };
}

export async function listKeys(tenantId, opts) {
  const { rows, total, page, pageSize } = await openApiKeyDao.listByTenant(tenantId, opts);
  return {
    items: rows.map(r => ({
      id: r.id,
      apiKey: maskKey(r.api_key),
      apiKeyFull: r.api_key,
      description: r.description,
      status: r.status,
      rateLimit: r.rate_limit,
      dailyLimit: r.daily_limit,
      createTime: r.create_time,
      updateTime: r.update_time,
    })),
    total,
    page,
    pageSize,
  };
}

export async function createKey(tenantId, { description, rateLimit, dailyLimit }) {
  const { apiKey, apiSecret } = generateApiKey(tenantId, description);
  const id = await openApiKeyDao.create({
    api_key: apiKey,
    api_secret: apiSecret,
    tenant_id: tenantId,
    description: description || '',
    rate_limit: rateLimit || 100,
    daily_limit: dailyLimit || 10000,
  });
  return { id, apiKey, apiSecret };
}

export async function toggleKey(id, tenantId, status) {
  const ok = await openApiKeyDao.update(id, tenantId, { status: status ? 1 : 0 });
  return { ok };
}

export async function updateKey(id, tenantId, data) {
  const updateData = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.rateLimit !== undefined) updateData.rate_limit = data.rateLimit;
  if (data.dailyLimit !== undefined) updateData.daily_limit = data.dailyLimit;
  const ok = await openApiKeyDao.update(id, tenantId, updateData);
  return { ok };
}

export async function deleteKey(id, tenantId) {
  const ok = await openApiKeyDao.softDelete(id, tenantId);
  return { ok };
}

function maskKey(apiKey) {
  if (!apiKey) return '';
  return apiKey.slice(0, 10) + '****' + apiKey.slice(-6);
}
