import pool from './db.js';

export default {
  async listTasks(userId, tenantId, limit = 50) {
    const [rows] = await pool.query(
      'SELECT at.*, aa.platform, aa.store_name FROM automation_task at LEFT JOIN automation_account aa ON at.account_id = aa.id WHERE at.user_id = ? AND at.tenant_id = ? ORDER BY at.create_time DESC LIMIT ?',
      [userId, tenantId, limit],
    );
    return rows;
  },

  async getTaskById(id) {
    const [rows] = await pool.query('SELECT * FROM automation_task WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createTask(data) {
    const [r] = await pool.query(
      'INSERT INTO automation_task (tenant_id, user_id, account_id, task_type, task_config) VALUES (?, ?, ?, ?, ?)',
      [data.tenantId, data.userId, data.accountId || null, data.taskType, data.taskConfig || null],
    );
    return r.insertId;
  },

  async updateTaskStatus(id, status, extra = {}) {
    const sets = ['status = ?'], vals = [status];
    if (extra.startTime) { sets.push('start_time = NOW()'); }
    if (extra.endTime) { sets.push('end_time = NOW()'); }
    if (extra.resultJson) { sets.push('result_json = ?'); vals.push(extra.resultJson); }
    if (extra.screenshotUrl) { sets.push('screenshot_url = ?'); vals.push(extra.screenshotUrl); }
    if (extra.errorMsg) { sets.push('error_msg = ?'); vals.push(extra.errorMsg); }
    vals.push(id);
    await pool.query(`UPDATE automation_task SET ${sets.join(', ')} WHERE id = ?`, vals);
  },

  async cancelTask(id, userId) {
    const [r] = await pool.query('UPDATE automation_task SET status = 4 WHERE id = ? AND user_id = ? AND status IN (0, 1)', [id, userId]);
    return r.affectedRows > 0;
  },

  // Account management
  async listAccounts(userId, tenantId) {
    const [rows] = await pool.query('SELECT id, platform, store_name, username, status, last_login, create_time FROM automation_account WHERE user_id = ? AND tenant_id = ?', [userId, tenantId]);
    return rows;
  },

  async createAccount(data) {
    const [r] = await pool.query(
      'INSERT INTO automation_account (tenant_id, user_id, platform, store_name, username, encrypted_password) VALUES (?, ?, ?, ?, ?, ?)',
      [data.tenantId, data.userId, data.platform, data.storeName || null, data.username, data.encryptedPassword],
    );
    return r.insertId;
  },

  async deleteAccount(id, userId) {
    await pool.query('DELETE FROM automation_account WHERE id = ? AND user_id = ?', [id, userId]);
  },

  // Admin: list all
  async listAllTasks(limit = 200) {
    const [rows] = await pool.query('SELECT * FROM automation_task ORDER BY create_time DESC LIMIT ?', [limit]);
    return rows;
  },
};
