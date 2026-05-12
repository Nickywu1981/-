import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

export default {
  // ==================== 代理配置 CRUD ====================
  async listConfigs(tenantId) {
    const [rows] = await pool.query(
      `SELECT id, tenant_id, name, proxy_code, upstream_url, method, auth_type,
              encrypt_auth, rate_limit_rpm, circuit_break_count, circuit_break_window,
              circuit_status, circuit_fail_count, pass_body, body_max_bytes,
              timeout_ms, retry_count, cache_ttl, status, create_time, update_time
       FROM api_proxy_config WHERE tenant_id = ? ORDER BY create_time DESC`,
      [tenantId],
    );
    return rows;
  },

  async getById(id, tenantId) {
    const [rows] = await pool.query('SELECT * FROM api_proxy_config WHERE id = ? AND tenant_id = ? LIMIT 1', [id, tenantId]);
    return rows[0] || null;
  },

  async getByCode(code, tenantId) {
    const [rows] = await pool.query(
      'SELECT * FROM api_proxy_config WHERE proxy_code = ? AND tenant_id = ? AND status = 1 LIMIT 1',
      [code, tenantId],
    );
    return rows[0] || null;
  },

  async create(data) {
    const [r] = await pool.query(
      `INSERT INTO api_proxy_config (tenant_id, name, proxy_code, upstream_url, method, auth_type,
        auth_config, encrypt_auth, headers_json, rate_limit_rpm, circuit_break_count, circuit_break_window,
        pass_body, body_max_bytes, timeout_ms, retry_count, cache_ttl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.tenantId, data.name, data.proxyCode, data.upstreamUrl, data.method || 'GET',
        data.authType || 'none', data.authConfig || null, data.encryptAuth !== undefined ? data.encryptAuth : 1,
        data.headersJson || null, data.rateLimitRpm || 60, data.circuitBreakCount || 5,
        data.circuitBreakWindow || 60, data.passBody || 0, data.bodyMaxBytes || 1048576,
        data.timeoutMs || 10000, data.retryCount || 0, data.cacheTtl || 0,
      ],
    );
    return r.insertId;
  },

  async update(id, tenantId, fields) {
    const allowed = [
      'name', 'proxy_code', 'upstream_url', 'method', 'auth_type', 'auth_config',
      'encrypt_auth', 'headers_json', 'rate_limit_rpm', 'circuit_break_count',
      'circuit_break_window', 'pass_body', 'body_max_bytes',
      'timeout_ms', 'retry_count', 'cache_ttl', 'status',
    ];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(['auth_config', 'headers_json'].includes(k) ? JSON.stringify(fields[k]) : fields[k]);
      }
    }
    if (!sets.length) return 0;
    vals.push(id, tenantId);
    const [r] = await pool.query(`UPDATE api_proxy_config SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return r.affectedRows;
  },

  async remove(id, tenantId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM api_proxy_log WHERE proxy_id = ? AND tenant_id = ?', [id, tenantId]);
      const [r] = await conn.query('DELETE FROM api_proxy_config WHERE id = ? AND tenant_id = ?', [id, tenantId]);
      await conn.commit();
      return r.affectedRows;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  // ==================== 白名单 CRUD ====================
  async listWhitelist(tenantId) {
    const [rows] = await pool.query(
      'SELECT * FROM api_proxy_whitelist WHERE tenant_id IN (0, ?) AND status = 1 ORDER BY domain_type, domain_pattern LIMIT 1000',
      [tenantId],
    );
    return rows;
  },

  async checkWhitelist(tenantId, url) {
    let hostname;
    try { hostname = new URL(url).hostname; } catch { return []; }
    const [rows] = await pool.query(
      `SELECT id FROM api_proxy_whitelist
       WHERE (tenant_id = 0 OR tenant_id = ?) AND status = 1
       AND (
         domain_pattern = ? OR domain_pattern = CONCAT('*.', ?)
         OR (domain_pattern LIKE '*%' AND ? LIKE CONCAT('%', REPLACE(domain_pattern, '*', '%')))
       )
       LIMIT 1`,
      [tenantId, hostname, hostname, hostname],
    );
    return rows.length > 0;
  },

  async addWhitelist(data) {
    const [r] = await pool.query(
      'INSERT INTO api_proxy_whitelist (tenant_id, domain_pattern, domain_type, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [data.tenantId, data.domainPattern, data.domainType, data.description || null, data.createdBy || null],
    );
    return r.insertId;
  },

  async updateWhitelist(id, tenantId, fields) {
    const allowed = ['domain_pattern', 'domain_type', 'description', 'status'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (!sets.length) return 0;
    vals.push(id, tenantId);
    const [r] = await pool.query(`UPDATE api_proxy_whitelist SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return r.affectedRows;
  },

  async removeWhitelist(id, tenantId) {
    const [r] = await pool.query('DELETE FROM api_proxy_whitelist WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return r.affectedRows;
  },

  // ==================== 限流 & 熔断 ====================
  async checkRateLimit(proxyId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM api_proxy_log
       WHERE proxy_id = ? AND create_time >= NOW() - INTERVAL 1 MINUTE`,
      [proxyId],
    );
    return rows[0].cnt;
  },

  async setCircuitBreak(proxyId, failCount, tenantId) {
    const [r] = await pool.query(
      `UPDATE api_proxy_config SET circuit_status = 1, circuit_last_fail = NOW(), circuit_fail_count = ?
       WHERE id = ? AND tenant_id = ?`,
      [failCount, proxyId, tenantId],
    );
    return r.affectedRows;
  },

  async resetCircuit(proxyId, tenantId) {
    const [r] = await pool.query(
      'UPDATE api_proxy_config SET circuit_status = 0, circuit_fail_count = 0, circuit_last_fail = NULL WHERE id = ? AND tenant_id = ?',
      [proxyId, tenantId],
    );
    return r.affectedRows;
  },

  // ==================== 调用日志 ====================
  async logCall(data) {
    const [r] = await pool.query(
      `INSERT INTO api_proxy_log (proxy_id, tenant_id, user_id, request_url, request_method,
        request_body, response_status, response_body, duration_ms, retry_used, error_msg, client_ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.proxyId, data.tenantId, data.userId || null, data.requestUrl, data.requestMethod || 'GET',
        data.requestBody?.substring(0, 2000) || null, data.responseStatus || null,
        data.responseBody?.substring(0, 2000) || null, data.durationMs || 0,
        data.retryUsed || 0, data.errorMsg?.substring(0, 500) || null, data.clientIp || null,
      ],
    );
    return r.insertId;
  },

  async listLogs({ tenantId, proxyId, startTime, endTime, status, page = 1, pageSize = 20 }) {
    const conditions = ['tenant_id = ?'];
    const vals = [tenantId];
    if (proxyId) { conditions.push('proxy_id = ?'); vals.push(proxyId); }
    if (startTime) { conditions.push('create_time >= ?'); vals.push(startTime); }
    if (endTime) { conditions.push('create_time <= ?'); vals.push(endTime); }
    if (status === 'error') { conditions.push('response_status IS NULL OR response_status >= 500'); }
    if (status === 'success') { conditions.push('response_status >= 200 AND response_status < 400'); }

    const where = conditions.join(' AND ');
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM api_proxy_log WHERE ${where}`, vals);
    const { offset } = parsePagination({ page, pageSize });
    const [rows] = await pool.query(
      `SELECT * FROM api_proxy_log WHERE ${where} ORDER BY create_time DESC LIMIT ?, ?`,
      [...vals, offset, pageSize],
    );
    return { rows, total: countRows[0].total, page, pageSize };
  },

  async cleanOldLogs(days = 30) {
    const [r] = await pool.query('DELETE FROM api_proxy_log WHERE create_time < NOW() - INTERVAL ? DAY', [days]);
    return r.affectedRows;
  },
};
