import pool from './db.js';

export default {
  // ── 表单 CRUD ──
  async listForms(tenantId, { page = 1, pageSize = 20, keyword, status }) {
    let sql = 'SELECT id, title, form_code, description, submit_limit, submit_count, max_submissions_per_user, start_time, end_time, status, access_type, create_time FROM custom_form WHERE tenant_id = ?';
    const params = [tenantId];
    if (keyword) { sql += ' AND (title LIKE ? OR form_code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status !== undefined && status !== '') { sql += ' AND status = ?'; params.push(Number(status)); }
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
      `INSERT INTO custom_form (tenant_id, title, form_code, description, fields_json, pc_config, mobile_config,
        submit_limit, max_submissions_per_user, start_time, end_time, success_msg, redirect_url,
        data_retention_days, notify_email, access_type, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.tenantId, data.title, data.formCode, data.description || null,
        JSON.stringify(data.fields),
        JSON.stringify(data.pcConfig || {}), JSON.stringify(data.mobileConfig || {}),
        data.submitLimit || 0, data.maxSubmissionsPerUser || 0,
        data.startTime || null, data.endTime || null,
        data.successMsg || '提交成功', data.redirectUrl || null,
        data.dataRetentionDays || 0, data.notifyEmail || null,
        data.accessType ?? 1, data.ownerId || null,
      ],
    );
    return r.insertId;
  },

  async updateForm(id, tenantId, fields) {
    const allowed = [
      'title', 'form_code', 'description', 'fields_json', 'pc_config', 'mobile_config',
      'submit_limit', 'max_submissions_per_user', 'start_time', 'end_time', 'success_msg',
      'redirect_url', 'data_retention_days', 'notify_email', 'status', 'access_type',
    ];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(['fields_json', 'pc_config', 'mobile_config'].includes(k) ? JSON.stringify(fields[k]) : fields[k]);
      }
    }
    if (!sets.length) return false;
    vals.push(id, tenantId);
    await pool.query(`UPDATE custom_form SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, vals);
    return true;
  },

  async deleteForm(id, tenantId) {
    await pool.query('DELETE FROM custom_form_submission WHERE form_id = ?', [id]);
    await pool.query('DELETE FROM diy_custom_field WHERE form_id = ? AND tenant_id = ?', [id, tenantId]);
    await pool.query('DELETE FROM custom_form WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  },

  async incrementSubmitCount(formId) {
    await pool.query('UPDATE custom_form SET submit_count = submit_count + 1 WHERE id = ?', [formId]);
  },

  // ── 提交管理 ──
  async getUserSubmissionCount(formId, userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM custom_form_submission WHERE form_id = ? AND user_id = ?',
      [formId, userId],
    );
    return rows[0]?.cnt || 0;
  },

  async addSubmission({ formId, tenantId, userId, dataJson, ip, userAgent, deviceType, ipLong }) {
    const [r] = await pool.query(
      'INSERT INTO custom_form_submission (form_id, tenant_id, user_id, data_json, ip, user_agent, device_type, user_ip_long) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [formId, tenantId, userId || null, JSON.stringify(dataJson), ip || null, userAgent || null, deviceType || null, ipLong || null],
    );
    return r.insertId;
  },

  async listSubmissions(formId, { page = 1, pageSize = 50, status, dataStatus, startDate, endDate }) {
    let sql = 'SELECT * FROM custom_form_submission WHERE form_id = ?';
    const params = [formId];
    if (status !== undefined && status !== null && status !== '') { sql += ' AND status = ?'; params.push(Number(status)); }
    if (dataStatus !== undefined && dataStatus !== null && dataStatus !== '') { sql += ' AND data_status = ?'; params.push(Number(dataStatus)); }
    if (startDate) { sql += ' AND create_time >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND create_time <= ?'; params.push(endDate); }
    const [c] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) t`, params);
    params.push((page - 1) * pageSize, pageSize);
    sql += ' ORDER BY create_time DESC LIMIT ?, ?';
    const [rows] = await pool.query(sql, params);
    return { list: rows, total: c[0].total, page, pageSize };
  },

  async getAllSubmissions(formId, { page = 1, pageSize = 1000 } = {}) {
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query('SELECT * FROM custom_form_submission WHERE form_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?', [formId, pageSize, offset]);
    return rows;
  },

  async updateSubmission(id, fields) {
    const allowed = ['status', 'data_status', 'remark'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (!sets.length) return;
    vals.push(id);
    await pool.query(`UPDATE custom_form_submission SET ${sets.join(', ')} WHERE id = ?`, vals);
  },

  // ── 字段管理(独立表) ──
  async listFields(formId, tenantId) {
    const [rows] = await pool.query(
      'SELECT * FROM diy_custom_field WHERE form_id = ? AND tenant_id = ? ORDER BY sort_order',
      [formId, tenantId],
    );
    return rows;
  },

  async deleteFields(formId, tenantId) {
    await pool.query('DELETE FROM diy_custom_field WHERE form_id = ? AND tenant_id = ?', [formId, tenantId]);
  },

  async batchInsertFields(tenantId, formId, fields) {
    if (!fields?.length) return;
    const sql = `INSERT INTO diy_custom_field
      (tenant_id, form_id, field_name, field_label, field_type, sort_order, is_required, is_visible,
       default_value, placeholder, options_json, validation_rules, linkage_conditions, linkage_action,
       masking_rule, masking_pattern, pc_col_span, mobile_col_span, css_class)
      VALUES ${fields.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(', ')}`;
    const vals = [];
    for (const f of fields) {
      vals.push(
        tenantId, formId, f.field_name || f.name, f.field_label || f.label, f.field_type || f.type,
        f.sort_order ?? 0, f.is_required ? 1 : 0, f.is_visible !== false ? 1 : 0,
        JSON.stringify(f.default_value ?? null), f.placeholder || null,
        JSON.stringify(f.options || f.options_json || null),
        JSON.stringify(f.validation_rules || null),
        JSON.stringify(f.linkage_conditions || null),
        f.linkage_action || 'show', f.masking_rule || null, f.masking_pattern || null,
        f.pc_col_span ?? 12, f.mobile_col_span ?? 12, f.css_class || null,
      );
    }
    await pool.query(sql, vals);
  },

  // ── 数据清理 ──
  async getFormsWithRetention() {
    const [rows] = await pool.query('SELECT id, data_retention_days FROM custom_form WHERE data_retention_days > 0');
    return rows;
  },

  async deleteExpiredSubmissions(formId, cutoff) {
    await pool.query('DELETE FROM custom_form_submission WHERE form_id = ? AND create_time < ?', [formId, cutoff]);
  },
};
