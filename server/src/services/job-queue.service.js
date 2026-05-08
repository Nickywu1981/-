/**
 * Movio AI v4.1 — Job Queue Service
 * G5 后端开发 | T-G5-009
 * 异步任务队列: 提交 → Worker消费 → 进度更新 → 完成/失败
 * W1 使用 MySQL 轮询 (后续可选 Redis Queue/RabbitMQ)
 */
import db from '../dao/db.js';

/**
 * 提交任务
 */
export async function submitJob(userId, taskType, taskParams, options = {}) {
  const conn = await db.getConnection();
  try {
    const [result] = await conn.query(
      `INSERT INTO job_queue (user_id, task_type, task_params, status, priority, scheduled_at)
       VALUES (?, ?, ?, 'queued', ?, ?)`,
      [userId, taskType, JSON.stringify(taskParams), options.priority || 5, options.scheduledAt || null],
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
    if (rows.length === 0) throw { status: 404, message: '任务不存在' };
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
    await conn.query(
      'UPDATE job_queue SET status = ?, progress = 100, result_data = ?, completed_at = NOW() WHERE id = ?',
      ['completed', JSON.stringify(resultData), jobId],
    );
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
    const [rows] = await conn.query('SELECT retry_count, max_retries FROM job_queue WHERE id = ?', [jobId]);
    if (rows.length === 0) return;

    const { retry_count, max_retries } = rows[0];
    if (retry_count < max_retries) {
      // 重新排队重试
      await conn.query(
        'UPDATE job_queue SET status = ?, retry_count = retry_count + 1, error_message = ? WHERE id = ?',
        ['queued', errorMessage, jobId],
      );
    } else {
      // 彻底失败
      await conn.query(
        'UPDATE job_queue SET status = ?, error_message = ?, completed_at = NOW() WHERE id = ?',
        ['failed', errorMessage, jobId],
      );
    }
  } finally {
    conn.release();
  }
}
