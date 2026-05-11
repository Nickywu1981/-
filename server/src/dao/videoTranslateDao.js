import db from './db.js';

export default {
  async createJob(userId, taskType, { videoUrl, sourceLang, targetLang, extraConfig }) {
    const [result] = await db.query(
      `INSERT INTO video_translate_jobs (user_id, task_type, video_url, source_lang, target_lang, extra_config)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, taskType, videoUrl, sourceLang, targetLang, JSON.stringify(extraConfig || {})],
    );
    return { id: result.insertId };
  },

  async findByUser(userId, { taskType, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM video_translate_jobs WHERE user_id = ?';
    const params = [userId];
    if (taskType) { sql += ' AND task_type = ?'; params.push(taskType); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await db.query(sql, params);
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM video_translate_jobs WHERE user_id = ?' + (taskType ? ' AND task_type = ?' : ''),
      taskType ? [userId, taskType] : [userId],
    );
    return { list: rows, total, page, limit };
  },

  async updateStatus(id, userId, status, outputUrl = null, errorMsg = null) {
    const [r] = await db.query(
      'UPDATE video_translate_jobs SET status = ?, output_url = COALESCE(?, output_url), error_msg = COALESCE(?, error_msg) WHERE id = ? AND user_id = ?',
      [status, outputUrl, errorMsg, id, userId],
    );
    return r.affectedRows;
  },
};
