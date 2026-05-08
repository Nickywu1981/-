import pool from './db.js';

export default {
  async listConfigs(tenantId) {
    const [rows] = await pool.query(
      'SELECT id, name, proxy_code, upstream_url, method, auth_type, timeout_ms, retry_count, cache_ttl, status, create_time FROM api_proxy_config WHERE tenant_id = ? ORDER BY create_time DESC',
      [tenantId],
    );
    return rows;
  },

  async getById(id, tenantId) {
    const [rows] = await pool.query('SELECT * FROM api_proxy_config WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] || null;
  },

  async getByCode(code, tenantId) {
    const [rows] = await pool.query('SELECT * FROM api_proxy_config WHERE proxy_code = ? AND tenant_id = ? AND status = 1', [code, tenantId]);
    return rows[0] || null;
  },

  async create(data) {
    const [r] = await pool.query(
      'INSERT INTO api_proxy_config (tenant_id, name, proxy_code, upstream_url, method, auth_type, auth_config, headers_json, timeout_ms, retry_count, cache_ttl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.tenantId, data.name, data.proxyCode, data.upstreamUrl, data.method || 'GET', data.authType || 'none', data.authConfig || null, data.headersJson || null, data.timeoutMs || 10000, data.retryCount || 0, data.cacheTtl || 0],
    );
    return r.insertId;
  },

  async update(id, tenantId, fields) {
    const allowed = ['name', 'proxy_code', 'upstream_url', 'method', 'auth_type', 'auth_config', 'headers_json', 'timeout_ms', 'retry_count', 'cache_ttl', 'status'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(['auth_config', 'headers_json'].includes(k) ? JSON.stringify(fields[k]) : fields[k]); }
    }
    if (!sets.length) return false;
    vals.push(id, tenantId);
    await pool.query(`UPDATE api_proxy_config SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return true;
  },

  async remove(id, tenantId) {
    await pool.query('DELETE FROM api_proxy_log WHERE proxy_id = ?', [id]);
    await pool.query('DELETE FROM api_proxy_config WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  },

  async logCall(proxyId, tenantId, requestUrl, responseStatus, responseBody, durationMs, errorMsg) {
    await pool.query(
      'INSERT INTO api_proxy_log (proxy_id, tenant_id, request_url, response_status, response_body, duration_ms, error_msg) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [proxyId, tenantId, requestUrl, responseStatus, responseBody?.substring(0, 2000) || null, durationMs, errorMsg || null],
    );
  },
};
