import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

const FAQ_COLS = ['question', 'answer', 'category', 'sort', 'status'];

function pickAllowed(data, allowed) {
  const out = {};
  for (const k of allowed) { if (data[k] !== undefined) out[k] = data[k]; }
  return out;
}

export async function listFaqs({ keyword, page = 1, pageSize = 50 } = {}) {
  const { offset } = parsePagination({ page, pageSize });
  let where = 'WHERE status = 1';
  const params = [];
  if (keyword) {
    where += ' AND (question LIKE ? OR answer LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  params.push(pageSize, offset);
  const [rows] = await pool.query(`SELECT id, question, answer, category, sort, status, tenant_id, created_at, updated_at FROM help_faq ${where} ORDER BY sort ASC, id DESC LIMIT ? OFFSET ?`, params);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM help_faq ${where}`, params);
  return { list: rows, total };
}

export async function getFaqById(id) {
  const [rows] = await pool.query('SELECT id, question, answer, category, sort, status, tenant_id, created_at, updated_at FROM help_faq WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function insertFaq(data) {
  const [result] = await pool.query('INSERT INTO help_faq SET ?', pickAllowed(data, FAQ_COLS));
  return result.insertId;
}

export async function updateFaq(id, data) {
  const [result] = await pool.query('UPDATE help_faq SET ? WHERE id = ?', [pickAllowed(data, FAQ_COLS), id]);
  return result.affectedRows;
}

export async function deleteFaq(id) {
  const [result] = await pool.query('DELETE FROM help_faq WHERE id = ?', [id]);
  return result.affectedRows;
}
