/**
 * Publish DAO — 多平台内容分发 SQL 层
 * G6 Backend-B | 2026-05-15
 *
 * 事务方法接受 conn 参数由 Service 层管理连接生命周期。
 */
import pool from './db.js';

const TABLE = 'publish_record';

export async function validateAsset(conn, workId, userId) {
  const [rows] = await conn.query(
    'SELECT id, file_url, file_type, file_size FROM assets WHERE id = ? AND user_id = ?',
    [workId, userId],
  );
  return rows[0] || null;
}

export async function insertRecords(conn, records) {
  const values = records.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = [];
  for (const r of records) {
    params.push(
      r.batchId, r.userId, r.assetId, r.platform, r.platformName, r.status,
      r.title || '', r.description || '', JSON.stringify(r.tags || []), r.contentUrl,
      r.scheduledAt || null,
    );
  }
  const [result] = await conn.query(
    `INSERT INTO ?? (batch_id, user_id, asset_id, platform, platform_name, status,
       title, description, tags, content_url, scheduled_at)
     VALUES ${values}`,
    [TABLE, ...params],
  );
  return result.insertId;
}

export async function findBatchByBatchId(batchId, userId) {
  const [rows] = await pool.query(
    `SELECT pr.*, a.file_url, a.file_type, a.thumbnail_url
     FROM ?? pr LEFT JOIN assets a ON a.id = pr.asset_id
     WHERE pr.batch_id = ? AND pr.user_id = ?
     ORDER BY pr.created_at DESC`,
    [TABLE, batchId, userId],
  );
  return rows;
}

export async function findRecordById(recordId, userId) {
  const [rows] = await pool.query(
    'SELECT id, batch_id, user_id, asset_id, platform, platform_name, status, title, description, tags, content_url, scheduled_at, retry_count, error_msg, created_at, updated_at FROM ?? WHERE id = ? AND user_id = ? LIMIT 1',
    [TABLE, recordId, userId],
  );
  return rows[0] || null;
}

export async function updateStatusToPending(recordId) {
  await pool.query(
    "UPDATE ?? SET status = 'pending', retry_count = retry_count + 1, error_msg = NULL, updated_at = NOW() WHERE id = ?",
    [TABLE, recordId],
  );
}

export async function listHistory(userId, { page = 1, pageSize = 20, status, platform } = {}) {
  const conditions = ['pr.user_id = ?'];
  const params = [userId];
  if (status) { conditions.push('pr.status = ?'); params.push(status); }
  if (platform) { conditions.push('pr.platform = ?'); params.push(platform); }

  const where = conditions.join(' AND ');

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ?? pr WHERE ${where}`,
    [TABLE, ...params],
  );
  const [rows] = await pool.query(
    `SELECT pr.*, a.file_url, a.thumbnail_url, a.file_type
     FROM ?? pr LEFT JOIN assets a ON a.id = pr.asset_id
     WHERE ${where} ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`,
    [TABLE, ...params, pageSize, (page - 1) * pageSize],
  );
  return { list: rows, total, page, pageSize };
}

export async function getStats(userId) {
  const [[stats]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) AS inProgress,
       SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled
     FROM ?? WHERE user_id = ?`,
    [TABLE, userId],
  );
  return stats;
}
