import db from './db.js';

export default {
  async search({ category, keyword, sort = 'download_count', page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE status = ?';
    const params = ['published'];
    if (category) { where += ' AND category = ?'; params.push(category); }
    if (keyword) { where += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const orderBy = sort === 'rating' ? 'rating DESC' : sort === 'newest' ? 'created_at DESC' : 'download_count DESC';
    const [rows] = await db.query(
      `SELECT id, user_id, title, description, category, price, preview_images, download_count, rating, created_at
       FROM template_marketplace ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM template_marketplace ${where}`, params,
    );
    return { list: rows, total, page, limit };
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM template_marketplace WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async incrementDownload(id) {
    const [r] = await db.query('UPDATE template_marketplace SET download_count = download_count + 1 WHERE id = ?', [id]);
    return r.affectedRows;
  },

  async hasPurchased(userId, templateId) {
    const [rows] = await db.query(
      'SELECT id FROM template_market_purchases WHERE user_id = ? AND template_id = ?',
      [userId, templateId],
    );
    return rows.length > 0;
  },

  async recordPurchase(userId, templateId, price) {
    const [r] = await db.query(
      'INSERT IGNORE INTO template_market_purchases (user_id, template_id, price) VALUES (?, ?, ?)',
      [userId, templateId, price],
    );
    return r.affectedRows;
  },

  async create(userId, { title, description, category, price, previewImages }) {
    const [result] = await db.query(
      `INSERT INTO template_marketplace (user_id, title, description, category, price, preview_images, status)
       VALUES (?, ?, ?, ?, ?, ?, 'published')`,
      [userId, title, description, category, price, JSON.stringify(previewImages || [])],
    );
    return { id: result.insertId };
  },
};
