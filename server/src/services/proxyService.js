import proxyDao from '../dao/proxyDao.js';

export async function listConfigs(tenantId) {
  return proxyDao.listConfigs(tenantId);
}

export async function createConfig(tenantId, data) {
  if (!data.name || !data.proxyCode || !data.upstreamUrl) throw Object.assign(new Error('名称、编码和上游URL不能为空'), { statusCode: 400 });
  const id = await proxyDao.create({ tenantId, ...data });
  return proxyDao.getById(id, tenantId);
}

export async function updateConfig(id, tenantId, data) {
  await proxyDao.update(id, tenantId, data);
  return proxyDao.getById(id, tenantId);
}

export async function deleteConfig(id, tenantId) {
  await proxyDao.remove(id, tenantId);
  return true;
}

export async function callProxy(code, tenantId) {
  const proxy = await proxyDao.getByCode(code, tenantId);
  if (!proxy) throw Object.assign(new Error('代理不存在'), { statusCode: 404 });

  const start = Date.now();
  try {
    const headers = { ...parseJson(proxy.headers_json) };
    if (proxy.auth_type === 'bearer') {
      const cfg = parseJson(proxy.auth_config);
      headers['Authorization'] = `Bearer ${cfg.token || ''}`;
    } else if (proxy.auth_type === 'api_key') {
      const cfg = parseJson(proxy.auth_config);
      headers[cfg.headerName || 'X-API-Key'] = cfg.apiKey || '';
    }
    const res = await fetch(proxy.upstream_url, { method: proxy.method, headers, signal: AbortSignal.timeout(proxy.timeout_ms || 10000) });
    const body = await res.text();
    const duration = Date.now() - start;
    await proxyDao.logCall(proxy.id, tenantId, proxy.upstream_url, res.status, body, duration);
    return { status: res.status, body, duration };
  } catch (e) {
    const duration = Date.now() - start;
    await proxyDao.logCall(proxy.id, tenantId, proxy.upstream_url, null, null, duration, e.message);
    throw Object.assign(new Error('代理请求失败: ' + e.message), { statusCode: 500 });
  }
}

function parseJson(str) {
  try { return str ? JSON.parse(str) : {}; } catch { return {}; }
}
