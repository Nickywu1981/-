import db from './db.js';
import { parsePagination } from '../utils/pagination.js';

export async function search({ category, keyword, sort = 'download_count', page = 1, limit = 20 } = {}) {
  const { offset } = parsePagination({ page, pageSize: limit });
  let where = 'WHERE status = ?';
  const params = ['published'];
  if (category) { where += ' AND category = ?'; params.push(category); }
  if (keyword) { where += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  const ALLOWED_SORT = { rating: 'rating DESC', newest: 'created_at DESC', downloads: 'download_count DESC', default: 'download_count DESC' };
  const orderBy = ALLOWED_SORT[sort] || ALLOWED_SORT.default;
  const [rows] = await db.query(
    `SELECT id, user_id, title, description, category, price, preview_images, download_count, rating, created_at
     FROM template_marketplace ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM template_marketplace ${where}`, params,
  );
  return { list: rows, total, page, limit };
}

export async function getById(id) {
  const [rows] = await db.query('SELECT id, user_id, title, description, category, price, preview_images, download_count, rating, status, created_at, updated_at FROM template_marketplace WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function incrementDownload(id) {
  const [r] = await db.query('UPDATE template_marketplace SET download_count = download_count + 1 WHERE id = ?', [id]);
  return r.affectedRows;
}

export async function hasPurchased(userId, templateId) {
  const [rows] = await db.query(
    'SELECT id FROM template_market_purchases WHERE user_id = ? AND template_id = ?',
    [userId, templateId],
  );
  return rows.length > 0;
}

export async function recordPurchase(userId, templateId, price) {
  const [r] = await db.query(
    'INSERT IGNORE INTO template_market_purchases (user_id, template_id, price) VALUES (?, ?, ?)',
    [userId, templateId, price],
  );
  return r.affectedRows;
}

export async function create(userId, { title, description, category, price, previewImages }) {
  const [result] = await db.query(
    `INSERT INTO template_marketplace (user_id, title, description, category, price, preview_images, status)
     VALUES (?, ?, ?, ?, ?, ?, 'published')`,
    [userId, title, description, category, price, JSON.stringify(previewImages || [])],
  );
  return { id: result.insertId };
}
