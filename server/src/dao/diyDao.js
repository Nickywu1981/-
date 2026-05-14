import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';
import { getRedis } from './redis.js';
import logger from '../utils/logger.js';

import { withTransaction } from './transaction.js';

const REDIS_KEY_PREFIX = 'diy:page:';
const REDIS_TTL = 86400; // 24h

// ==================== 页面 CRUD（增强版） ====================

export default {
  async listPages(tenantId, { pageType, status, keyword, ownerId, accessType, page = 1, pageSize = 20 }) {
    const baseWhere = 'WHERE tenant_id = ?';
    const params = [tenantId];
    const { offset } = parsePagination({ page, pageSize });
    let filter = '';
    const includedTrash = status === 3 || String(status) === '3';
    if (!includedTrash) filter += ' AND status != 3';
    if (status !== undefined && status !== null && status !== '') { filter += ' AND status = ?'; params.push(Number(status)); }
    if (pageType) { filter += ' AND page_type = ?'; params.push(pageType); }
    if (accessType) { filter += ' AND access_type = ?'; params.push(accessType); }
    if (ownerId) { filter += ' AND owner_id = ?'; params.push(Number(ownerId)); }
    if (keyword) { filter += ' AND title LIKE ?'; params.push(`%${keyword}%`); }
    const fromWhere = `FROM diy_page ${baseWhere}${filter}`;
    const cParams = [...params];
    const [{ total }] = await pool.query(`SELECT COUNT(*) as total ${fromWhere}`, cParams);
    params.push(offset, pageSize);
    const sql = `SELECT id, owner_id, title, slug, page_type, access_type, status, publish_time, offline_time, access_count, latest_published_version, create_time, update_time ${fromWhere} ORDER BY update_time DESC LIMIT ?, ?`;
    const [rows] = await pool.query(sql, params);
    return { list: rows, total, page, pageSize };
  },

  async getPageById(id, tenantId) {
    const [rows] = await pool.query(
      'SELECT id, tenant_id, owner_id, title, slug, page_type, access_type, status, mobile_config, pc_config, meta_json, publish_time, offline_time, access_count, latest_published_version, create_time, update_time FROM diy_page WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (!rows[0]) return null;
    const p = rows[0];
    return { ...p, mobile_config: parseJson(p.mobile_config), pc_config: parseJson(p.pc_config), meta_json: parseJson(p.meta_json) };
  },

  async getPagesByIds(ids, tenantId) {
    if (!ids || !ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, tenant_id, owner_id, title, slug, page_type, access_type, status, mobile_config, pc_config, meta_json, publish_time, offline_time, access_count, latest_published_version, create_time, update_time FROM diy_page WHERE id IN (${placeholders}) AND tenant_id = ?`,
      [...ids, tenantId],
    );
    return rows.map(p => ({ ...p, mobile_config: parseJson(p.mobile_config), pc_config: parseJson(p.pc_config), meta_json: parseJson(p.meta_json) }));
  },

  async getPageBySlug(slug, tenantId) {
    const [rows] = await pool.query(
      'SELECT id, title, slug, page_type, status FROM diy_page WHERE slug = ? AND tenant_id = ? AND status IN (0,1,2) LIMIT 1',
      [slug, tenantId],
    );
    return rows[0] || null;
  },

  // 公开页面按 slug 查询（依赖 DB 层 UNIQUE(slug) 约束防止跨租户碰撞；约束就绪前取最新发布）
  async getPublishedPage(slug, tenantId) {
    // 先查 Redis
    const redis = getRedis();
    const cacheKey = tenantId ? `${REDIS_KEY_PREFIX}${tenantId}:${slug}` : `${REDIS_KEY_PREFIX}${slug}`;
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) { logger.warn('[DiyDao] Redis 缓存读取失败，回退DB查询', { slug, error: e.message }); }
    }
    let sql = 'SELECT id, owner_id, title, slug, page_type, mobile_config, pc_config, meta_json, publish_time, latest_published_version FROM diy_page WHERE slug = ? AND status = 1';
    const params = [slug];
    if (tenantId) { sql += ' AND tenant_id = ?'; params.push(tenantId); }
    sql += ' ORDER BY publish_time DESC LIMIT 1';
    const [rows] = await pool.query(sql, params);
    if (!rows[0]) return null;
    const p = rows[0];
    const result = { id: p.id, ownerId: p.owner_id, title: p.title, slug: p.slug, page_type: p.page_type, mobileConfig: parseJson(p.mobile_config), pcConfig: parseJson(p.pc_config), meta: parseJson(p.meta_json), publishTime: p.publish_time, version: p.latest_published_version, tenantId: p.tenant_id };
    // 写入 Redis 缓存
    if (redis) {
      try { await redis.setex(cacheKey, REDIS_TTL, JSON.stringify(result)); } catch (e) { logger.warn('[DiyDao] 发布页缓存写入失败', { slug, error: e.message }); }
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
    const oldSlug = fields.slug ? null : await this._getSlugById(id, tenantId);
    const allowed = ['title', 'slug', 'page_type', 'access_type', 'mobile_config', 'pc_config', 'meta_json', 'status', 'offline_time'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(['mobile_config', 'pc_config', 'meta_json'].includes(k) ? JSON.stringify(fields[k]) : fields[k]);
      }
    }
    if (!sets.length) return 0;
    if (fields.status === 1) { sets.push('publish_time = NOW()'); }
    if (fields.status === 2) { sets.push('offline_time = NOW()'); }
    vals.push(id, tenantId);
    const [r] = await pool.query(`UPDATE diy_page SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    if (r.affectedRows) {
      if (oldSlug) await this.clearPageCache(oldSlug);
      if (fields.slug) await this.clearPageCache(fields.slug);
    }
    return r.affectedRows;
  },

  async updateAccessCount(slug) {
    await pool.query('UPDATE diy_page SET access_count = access_count + 1 WHERE slug = ?', [slug]);
  },

  // ==================== 状态机操作 ====================

  async softDeletePage(id, tenantId) {
    const [r] = await pool.query('UPDATE diy_page SET status = 3 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (r.affectedRows) await this._clearCacheById(id, tenantId);
    return r.affectedRows;
  },

  async restorePage(id, tenantId) {
    const [r] = await pool.query('UPDATE diy_page SET status = 0 WHERE id = ? AND tenant_id = ? AND status = 3', [id, tenantId]);
    return r.affectedRows;
  },

  // 依赖调用方已验证 page_id 归属当前租户
  async hardDeletePage(id, tenantId) {
    const slug = await this._getSlugById(id, tenantId);
    return withTransaction(async (conn) => {
      await conn.query('DELETE FROM diy_page_version WHERE page_id = ?', [id]);
      await conn.query('DELETE FROM diy_page WHERE id = ? AND tenant_id = ? AND status = 3', [id, tenantId]);
      if (slug) await this.clearPageCache(slug);
    });
  },

  async unpublishPage(id, tenantId) {
    const [r] = await pool.query('UPDATE diy_page SET status = 2, offline_time = NOW() WHERE id = ? AND tenant_id = ? AND status = 1', [id, tenantId]);
    if (r.affectedRows) await this._clearCacheById(id, tenantId);
    return r.affectedRows;
  },

  async republishPage(id, tenantId) {
    const [r] = await pool.query('UPDATE diy_page SET status = 1, publish_time = NOW() WHERE id = ? AND tenant_id = ? AND status = 2', [id, tenantId]);
    if (r.affectedRows) await this._clearCacheById(id, tenantId);
    return r.affectedRows;
  },

  // ==================== 版本管理（增强版） ====================

  async saveVersion(pageId, mobileConfig, pcConfig, { remark, autoSave = false, rollbackFrom = null }) {
    return withTransaction(async (conn) => {
      const [[{ v }]] = await conn.query('SELECT COALESCE(MAX(version),0)+1 as v FROM diy_page_version WHERE page_id = ? FOR UPDATE', [pageId]);
      await conn.query(
        'INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save, rollback_from) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pageId, v, JSON.stringify(mobileConfig || {}), JSON.stringify(pcConfig || {}), remark || null, autoSave ? 1 : 0, rollbackFrom || null],
      );
      if (autoSave) {
        await conn.query(
          'DELETE FROM diy_page_version WHERE page_id = ? AND auto_save = 1 AND id NOT IN (SELECT id FROM (SELECT id FROM diy_page_version WHERE page_id = ? AND auto_save = 1 ORDER BY id DESC LIMIT 30) t)',
          [pageId, pageId],
        ).catch((err) => { logger.warn('[diyDao] 自动保存清理失败:', err.message); });
      }
      return v;
    });
  },

  async listVersions(pageId, { includeAuto = false } = {}) {
    let sql = 'SELECT id, version, remark, auto_save, rollback_from, create_time FROM diy_page_version WHERE page_id = ?';
    if (!includeAuto) sql += ' AND auto_save = 0';
    sql += ' ORDER BY version DESC LIMIT 200';
    const [rows] = await pool.query(sql, [pageId]);
    return rows;
  },

  async getVersion(pageId, version) {
    const [rows] = await pool.query(
      'SELECT id, page_id, version, mobile_config, pc_config, remark, auto_save, rollback_from, create_time FROM diy_page_version WHERE page_id = ? AND version = ? LIMIT 1',
      [pageId, version],
    );
    if (!rows[0]) return null;
    const v = rows[0];
    return { ...v, mobile_config: parseJson(v.mobile_config), pc_config: parseJson(v.pc_config) };
  },

  async getLatestAutoVersion(pageId) {
    const [rows] = await pool.query(
      'SELECT id, page_id, version, mobile_config, pc_config, remark, auto_save, rollback_from, create_time FROM diy_page_version WHERE page_id = ? AND auto_save = 1 ORDER BY id DESC LIMIT 1',
      [pageId],
    );
    if (!rows[0]) return null;
    const v = rows[0];
    return { ...v, mobile_config: parseJson(v.mobile_config), pc_config: parseJson(v.pc_config) };
  },

  // ==================== 组件库 ====================

  async listComponents(tenantId, category, { page = 1, pageSize = 500 } = {}) {
    let sql = 'SELECT id, tenant_id, name, component_code, category, icon, default_config, is_builtin, status, create_time FROM diy_component WHERE (tenant_id = ? OR is_builtin = 1) AND status = 1';
    const params = [tenantId];
    const { offset } = parsePagination({ page, pageSize });
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY category, id LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
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
      try { await redis.setex(`${REDIS_KEY_PREFIX}${slug}`, REDIS_TTL, JSON.stringify(data)); } catch (e) { logger.warn('[DiyDao] cachePublishedPage 缓存写入失败', { slug, error: e.message }); }
    }
  },

  async clearPageCache(slug) {
    const redis = getRedis();
    if (redis) {
      try { await redis.del(`${REDIS_KEY_PREFIX}${slug}`); } catch (e) { logger.warn('[DiyDao] clearPageCache 缓存删除失败', { slug, error: e.message }); }
    }
  },

  // ── 缓存失效辅助方法 ──

  async _getSlugById(id, tenantId) {
    const [rows] = await pool.query('SELECT slug FROM diy_page WHERE id = ? AND tenant_id = ? LIMIT 1', [id, tenantId]);
    return rows[0]?.slug || null;
  },

  async _clearCacheById(id, tenantId) {
    const slug = await this._getSlugById(id, tenantId);
    if (slug) await this.clearPageCache(slug);
  },

  // ==================== 批量操作 ====================

  async batchUpdateStatus(ids, tenantId, status) {
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`UPDATE diy_page SET status = ? WHERE id IN (${placeholders}) AND tenant_id = ?`, [status, ...ids, tenantId]);
  },

  /** 批量发布 — 单次 UPDATE + 单次版本 INSERT，消除 N+1 */
  async batchPublishWithVersions(ids, tenantId) {
    if (!ids || !ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return withTransaction(async (conn) => {
      // 1. 批量查询页面信息
      const [pages] = await conn.query(
        `SELECT id, slug, title, mobile_config, pc_config FROM diy_page WHERE id IN (${placeholders}) AND tenant_id = ? AND status IN (0,2)`,
        [...ids, tenantId],
      );
      if (!pages.length) return ids.map(id => ({ id: Number(id), success: false, error: '页面不存在或状态不允许发布' }));
      // 2. 批量更新状态
      const pageIds = pages.map(p => p.id);
      await conn.query(
        `UPDATE diy_page SET status = 1, publish_time = NOW() WHERE id IN (${pageIds.map(() => '?').join(',')}) AND tenant_id = ?`,
        [...pageIds, tenantId],
      );
      // 3. 批量插入版本
      const versionValues = [];
      const versionParams = [];
      for (const p of pages) {
        versionValues.push('(?, (SELECT COALESCE(MAX(v2.version),0)+1 FROM diy_page_version v2 WHERE v2.page_id = ?), ?, ?, ?, 0)');
        versionParams.push(p.id, p.id, JSON.stringify(parseJson(p.mobile_config)), JSON.stringify(parseJson(p.pc_config)), '批量发布');
      }
      await conn.query(
        `INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save) VALUES ${versionValues.join(', ')}`,
        versionParams,
      );
      // 批量更新 latest_published_version
      await conn.query(
        `UPDATE diy_page SET latest_published_version = (SELECT COALESCE(MAX(dv.version),0) FROM diy_page_version dv WHERE dv.page_id = diy_page.id) WHERE id IN (${pageIds.map(() => '?').join(',')})`,
        pageIds,
      );
      return pageIds.map(id => ({ id, success: true, msg: '发布成功' }));
    });
  },

  // ==================== 事务封装 ====================

  /** 创建页面 + 初始版本（事务） */
  async createPageWithVersion({ tenantId, ownerId, title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson }) {
    return withTransaction(async (conn) => {
      const [r] = await conn.query(
        'INSERT INTO diy_page (tenant_id, owner_id, title, slug, page_type, access_type, mobile_config, pc_config, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, ownerId || 0, title, slug, pageType || 'mobile', accessType || 'public', JSON.stringify(mobileConfig || { sections: [] }), JSON.stringify(pcConfig || { sections: [] }), metaJson ? JSON.stringify(metaJson) : null],
      );
      const id = r.insertId;
      await conn.query(
        'INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save) VALUES (?, 1, ?, ?, ?, 0)',
        [id, JSON.stringify(mobileConfig || { sections: [] }), JSON.stringify(pcConfig || { sections: [] }), '初始版本'],
      );
      const [[page]] = await conn.query(
        'SELECT id, tenant_id, owner_id, title, slug, page_type, access_type, status, publish_time, offline_time, access_count, latest_published_version, create_time, update_time FROM diy_page WHERE id = ?',
        [id],
      );
      return { ...page, mobile_config: mobileConfig || { sections: [] }, pc_config: pcConfig || { sections: [] }, meta_json: metaJson || null };
    });
  },

  /** 发布页面（事务：状态更新 + 版本插入） */
  async publishWithVersion(id, tenantId, mobileConfig, pcConfig, slug) {
    return withTransaction(async (conn) => {
      const [[{ v }]] = await conn.query('SELECT COALESCE(MAX(version),0)+1 as v FROM diy_page_version WHERE page_id = ? FOR UPDATE', [id]);
      await conn.query(
        'INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save) VALUES (?, ?, ?, ?, ?, 0)',
        [id, v, JSON.stringify(mobileConfig), JSON.stringify(pcConfig), '发布'],
      );
      await conn.query('UPDATE diy_page SET status = 1, publish_time = NOW(), latest_published_version = ? WHERE id = ? AND tenant_id = ?', [v, id, tenantId]);
      return v;
    });
  },

  /** 克隆页面（事务） */
  async cloneWithVersion(src, tenantId) {
    const slug = `${src.slug}-clone-${Date.now().toString(36)}`;
    const title = `${src.title}（克隆版）`;
    return withTransaction(async (conn) => {
      const [r] = await conn.query(
        'INSERT INTO diy_page (tenant_id, owner_id, title, slug, page_type, access_type, mobile_config, pc_config, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, src.owner_id, title, slug, src.page_type, src.access_type, JSON.stringify(src.mobile_config), JSON.stringify(src.pc_config), src.meta_json ? JSON.stringify(src.meta_json) : null],
      );
      const newId = r.insertId;
      await conn.query(
        'INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save) VALUES (?, 1, ?, ?, ?, 0)',
        [newId, JSON.stringify(src.mobile_config), JSON.stringify(src.pc_config), `克隆自页面 #${src.id}`],
      );
      const [[page]] = await conn.query(
        'SELECT id, tenant_id, owner_id, title, slug, page_type, access_type, status, publish_time, offline_time, access_count, latest_published_version, create_time, update_time FROM diy_page WHERE id = ?',
        [newId],
      );
      return { ...page, mobile_config: src.mobile_config, pc_config: src.pc_config, meta_json: src.meta_json };
    });
  },

  /** 回滚版本（事务：插入新版本 + 更新页面配置） */
  async rollbackWithVersion(pageId, tenantId, srcVersion) {
    return withTransaction(async (conn) => {
      const [[{ v }]] = await conn.query('SELECT COALESCE(MAX(version),0)+1 as v FROM diy_page_version WHERE page_id = ? FOR UPDATE', [pageId]);
      await conn.query(
        'INSERT INTO diy_page_version (page_id, version, mobile_config, pc_config, remark, auto_save, rollback_from) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [pageId, v, JSON.stringify(srcVersion.mobile_config), JSON.stringify(srcVersion.pc_config), `回滚自版本 v${srcVersion.version}`, srcVersion.version],
      );
      await conn.query('UPDATE diy_page SET mobile_config = ?, pc_config = ? WHERE id = ? AND tenant_id = ?',
        [JSON.stringify(srcVersion.mobile_config), JSON.stringify(srcVersion.pc_config), pageId, tenantId]);
      return { version: v, msg: `已回滚至版本 v${srcVersion.version}` };
    });
  },

  // ==================== 模板库 ====================

  async listTemplates({ industry, pageType, keyword, page = 1, pageSize = 20 }) {
    const { offset } = parsePagination({ page, pageSize });
    const baseWhere = 'WHERE status = 1';
    const params = [];
    let filter = '';
    if (industry) { filter += ' AND industry = ?'; params.push(industry); }
    if (pageType) { filter += ' AND page_type = ?'; params.push(pageType); }
    if (keyword) { filter += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    const fromWhere = `FROM diy_template ${baseWhere}${filter}`;
    const [{ total }] = await pool.query(`SELECT COUNT(*) as total ${fromWhere}`, [...params]);
    params.push(offset, pageSize);
    const sql = `SELECT id, title, industry, page_type, thumbnail, description, tags, use_count, is_official, create_time ${fromWhere} ORDER BY use_count DESC, id ASC LIMIT ?, ?`;
    const [rows] = await pool.query(sql, params);
    return { list: rows, total, page, pageSize };
  },

  async getTemplateById(id) {
    const [rows] = await pool.query(
      'SELECT id, title, industry, page_type, thumbnail, description, tags, mobile_config, pc_config, use_count, is_official, status, create_time FROM diy_template WHERE id = ? AND status = 1',
      [id],
    );
    if (!rows[0]) return null;
    const t = rows[0];
    return { ...t, mobile_config: parseJson(t.mobile_config), pc_config: parseJson(t.pc_config) };
  },

  async incrementTemplateUse(id) {
    await pool.query('UPDATE diy_template SET use_count = use_count + 1 WHERE id = ?', [id]);
  },

  async listTemplateIndustries() {
    const [rows] = await pool.query('SELECT DISTINCT industry FROM diy_template WHERE status = 1 ORDER BY industry');
    return rows.map(r => r.industry);
  },
};

function parseJson(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch (e) { logger.warn('JSON parse failed for diy config:', e.message?.slice(0, 100)); return {}; }
}
