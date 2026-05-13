import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';

/**
 * Movio AI v4.1 — Job Queue Service
 * G5 后端开发 | T-G5-009
 * 异步任务队列: 提交 → Worker消费 → 进度更新 → 完成/失败
 * W1 使用 MySQL 轮询 (后续可选 Redis Queue/RabbitMQ)
 */
import db from '../dao/db.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 提交任务
 */
export async function submitJob(userId, taskType, taskParams, options = {}) {
  const conn = await db.getConnection();
  try {
    const [result] = await conn.query(
      `INSERT INTO job_queue (user_id, task_type, task_params, status, priority, scheduled_at, max_retries)
       VALUES (?, ?, ?, 'queued', ?, ?, ?)`,
      [userId, taskType, JSON.stringify(taskParams), options.priority || 5, options.scheduledAt || null, options.maxRetries ?? 3],
    );
    return { job_id: result.insertId, status: 'queued' };
  } finally {
    conn.release();
  }
}

/**
 * 查询任务状态
 */
export async function getJobStatus(jobId, userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, user_id, task_type, status, progress, result_data, error_message, retry_count, created_at, started_at, completed_at FROM job_queue WHERE id = ? AND user_id = ?',
      [jobId, userId],
    );
    if (rows.length === 0) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
    return rows[0];
  } finally {
    conn.release();
  }
}

/**
 * 查询用户任务列表
 */
export async function getUserJobs(userId, { status, page = 1, pageSize = 20 } = {}) {
  const conn = await db.getConnection();
  try {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM job_queue ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await conn.query(
      `SELECT id, task_type, status, progress, result_data, error_message, created_at, completed_at
       FROM job_queue ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    );

    return { list: rows, total, page, pageSize };
  } finally {
    conn.release();
  }
}

/**
 * Worker 拉取待处理任务
 */
export async function fetchPending(limit = 5) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, user_id, task_type, task_params, retry_count, max_retries
       FROM job_queue WHERE status = 'queued' AND (scheduled_at IS NULL OR scheduled_at <= NOW())
       ORDER BY priority ASC, created_at ASC LIMIT ? FOR UPDATE`,
      [limit],
    );

    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      await conn.query(
        'UPDATE job_queue SET status = \'processing\', started_at = NOW() WHERE id IN (?)',
        [ids],
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
 * 更新任务进度
 */
export async function updateProgress(jobId, progress) {
  const conn = await db.getConnection();
  try {
    await conn.query('UPDATE job_queue SET progress = ? WHERE id = ?', [Math.min(progress, 100), jobId]);
  } finally {
    conn.release();
  }
}

/**
 * 完成任务
 */
export async function completeJob(jobId, resultData) {
  const conn = await db.getConnection();
  try {
    const [result] = await conn.query(
      'UPDATE job_queue SET status = ?, progress = 100, result_data = ?, completed_at = NOW() WHERE id = ? AND status = ?',
      ['completed', JSON.stringify(resultData), jobId, 'processing'],
    );
    if (result.affectedRows === 0) {
      // 任务可能已被 recoverStuckJobs 重置或已取消
      logger.warn(`[JobQueue] completeJob #${jobId} 状态已变更，跳过覆盖`);
    }
  } finally {
    conn.release();
  }
}

/**
 * 取消任务 (仅 queued / processing 状态可取消)
 */
export async function cancelJob(jobId, userId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT id, status FROM job_queue WHERE id = ? AND user_id = ? FOR UPDATE',
      [jobId, userId],
    );
    if (rows.length === 0) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
    if (!['queued', 'processing'].includes(rows[0].status)) {
      throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Status ${rows[0].status} cannot be cancelled`);
    }
    await conn.query(
      "UPDATE job_queue SET status = 'cancelled', completed_at = NOW() WHERE id = ?",
      [jobId],
    );
    await conn.commit();
    return { job_id: jobId, status: 'cancelled' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * 手动重试失败任务
 */
export async function retryJob(jobId, userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, status FROM job_queue WHERE id = ? AND user_id = ?',
      [jobId, userId],
    );
    if (rows.length === 0) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
    if (!['failed', 'cancelled'].includes(rows[0].status)) {
      throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Status ${rows[0].status} cannot be retried`);
    }
    await conn.query(
      "UPDATE job_queue SET status = 'queued', retry_count = 0, error_message = NULL, completed_at = NULL WHERE id = ?",
      [jobId],
    );
    return { job_id: jobId, status: 'queued' };
  } finally {
    conn.release();
  }
}

/**
 * 任务失败 (含重试逻辑)
 */
export async function failJob(jobId, errorMessage) {
  const conn = await db.getConnection();
  try {
    // 原子操作：仅处理 processing 状态，避免竞态覆盖
    const [result] = await conn.query(
      `UPDATE job_queue
       SET status = CASE WHEN retry_count < max_retries THEN 'queued' ELSE 'failed' END,
           retry_count = retry_count + 1,
           error_message = ?,
           completed_at = CASE WHEN retry_count >= max_retries THEN NOW() ELSE completed_at END
       WHERE id = ? AND status = 'processing'`,
      [errorMessage, jobId],
    );
    if (result.affectedRows === 0) {
      logger.warn(`[JobQueue] failJob #${jobId} 非 processing 状态，跳过`);
    }
  } finally {
    conn.release();
  }
}

/**
 * 恢复卡住任务（Worker 崩溃后残留 processing → queued）
 */
export async function recoverStuckJobs(timeoutMinutes = 10) {
  const conn = await db.getConnection();
  try {
    const [result] = await conn.query(
      'UPDATE job_queue SET status = ?, error_message = ? WHERE status = ? AND started_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)',
      ['queued', 'Worker timeout recovery', 'processing', timeoutMinutes],
    );
    return result.affectedRows;
  } finally {
    conn.release();
  }
}

// ─── 别名 + 扩展方法 ───

export async function updateJobPriority(jobId, priority) {
  const conn = await db.getConnection();
  try {
    await conn.query('UPDATE job_queue SET priority = ? WHERE id = ?', [priority, jobId]);
    return true;
  } finally {
    conn.release();
  }
}

export async function listJobs(userId, { status, page = 1, limit = 20 } = {}) {
  return getUserJobs(userId, { status, page, pageSize: limit });
}

export async function getJob(jobId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM job_queue WHERE id = ?', [jobId]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

export async function getQueueStats() {
  const conn = await db.getConnection();
  try {
    const [[{ queued }], [{ processing }], [{ completed }], [{ failed }]] = await Promise.all([
      conn.query("SELECT COUNT(*) AS queued FROM job_queue WHERE status = 'queued'"),
      conn.query("SELECT COUNT(*) AS processing FROM job_queue WHERE status = 'processing'"),
      conn.query("SELECT COUNT(*) AS completed FROM job_queue WHERE status = 'completed' AND updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"),
      conn.query("SELECT COUNT(*) AS failed FROM job_queue WHERE status = 'failed' AND updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"),
    ]);
    return {
      queued: queued?.queued || 0,
      processing: processing?.processing || 0,
      completedRecent: completed?.completed || 0,
      failedRecent: failed?.failed || 0,
    };
  } finally {
    conn.release();
  }
}
