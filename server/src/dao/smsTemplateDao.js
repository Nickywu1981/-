import pool from './db.js';

export async function listTemplates() {
  const [rows] = await pool.execute(
    'SELECT id, template_code, name, content, params_count, provider_template_id, provider, status, remark, create_time FROM sms_template ORDER BY id LIMIT 200',
  );
  return rows;
}

export async function findByCode(templateCode) {
  const [rows] = await pool.execute(
    'SELECT * FROM sms_template WHERE template_code = ? AND status = 1 LIMIT 1',
    [templateCode],
  );
  return rows[0] || null;
}

export async function updateTemplate(id, fields) {
  const sets = [];
  const params = [];
  const allowed = ['name', 'content', 'provider_template_id', 'provider', 'status', 'remark'];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k) && v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (sets.length === 0) return null;
  params.push(id);
  await pool.execute(`UPDATE sms_template SET ${sets.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.execute('SELECT * FROM sms_template WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function insertTemplate(fields) {
  const [result] = await pool.execute(
    'INSERT INTO sms_template (template_code, name, content, provider_template_id, provider, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [fields.template_code, fields.name, fields.content, fields.provider_template_id || '', fields.provider || 'mock', fields.status ?? 1, fields.remark || ''],
  );
  return result.insertId;
}

export async function deleteTemplate(id) {
  const [r] = await pool.execute('DELETE FROM sms_template WHERE id = ?', [id]);
  return r.affectedRows;
}
