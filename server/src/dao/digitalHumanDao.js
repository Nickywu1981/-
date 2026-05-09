import db from './db.js';

export default {
  async createJob(userId, { text, audioUrl, avatarStyle, background }) {
    const [result] = await db.query(
      `INSERT INTO digital_human_jobs (user_id, text, audio_url, avatar_style, background)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, text || null, audioUrl || null, avatarStyle, background],
    );
    return { id: result.insertId };
  },

  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT * FROM digital_human_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset],
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM digital_human_jobs WHERE user_id = ?', [userId],
    );
    return { list: rows, total, page, limit };
  },

  async updateStatus(id, status, outputUrl = null) {
    await db.query(
      'UPDATE digital_human_jobs SET status = ?, output_url = COALESCE(?, output_url) WHERE id = ?',
      [status, outputUrl, id],
    );
  },
};
