/**
 * 工作流 — DAO
 */
import pool from './db.js';

const T = (name) => `workflow_${name}`;

// ─── 模板 ───
export async function listTemplates({ status } = {}) {
  let sql = `SELECT * FROM ${T('template')} WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY updated_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getTemplate(id) {
  const [rows] = await pool.execute(`SELECT * FROM ${T('template')} WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function createTemplate({ name, description, steps, status = 'draft', createdBy }) {
  const [result] = await pool.execute(
    `INSERT INTO ${T('template')} (name, description, steps, status, created_by) VALUES (?, ?, ?, ?, ?)`,
    [name, description, JSON.stringify(steps), status, createdBy || null],
  );
  return result.insertId;
}

export async function updateTemplate(id, { name, description, steps, status }) {
  const fields = []; const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (steps !== undefined) { fields.push('steps = ?'); params.push(JSON.stringify(steps)); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (!fields.length) return false;
  params.push(id);
  const [result] = await pool.execute(`UPDATE ${T('template')} SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

export async function deleteTemplate(id) {
  const [result] = await pool.execute(`DELETE FROM ${T('template')} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

// ─── 执行记录 ───
export async function createJob({ templateId, templateName, userId, inputData }) {
  const [result] = await pool.execute(
    `INSERT INTO ${T('job')} (template_id, template_name, user_id, status, input_data) VALUES (?, ?, ?, 'pending', ?)`,
    [templateId || null, templateName || null, userId, JSON.stringify(inputData || {})],
  );
  return result.insertId;
}

export async function updateJobStatus(id, { status, progress, outputData, stepResults, errorMessage }) {
  const updates = []; const params = [];
  if (status !== undefined) {
    updates.push('status = ?'); params.push(status);
    if (status === 'running') updates.push('started_at = NOW()');
    if (['completed', 'failed', 'cancelled'].includes(status)) updates.push('completed_at = NOW()');
  }
  if (progress !== undefined) { updates.push('progress = ?'); params.push(progress); }
  if (outputData !== undefined) { updates.push('output_data = ?'); params.push(JSON.stringify(outputData)); }
  if (stepResults !== undefined) { updates.push('step_results = ?'); params.push(JSON.stringify(stepResults)); }
  if (errorMessage !== undefined) { updates.push('error_message = ?'); params.push(errorMessage?.substring(0, 1000)); }
  if (!updates.length) return false;
  params.push(id);
  const [result] = await pool.execute(`UPDATE ${T('job')} SET ${updates.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

export async function getJob(id) {
  const [rows] = await pool.execute(`SELECT * FROM ${T('job')} WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function listJobsByUser(userId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ${T('job')} WHERE user_id = ?`, [userId]);
  const [rows] = await pool.execute(
    `SELECT * FROM ${T('job')} WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, String(pageSize), String(offset)],
  );
  return { list: rows, total, page, pageSize };
}

export async function cancelJob(id) {
  return updateJobStatus(id, { status: 'cancelled' });
}
