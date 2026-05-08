import pool from './db.js';

const jobQueueDao = {
  async create(data) {
    const sql = `INSERT INTO job_queue (user_id, job_type, priority, status, input_data, created_at)
                 VALUES (?, ?, ?, 'pending', ?, NOW())`;
    const [r] = await pool.execute(sql, [data.user_id, data.job_type, data.priority || 0, JSON.stringify(data.input_data)]);
    return r.insertId;
  },

  async findById(id, userId) {
    const sql = 'SELECT * FROM job_queue WHERE id = ?' + (userId ? ' AND user_id = ?' : '');
    const params = userId ? [id, userId] : [id];
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  async listByUser(userId, { status, jobType, limit = 20, offset = 0 } = {}) {
    const where = ['user_id = ?'];
    const params = [userId];
    if (status) { where.push('status = ?'); params.push(status); }
    if (jobType) { where.push('job_type = ?'); params.push(jobType); }
    const sql = `SELECT * FROM job_queue WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM job_queue WHERE ${where.join(' AND ')}`, params);
    return { rows, total: countResult[0].total };
  },

  async countPendingByUser(userId) {
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM job_queue WHERE user_id = ? AND status IN (?, ?)', [userId, 'pending', 'processing']);
    return rows[0].cnt;
  },

  async updateStatus(id, status, extra = {}) {
    const sets = ['status = ?'];
    const params = [status];
    if (extra.progress !== undefined) { sets.push('progress = ?'); params.push(extra.progress); }
    if (extra.error_message) { sets.push('error_message = ?'); params.push(extra.error_message); }
    if (extra.result_data) { sets.push('result_data = ?'); params.push(JSON.stringify(extra.result_data)); }
    if (extra.completed_at) { sets.push('completed_at = ?'); params.push(extra.completed_at); }
    params.push(id);
    await pool.execute(`UPDATE job_queue SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async updateProgress(id, progress) {
    await pool.execute('UPDATE job_queue SET progress = ? WHERE id = ?', [progress, id]);
  },

  async claimNext(jobType) {
    const sql = 'SELECT id, priority, input_data FROM job_queue WHERE status = ? AND job_type = ? ORDER BY priority DESC, created_at ASC LIMIT 1';
    const [rows] = await pool.execute(sql, ['pending', jobType]);
    return rows[0] || null;
  },

  async markFailed(id, error, retryCount) {
    const newStatus = retryCount >= 3 ? 'failed' : 'pending';
    await pool.execute(
      'UPDATE job_queue SET status = ?, retry_count = retry_count + 1, error_message = ? WHERE id = ?',
      [newStatus, error, id]
    );
  },
};

export default jobQueueDao;
