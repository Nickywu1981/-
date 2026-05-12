import { BusinessError } from '../utils/businessError.js';
import { PROXY_FLAG, CIRCUIT_STATUS } from '../constants/domainStatus.js';
import proxyDao from '../dao/proxyDao.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';
import { URL } from 'url';

// ==================== SSRF 防护 ====================

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i, /^127\./, /^0\.0\.0\.0$/,
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^::1$/, /^fc00:/, /^fe80:/,
];

function isBlockedHost(hostname) {
  return BLOCKED_HOST_PATTERNS.some(p => p.test(hostname));
}

// ==================== 配置管理 ====================

export async function listConfigs(tenantId, { page = 1, pageSize = 20, status } = {}) {
  return proxyDao.listConfigs(tenantId, { page, pageSize, status });
}

export async function getConfig(id, tenantId) {
  const cfg = await proxyDao.getById(id, tenantId);
  if (!cfg) throw new BusinessError(404, '代理配置不存在');
  return maskSensitive(cfg);
}

export async function createConfig(tenantId, data) {
  if (!data.name || !data.proxyCode || !data.upstreamUrl) {
    throw new BusinessError(400, '名称、编码和上游URL不能为空');
  }
  const existing = await proxyDao.getByCode(data.proxyCode, tenantId);
  if (existing) throw new BusinessError(409, '编码已存在');

  // AES 加密鉴权凭证
  const processed = { ...data };
  if (processed.authConfig && processed.encryptAuth !== PROXY_FLAG.OFF) {
    processed.authConfig = JSON.stringify({
      _encrypted: true,
      payload: encrypt(JSON.stringify(processed.authConfig)),
    });
  } else if (processed.authConfig) {
    processed.authConfig = JSON.stringify(processed.authConfig);
  }
  if (processed.headersJson) processed.headersJson = JSON.stringify(processed.headersJson);

  const id = await proxyDao.create({ tenantId, ...processed });
  return proxyDao.getById(id, tenantId);
}

export async function updateConfig(id, tenantId, data) {
  const cfg = await proxyDao.getById(id, tenantId);
  if (!cfg) throw new BusinessError(404, '代理配置不存在');

  if (data.authConfig) {
    data.authConfig = data.encryptAuth !== PROXY_FLAG.OFF
      ? JSON.stringify({ _encrypted: true, payload: encrypt(JSON.stringify(data.authConfig)) })
      : JSON.stringify(data.authConfig);
  }
  if (data.headersJson) data.headersJson = JSON.stringify(data.headersJson);

  await proxyDao.update(id, tenantId, data);
  return proxyDao.getById(id, tenantId);
}

export async function deleteConfig(id, tenantId) {
  const cfg = await proxyDao.getById(id, tenantId);
  if (!cfg) throw new BusinessError(404, '代理配置不存在');
  await proxyDao.remove(id, tenantId);
  return true;
}

// ==================== 代理调用核心 ====================

export async function callProxy(code, tenantId, { method, body, userId, clientIp } = {}) {
  const proxy = await proxyDao.getByCode(code, tenantId);
  if (!proxy) throw new BusinessError(404, '代理不存在');

  // 1. 白名单校验
  if (proxy.whitelist_enabled !== PROXY_FLAG.OFF) {
    const allowed = await proxyDao.checkWhitelist(tenantId, proxy.upstream_url);
    if (!allowed) {
      throw new BusinessError(403, `上游域名不在白名单: ${proxy.upstream_url}`);
    }
  }

  // 2. 限流检查
  if (proxy.rate_limit_rpm > 0) {
    const rpm = await proxyDao.checkRateLimit(proxy.id);
    if (rpm >= proxy.rate_limit_rpm) {
      throw new BusinessError(429, `限流: ${proxy.rate_limit_rpm}/min`);
    }
  }

  // 3. 熔断检查
  if (proxy.circuit_status === CIRCUIT_STATUS.OPEN) {
    throw new BusinessError(503, '上游已熔断，请稍后重试');
  }

  // 4. SSRF 防护：阻止内网/保留地址
  const upstreamUrl = proxy.upstream_url;
  let upstreamHost;
  try { upstreamHost = new URL(upstreamUrl).hostname; } catch {
    throw new BusinessError(400, '无效的上游地址');
  }
  if (isBlockedHost(upstreamHost)) {
    throw new BusinessError(403, '不允许代理到内网地址');
  }

  // 5. 请求体大小校验
  if (body && proxy.body_max_bytes > 0 && Buffer.byteLength(body) > proxy.body_max_bytes) {
    throw new BusinessError(413, `请求体超过上限 ${proxy.body_max_bytes} 字节`);
  }

  // 6. 构建请求
  const requestMethod = method || proxy.method || 'GET';
  const headers = buildHeaders(proxy);
  let requestBody = null;
  if (proxy.pass_body && body && requestMethod !== 'GET') {
    requestBody = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // 7. 带重试退避的请求
  const maxRetries = proxy.retry_count || 0;
  const timeoutMs = proxy.timeout_ms || 10000;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const start = Date.now();
      const fetchOptions = { method: requestMethod, headers, signal: AbortSignal.timeout(timeoutMs) };
      if (requestBody) fetchOptions.body = requestBody;

      const res = await fetch(upstreamUrl, fetchOptions);
      const responseBody = await res.text();
      const duration = Date.now() - start;

      // 熔断恢复
      if (proxy.circuit_status === CIRCUIT_STATUS.OPEN) await proxyDao.resetCircuit(proxy.id);

      // 记录成功日志
      await proxyDao.logCall({
        proxyId: proxy.id, tenantId, userId, clientIp,
        requestUrl: upstreamUrl, requestMethod, requestBody: requestBody?.substring(0, 2000),
        responseStatus: res.status, responseBody: responseBody?.substring(0, 2000),
        durationMs: duration, retryUsed: attempt,
      });

      // 处理上游错误
      if (!res.ok && attempt < maxRetries) {
        const backoff = Math.min(2 ** attempt * 1000, 5000);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) await handleUpstreamFailure(proxy, tenantId, res.status, responseBody);

      return { status: res.status, body: tryJson(responseBody), duration, retryUsed: attempt };
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        const backoff = Math.min(2 ** attempt * 1000, 5000);
        await sleep(backoff);
        continue;
      }
    }
  }

  // 8. 全部重试失败 → 记录
  await handleUpstreamFailure(proxy, tenantId, 0, lastError?.message);
  logger.error(`[proxy] 上游请求失败: ${proxy.code} → ${upstreamUrl}: ${lastError?.message}`);
  throw new BusinessError(502, '代理请求失败，请稍后重试');
}

