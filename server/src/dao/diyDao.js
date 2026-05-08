import pool from './db.js';
import { getRedis } from './redis.js';

const REDIS_KEY_PREFIX = 'diy:page:';
const REDIS_TTL = 86400; // 24h

// ==================== 页面 CRUD（增强版） ====================

export default {
  async listPages(tenantId, { pageType, status, keyword, ownerId, accessType, page = 1, pageSize = 20 }) {
    let sql = 'SELECT id, owner_id, title, slug, page_type, access_type, status, publish_time, offline_time, access_count, latest_published_version, create_time, update_time FROM diy_page WHERE tenant_id = ? AND status != 3'; // 默认不显示回收站
    const params = [tenantId];
    if (status !== undefined && status !== null && status !== '') { sql += ' AND status = ?'; params.push(Number(status)); }
    if (status === 3) sql = sql.replace('AND status != 3', ''); // 明确查回收站时去掉过滤
    if (pageType) { sql += ' AND page_type = ?'; params.push(pageType); }
    if (accessType) { sql += ' AND access_type = ?'; params.push(accessType); }
    if (ownerId) { sql += ' AND owner_id = ?'; params.push(Number(ownerId)); }
    if (keyword) { sql += ' AND title LIKE ?'; params.push(`%${keyword}%`); }
    const [{ total }] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) t`, params);
    params.push((page - 1) * pageSize, pageSize);
    sql += ' ORDER BY update_time DESC LIMIT ?, ?';
    const [rows] = await pool.query(sql, params);
    return { list: rows, total, page, pageSize };
  },

  async getPageById(id, tenantId) {
    const [rows] = await pool.query('SELECT * FROM diy_page WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (!rows[0]) return null;
    const p = rows[0];
    return { ...p, mobile_config: parseJson(p.mobile_config), pc_config: parseJson(p.pc_config), meta_json: parseJson(p.meta_json) };
  },

  async getPageBySlug(slug, tenantId) {
    const [rows] = await pool.query('SELECT * FROM diy_page WHERE slug = ? AND tenant_id = ? AND status IN (0,1,2)', [slug, tenantId]);
    return rows[0] || null;
  },

  async getPublishedPage(slug) {
    // 先查 Redis
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get(`${REDIS_KEY_PREFIX}${slug}`);
        if (cached) return JSON.parse(cached);
      } catch (_) { /* fallback to DB */ }
    }
    const [rows] = await pool.query(
      'SELECT id, owner_id, title, slug, page_type, mobile_config, pc_config, meta_json, publish_time, latest_published_version FROM diy_page WHERE slug = ? AND status = 1 LIMIT 1', [slug],
    );
    if (!rows[0]) return null;
    const p = rows[0];
    const result = { id: p.id, ownerId: p.owner_id, title: p.title, slug: p.slug, page_type: p.page_type, mobileConfig: parseJson(p.mobile_config), pcConfig: parseJson(p.pc_config), meta: parseJson(p.meta_json), publishTime: p.publish_time, version: p.latest_published_version };
    // 写入 Redis 缓存
    if (redis) {
      try { await redis.setex(`${REDIS_KEY_PREFIX}${slug}`, REDIS_TTL, JSON.stringify(result)); } catch { /* noop */ }
    }
    return result;
  },

  async createPage({ tenantId, ownerId, title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson }) {
    const [r] = await pool.query(
      'INSERT INTO diy_page (tenant_id, owner_id, title, slug, page_type, access_type, mobile_config, pc_config, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tenantId, ownerId || 0, title, slug, pageType || 'mobile', accessType || 'public', JSON.stringify(mobileConfig || { sections: [] }), JSON.stringify(pcConfig || { sections: [] }), metaJson ? JSON.stringify(metaJson) : null],
    );
    return r.insertId;
  },

  async updatePage(id, tenantId, fields) {
    const allowed = ['title', 'slug', 'page_type', 'access_type', 'mobile_config', 'pc_config', 'meta_json', 'status', 'offline_time'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(['mobile_config', 'pc_config', 'meta_json'].includes(k) ? JSON.stringify(fields[k]) : fields[k]);
      }
    }
    if (!sets.length) return false;
    if (fields.status === 1) { sets.push('publish_time = NOW()'); }
    if (fields.status === 2) { sets.push('offline_time = NOW()'); }
    vals.push(id, tenantId);
    await pool.query(`UPDATE diy_page SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return true;
  },

  async updateAccessCount(slug) {
    await pool.query('UPDATE diy_page SET access_count = access_count + 1 WHERE slug = ?', [slug]);
  },

  // ==================== 状态机操作 ====================

  async softDeletePage(id, tenantId) {
    await pool.query('UPDATE diy_page SET status = 3 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  },

  async restorePage(id, tenantId) {
    await pool.query('UPDATE diy_page SET status = 0 WHERE id = ? AND tenant_id = ? AND status = 3', [id, tenantId]);
  },

  async hardDeletePage(id, tenantId) {
    await pool.query('DELETE FROM diy_page WHERE id = ? AND tenant_id = ? AND status = 3', [id, tenantId]);
    await pool.query('DELETE FROM diy_page_version WHERE page_id = ?', [id]);
  },

  async unpublishPage(id, tenantId) {
    await pool.query('UPDATE diy_page SET status = 2, offline_time = NOW() WHERE id = ? AND tenant_id = ? AND status = 1', [id, tenantId]);
  },

  async republishPage(id, tenantId) {
    await pool.query('UPDATE diy_page SET status = 1, publish_time = NOW() WHERE id = ? AND tenant_id = ? AND status = 2', [id, tenantId]);
  },

  // ==================== 版本管理（增强版） ====================

  async saveVersion(pageId, mobileConfig, pcConfig, { remark, autoSave = false, rollbackFrom = null }) {
    const [r] = await pool.query('SELECT COALESCE(MAX(version),0)+1 as v FROM diy_page_version WHERE page_id = ?', [pageId]);
    const v = r[0].v;
    await pool.query(
      'INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save, rollback_from) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [pageId, v, JSON.stringify(mobileConfig || {}), JSON.stringify(pcConfig || {}), remark || null, autoSave ? 1 : 0, rollbackFrom || null],
    );
    // clip auto-save versions if > 30
    if (autoSave) {
      await pool.query(
        'DELETE FROM diy_page_version WHERE page_id = ? AND auto_save = 1 AND id NOT IN (SELECT id FROM (SELECT id FROM diy_page_version WHERE page_id = ? AND auto_save = 1 ORDER BY id DESC LIMIT 30) t)',
        [pageId, pageId],
      ).catch(() => {});
    }
    return v;
  },

  async listVersions(pageId, { includeAuto = false } = {}) {
    let sql = 'SELECT id, version, remark, auto_save, rollback_from, create_time FROM diy_page_version WHERE page_id = ?';
    if (!includeAuto) sql += ' AND auto_save = 0';
    sql += ' ORDER BY version DESC';
    const [rows] = await pool.query(sql, [pageId]);
    return rows;
  },

  async getVersion(pageId, version) {
    const [rows] = await pool.query('SELECT * FROM diy_page_version WHERE page_id = ? AND version = ?', [pageId, version]);
    if (!rows[0]) return null;
    const v = rows[0];
    return { ...v, mobile_config: parseJson(v.mobile_config), pc_config: parseJson(v.pc_config) };
  },

  async getLatestAutoVersion(pageId) {
    const [rows] = await pool.query('SELECT * FROM diy_page_version WHERE page_id = ? AND auto_save = 1 ORDER BY id DESC LIMIT 1', [pageId]);
    if (!rows[0]) return null;
    const v = rows[0];
    return { ...v, mobile_config: parseJson(v.mobile_config), pc_config: parseJson(v.pc_config) };
  },

  // ==================== 组件库 ====================

  async listComponents(tenantId, category) {
    let sql = 'SELECT * FROM diy_component WHERE (tenant_id = ? OR is_builtin = 1) AND status = 1';
    const params = [tenantId];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY category, id';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async createComponent(data) {
    const [r] = await pool.query(
      'INSERT INTO diy_component (tenant_id, name, component_code, category, icon, default_config, is_builtin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.tenantId, data.name, data.componentCode, data.category, data.icon || null, JSON.stringify(data.defaultConfig), data.isBuiltin || 0],
    );
    return r.insertId;
  },

  // ==================== Redis 缓存管理 ====================

  async cachePublishedPage(slug, data) {
    const redis = getRedis();
    if (redis) {
      try { await redis.setex(`${REDIS_KEY_PREFIX}${slug}`, REDIS_TTL, JSON.stringify(data)); } catch { /* noop */ }
    }
  },

  async clearPageCache(slug) {
    const redis = getRedis();
    if (redis) {
      try { await redis.del(`${REDIS_KEY_PREFIX}${slug}`); } catch { /* noop */ }
    }
  },

  // ==================== 批量操作 ====================

  async batchUpdateStatus(ids, tenantId, status) {
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`UPDATE diy_page SET status = ? WHERE id IN (${placeholders}) AND tenant_id = ?`, [status, ...ids, tenantId]);
  },
};

function parseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch (_) { return null; }
}
