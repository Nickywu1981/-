import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

export async function insertLog({ templateCode, phone, params, content, result, provider }) {
  const [r] = await pool.execute(
    'INSERT INTO sms_log (template_code, phone, params, content, result, provider) VALUES (?, ?, ?, ?, ?, ?)',
    [templateCode, phone, JSON.stringify(params), content, result ? 1 : 0, provider],
  );
  return r.insertId;
}

export async function listLogs({ page = 1, pageSize = 30, phone, result, startDate, endDate }) {
  let sql = 'SELECT id, template_code, phone, content, result, provider, create_time FROM sms_log WHERE 1=1';
  const params = [];
  const { offset } = parsePagination({ page, pageSize });
  if (phone) { sql += ' AND phone LIKE ?'; params.push(`%${phone}%`); }
  if (result !== undefined && result !== '') { sql += ' AND result = ?'; params.push(Number(result)); }
  if (startDate) { sql += ' AND create_time >= ?'; params.push(startDate); }
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      sql += ' AND create_time <= ?';
      params.push(end);
    }
  }
  params.push(offset, pageSize);
  sql += ' ORDER BY create_time DESC LIMIT ?, ?';

  const [rows] = await pool.execute(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM sms_log WHERE 1=1';
  const countParams = [];
  if (phone) { countSql += ' AND phone LIKE ?'; countParams.push(`%${phone}%`); }
  if (result !== undefined && result !== '') { countSql += ' AND result = ?'; countParams.push(Number(result)); }
  if (startDate) { countSql += ' AND create_time >= ?'; countParams.push(startDate); }
  if (endDate) { countSql += ' AND create_time <= ?'; countParams.push(endDate + ' 23:59:59'); }

  const [[{ total }]] = await pool.execute(countSql, countParams);
  return { list: rows, total };
}

export async function countByPhoneLastHour(phone) {
  const [[{ cnt }]] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM sms_log WHERE phone = ? AND create_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
    [phone],
  );
  return cnt;
}

export async function countByPhoneToday(phone) {
  const [[{ cnt }]] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM sms_log WHERE phone = ? AND create_time > CURDATE()',
    [phone],
  );
  return cnt;
}