// ==================== 白名单管理 ====================

export async function listWhitelist(tenantId) {
  return proxyDao.listWhitelist(tenantId);
}

export async function addWhitelist(tenantId, data) {
  if (!data.domainPattern) throw new BusinessError(400, '域名模式不能为空');
  return proxyDao.addWhitelist({ ...data, tenantId });
}

export async function updateWhitelist(id, tenantId, data) {
  await proxyDao.updateWhitelist(id, tenantId, data);
  return true;
}

export async function removeWhitelist(id, tenantId) {
  await proxyDao.removeWhitelist(id, tenantId);
  return true;
}

// ==================== 调用日志 ====================

export async function listLogs(tenantId, query = {}) {
  return proxyDao.listLogs({ ...query, tenantId });
}

export async function cleanLogs(tenantId, days = 30) {
  await proxyDao.cleanOldLogs(days);
  return { cleaned: true, days };
}

// ==================== 熔断管理 ====================

export async function resetCircuit(id, _tenantId) {
  await proxyDao.resetCircuit(id);
  return { circuit: 'closed' };
}

export async function getCircuitStatus(id, tenantId) {
  const cfg = await proxyDao.getById(id, tenantId);
  return { circuitStatus: cfg?.circuit_status || 0, failCount: cfg?.circuit_fail_count || 0 };
}

// ==================== 内部工具 ====================

function buildHeaders(proxy) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'MovioAI-Proxy/1.0' };
  try {
    if (proxy.headers_json) Object.assign(headers, safeJson(proxy.headers_json));
  } catch (e) {
    logger.warn('[Proxy] Headers JSON 解析失败', { error: e.message });
  }

  if (proxy.auth_type === 'bearer' || proxy.auth_type === 'api_key') {
    try {
      let authConfig = proxy.auth_config;
      if (typeof authConfig === 'string') authConfig = safeJson(authConfig);
      if (authConfig?._encrypted && authConfig?.payload) {
        authConfig = safeJson(decrypt(authConfig.payload));
      }

      if (proxy.auth_type === 'bearer' && authConfig?.token) {
        headers['Authorization'] = `Bearer ${authConfig.token}`;
      } else if (proxy.auth_type === 'api_key' && authConfig?.apiKey) {
        const headerName = authConfig.headerName || 'X-API-Key';
        headers[headerName] = authConfig.apiKey;
      }
    } catch { /* auth parse error */ }
  }

  return headers;
}

async function handleUpstreamFailure(proxy, _tenantId, _status, _body) {
  const failCount = (proxy.circuit_fail_count || 0) + 1;
  const threshold = proxy.circuit_break_count || 5;
  if (failCount >= threshold) {
    await proxyDao.setCircuitBreak(proxy.id, failCount);
  } else {
    await proxyDao.setCircuitBreak(proxy.id, failCount);
  }
}

function maskSensitive(cfg) {
  if (!cfg) return cfg;
  const masked = { ...cfg };
  try {
    if (masked.auth_config) {
      const ac = typeof masked.auth_config === 'string' ? safeJson(masked.auth_config) : masked.auth_config;
      if (ac?._encrypted) masked.auth_config = '***ENCRYPTED***';
    }
  } catch (e) {
    logger.warn('[Proxy] Headers JSON 解析失败', { error: e.message });
  }
  return masked;
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

function tryJson(str) {
  try { return JSON.parse(str); } catch { return str; }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
