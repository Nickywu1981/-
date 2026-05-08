import pool from './db.js';

export default {
  // ========== 页面 CRUD ==========
  async listPages(tenantId, { pageType, status, keyword, page = 1, pageSize = 20 }) {
    let sql = 'SELECT id, title, slug, page_type, status, publish_time, create_time, update_time FROM diy_page WHERE tenant_id = ?';
    const params = [tenantId];
    if (pageType) { sql += ' AND page_type = ?'; params.push(pageType); }
    if (status !== undefined && status !== null && status !== '') { sql += ' AND status = ?'; params.push(Number(status)); }
    if (keyword) { sql += ' AND title LIKE ?'; params.push(`%${keyword}%`); }
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) t`, params);
    params.push((page - 1) * pageSize, pageSize);
    sql += ' ORDER BY update_time DESC LIMIT ?, ?';
    const [rows] = await pool.query(sql, params);
    return { list: rows, total: countRows[0].total, page, pageSize };
  },

  async getPageById(id, tenantId) {
    const [rows] = await pool.query('SELECT * FROM diy_page WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] || null;
  },

  async getPageBySlug(slug, tenantId) {
    const [rows] = await pool.query('SELECT * FROM diy_page WHERE slug = ? AND tenant_id = ? AND status = 1', [slug, tenantId]);
    return rows[0] || null;
  },

  async getPublishedPage(slug) {
    const [rows] = await pool.query('SELECT id, title, slug, page_type, config_json, meta_json, publish_time FROM diy_page WHERE slug = ? AND status = 1 LIMIT 1', [slug]);
    if (!rows[0]) return null;
    const page = rows[0];
    return {
      id: page.id, title: page.title, slug: page.slug, page_type: page.page_type,
      config_json: typeof page.config_json === 'string' ? JSON.parse(page.config_json) : page.config_json,
      meta_json: page.meta_json ? (typeof page.meta_json === 'string' ? JSON.parse(page.meta_json) : page.meta_json) : null,
      publish_time: page.publish_time,
    };
  },

  async createPage({ tenantId, title, slug, pageType, configJson, metaJson }) {
    const [r] = await pool.query(
      'INSERT INTO diy_page (tenant_id, title, slug, page_type, config_json, meta_json) VALUES (?, ?, ?, ?, ?, ?)',
      [tenantId, title, slug, pageType, configJson, metaJson || null],
    );
    return r.insertId;
  },

  async updatePage(id, tenantId, fields) {
    const allowed = ['title', 'slug', 'page_type', 'config_json', 'meta_json', 'status'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(k === 'config_json' || k === 'meta_json' ? JSON.stringify(fields[k]) : fields[k]); }
    }
    if (!sets.length) return false;
    if (fields.status === 1) { sets.push('publish_time = NOW()'); }
    vals.push(id, tenantId);
    await pool.query(`UPDATE diy_page SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return true;
  },

  async deletePage(id, tenantId) {
    await pool.query('DELETE FROM diy_page WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    await pool.query('DELETE FROM diy_page_version WHERE page_id = ?', [id]);
  },

  // ========== 版本管理 ==========
  async saveVersion(pageId, configJson, remark) {
    const [r] = await pool.query('SELECT COALESCE(MAX(version),0)+1 as v FROM diy_page_version WHERE page_id = ?', [pageId]);
    const v = r[0].v;
    await pool.query('INSERT INTO diy_page_version (page_id, version, config_json, remark) VALUES (?, ?, ?, ?)', [pageId, v, configJson, remark || null]);
    return v;
  },

  async listVersions(pageId) {
    const [rows] = await pool.query('SELECT id, version, remark, create_time FROM diy_page_version WHERE page_id = ? ORDER BY version DESC', [pageId]);
    return rows;
  },

  async getVersion(pageId, version) {
    const [rows] = await pool.query('SELECT * FROM diy_page_version WHERE page_id = ? AND version = ?', [pageId, version]);
    return rows[0] || null;
  },

  // ========== 组件库 ==========
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
};
