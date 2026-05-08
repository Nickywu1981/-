import pool from './db.js';

export default {
  async listForms(tenantId, { page = 1, pageSize = 20, keyword }) {
    let sql = 'SELECT id, title, form_code, description, submit_limit, submit_count, start_time, end_time, status, create_time FROM custom_form WHERE tenant_id = ?';
    const params = [tenantId];
    if (keyword) { sql += ' AND title LIKE ?'; params.push(`%${keyword}%`); }
    const [c] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) t`, params);
    params.push((page - 1) * pageSize, pageSize);
    sql += ' ORDER BY create_time DESC LIMIT ?, ?';
    const [rows] = await pool.query(sql, params);
    return { list: rows, total: c[0].total, page, pageSize };
  },

  async getFormById(id, tenantId) {
    const [rows] = await pool.query('SELECT * FROM custom_form WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] || null;
  },

  async getFormByCode(code, tenantId) {
    const [rows] = await pool.query('SELECT * FROM custom_form WHERE form_code = ? AND tenant_id = ? AND status = 1', [code, tenantId]);
    return rows[0] || null;
  },

  async createForm(data) {
    const [r] = await pool.query(
      'INSERT INTO custom_form (tenant_id, title, form_code, description, fields_json, submit_limit, start_time, end_time, success_msg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.tenantId, data.title, data.formCode, data.description || null, JSON.stringify(data.fields), data.submitLimit || 0, data.startTime || null, data.endTime || null, data.successMsg || '提交成功'],
    );
    return r.insertId;
  },

  async updateForm(id, tenantId, fields) {
    const allowed = ['title', 'form_code', 'description', 'fields_json', 'submit_limit', 'start_time', 'end_time', 'success_msg', 'status'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(k === 'fields_json' ? JSON.stringify(fields[k]) : fields[k]); }
    }
    if (!sets.length) return false;
    vals.push(id, tenantId);
    await pool.query(`UPDATE custom_form SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return true;
  },

  async deleteForm(id, tenantId) {
    await pool.query('DELETE FROM custom_form_submission WHERE form_id = ?', [id]);
    await pool.query('DELETE FROM custom_form WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  },

  async incrementSubmitCount(formId) {
    await pool.query('UPDATE custom_form SET submit_count = submit_count + 1 WHERE id = ?', [formId]);
  },

  async addSubmission({ formId, tenantId, userId, dataJson, ip, userAgent }) {
    const [r] = await pool.query(
      'INSERT INTO custom_form_submission (form_id, tenant_id, user_id, data_json, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [formId, tenantId, userId || null, JSON.stringify(dataJson), ip || null, userAgent || null],
    );
    return r.insertId;
  },

  async listSubmissions(formId, { page = 1, pageSize = 50, status }) {
    let sql = 'SELECT * FROM custom_form_submission WHERE form_id = ?';
    const params = [formId];
    if (status !== undefined && status !== null && status !== '') { sql += ' AND status = ?'; params.push(Number(status)); }
    const [c] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) t`, params);
    params.push((page - 1) * pageSize, pageSize);
    sql += ' ORDER BY create_time DESC LIMIT ?, ?';
    const [rows] = await pool.query(sql, params);
    return { list: rows, total: c[0].total, page, pageSize };
  },

  async updateSubmission(id, fields) {
    const sets = []; const vals = [];
    for (const k of ['status', 'remark']) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (!sets.length) return;
    vals.push(id);
    await pool.query(`UPDATE custom_form_submission SET ${sets.join(', ')} WHERE id = ?`, vals);
  },
};
