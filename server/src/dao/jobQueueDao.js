/**
 * Job Queue DAO — 异步任务队列数据访问层
 * G6 Backend-B | 2026-05-14
 *
 * 所有 job_queue 表 SQL 集中于此，Service 层禁写 SQL。
 */
import pool from './db.js';

const TABLE = 'job_queue';

// ==================== 写入操作 ====================

export async function insertJob(userId, taskType, taskParams, options = {}) {
  const [result] = await pool.query(
    `INSERT INTO ?? (user_id, task_type, task_params, status, priority, scheduled_at, max_retries)
     VALUES (?, ?, ?, 'queued', ?, ?, ?)`,
    [TABLE, userId, taskType, JSON.stringify(taskParams), options.priority || 5, options.scheduledAt || null, options.maxRetries ?? 3],
  );
  return result.insertId;
}

export async function updateProgress(jobId, progress) {
  await pool.query('UPDATE ?? SET progress = ? WHERE id = ?', [TABLE, Math.min(progress, 100), jobId]);
}

export async function completeJob(jobId, resultData) {
  const [result] = await pool.query(
    'UPDATE ?? SET status = ?, progress = 100, result_data = ?, completed_at = NOW() WHERE id = ? AND status = ?',
    [TABLE, 'completed', JSON.stringify(resultData), jobId, 'processing'],
  );
  return result.affectedRows;
}

export async function failJob(jobId, errorMessage) {
  const [result] = await pool.query(
    `UPDATE ??
     SET status = CASE WHEN retry_count < max_retries THEN 'queued' ELSE 'failed' END,
         retry_count = retry_count + 1,
         error_message = ?,
         completed_at = CASE WHEN retry_count >= max_retries THEN NOW() ELSE completed_at END
     WHERE id = ? AND status = 'processing'`,
    [TABLE, errorMessage, jobId],
  );
  return result.affectedRows;
}

export async function cancelJobById(jobId) {
  await pool.query("UPDATE ?? SET status = 'cancelled', completed_at = NOW() WHERE id = ?", [TABLE, jobId]);
}

export async function retryJobById(jobId) {
  await pool.query(
    "UPDATE ?? SET status = 'queued', retry_count = 0, error_message = NULL, completed_at = NULL WHERE id = ?",
    [TABLE, jobId],
  );
}

export async function updatePriority(jobId, priority) {
  await pool.query('UPDATE ?? SET priority = ? WHERE id = ?', [TABLE, priority, jobId]);
}

export async function recoverStuckJobs(timeoutMinutes = 10) {
  const [result] = await pool.query(
    'UPDATE ?? SET status = ?, error_message = ? WHERE status = ? AND started_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)',
    [TABLE, 'queued', 'Worker timeout recovery', 'processing', timeoutMinutes],
  );
  return result.affectedRows;
}

// ==================== 查询操作 ====================

export async function findJobById(jobId, userId) {
  const [rows] = await pool.query(
    'SELECT id, user_id, task_type, status, progress, result_data, error_message, retry_count, created_at, started_at, completed_at FROM ?? WHERE id = ? AND user_id = ?',
    [TABLE, jobId, userId],
  );
  return rows[0] || null;
}

export async function findJobByIdOnly(jobId) {
  const [rows] = await pool.query(
    'SELECT id, user_id, task_type, task_params, status, progress, result_data, error_message, retry_count, max_retries, priority, scheduled_at, created_at, started_at, completed_at, updated_at FROM ?? WHERE id = ?',
    [TABLE, jobId],
  );
  return rows[0] || null;
}

export async function findUserJobs(userId, { status, page = 1, pageSize = 20 } = {}) {
  let where = 'WHERE user_id = ?';
  const params = [userId];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ?? ${where}`, [TABLE, ...params]);
  const [rows] = await pool.query(
    `SELECT id, task_type, status, progress, result_data, error_message, created_at, completed_at
     FROM ?? ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [TABLE, ...params, pageSize, (page - 1) * pageSize],
  );

  return { list: rows, total, page, pageSize };
}

export async function findUserJobsByTypes(userId, taskTypes, { status, page = 1, pageSize = 20 } = {}) {
  let where = 'WHERE user_id = ? AND task_type IN (?)';
  const params = [userId, taskTypes];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ?? ${where}`, [TABLE, ...params]);
  const [rows] = await pool.query(
    `SELECT id, task_type, status, progress, result_data, error_message, created_at, completed_at
     FROM ?? ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [TABLE, ...params, pageSize, (page - 1) * pageSize],
  );

  return { list: rows, total, page, pageSize };
}

export async function findChildJobsByBatchId(jobId) {
  const [rows] = await pool.query(
    "SELECT id, status, progress, result_data FROM ?? WHERE task_type = 'action_migrate' AND JSON_EXTRACT(task_params, '$.batch_id') = ?",
    [TABLE, String(jobId)],
  );
  return rows;
}

export async function getQueueStats() {
  const [[{ queued }], [{ processing }], [{ completed }], [{ failed }]] = await Promise.all([
    pool.query("SELECT COUNT(*) AS queued FROM ?? WHERE status = 'queued'", [TABLE]),
    pool.query("SELECT COUNT(*) AS processing FROM ?? WHERE status = 'processing'", [TABLE]),
    pool.query("SELECT COUNT(*) AS completed FROM ?? WHERE status = 'completed' AND updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)", [TABLE]),
    pool.query("SELECT COUNT(*) AS failed FROM ?? WHERE status = 'failed' AND updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)", [TABLE]),
  ]);
  return {
    queued: queued || 0,
    processing: processing || 0,
    completedRecent: completed || 0,
    failedRecent: failed || 0,
  };
}

// ==================== 事务操作 ====================

/**
 * Worker 拉取待处理任务（SELECT FOR UPDATE + UPDATE status，需事务）
 */
export async function fetchPendingTasks(limit = 5) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, user_id, task_type, task_params, retry_count, max_retries
       FROM ?? WHERE status = 'queued' AND (scheduled_at IS NULL OR scheduled_at <= NOW())
       ORDER BY priority ASC, created_at ASC LIMIT ? FOR UPDATE`,
      [TABLE, limit],
    );

    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      await conn.query(
        "UPDATE ?? SET status = 'processing', started_at = NOW() WHERE id IN (?)",
        [TABLE, ids],
      );
    }

    await conn.commit();
    return rows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * 取消任务（SELECT FOR UPDATE 锁行 + UPDATE，需事务）
 */
export async function cancelJobWithLock(jobId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT id, status FROM ?? WHERE id = ? AND user_id = ? FOR UPDATE',
      [TABLE, jobId, userId],
    );
    if (rows.length === 0) {
      await conn.rollback();
      return null;
    }
    const job = rows[0];
    if (!['queued', 'processing'].includes(job.status)) {
      await conn.rollback();
      return { ...job, cancellable: false };
    }
    await conn.query(
      "UPDATE ?? SET status = 'cancelled', completed_at = NOW() WHERE id = ?",
      [TABLE, jobId],
    );
    await conn.commit();
    return { ...job, cancellable: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
