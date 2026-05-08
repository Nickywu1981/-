import { v4 as uuidv4 } from 'uuid';
import { tenantPool } from './tenantPool.js';

function pool() {
  return tenantPool();
}

export async function createTask({ userId, type, title, inputParams, priority = 1 }) {
  const id = uuidv4();
  await pool().execute(
    `INSERT INTO task (id, user_id, type, title, status, priority, input_params, progress, progress_msg)
     VALUES (?, ?, ?, ?, 0, ?, ?, 0, '排队中...')`,
    [id, userId, type, title, priority, JSON.stringify(inputParams)],
  );
  return id;
}

export async function getTask(taskId, userId) {
  const [rows] = await pool().execute(
    'SELECT * FROM task WHERE id = ? AND user_id = ? LIMIT 1',
    [taskId, userId],
  );
  if (rows[0]) {
    rows[0].input_params = safeJson(rows[0].input_params);
    rows[0].output_result = safeJson(rows[0].output_result);
  }
  return rows[0] || null;
}

export async function listUserTasks(userId, { status, type, page = 1, pageSize = 20 }) {
  let sql = 'SELECT id, type, title, status, priority, progress, progress_msg, error_msg, start_time, end_time, create_time FROM task WHERE user_id = ?';
  const params = [userId];

  if (status !== undefined && status !== '') {
    sql += ' AND status = ?';
    params.push(Number(status));
  }
  if (Array.isArray(type) && type.length > 0) {
    sql += ` AND type IN (${type.map(() => '?').join(',')})`;
    params.push(...type);
  } else if (type && !Array.isArray(type)) {
    sql += ' AND type = ?';
    params.push(type);
  }

  // mysql2 prepared statements don't support LIMIT placeholders — interpolate
  const offset = Number((page - 1) * pageSize);
  const limit = Number(pageSize);
  sql += ` ORDER BY create_time DESC LIMIT ${offset}, ${limit}`;

  const [rows] = await pool().execute(sql, params);
  return rows;
}

export async function countUserTasks(userId, { status, type } = {}) {
  let sql = 'SELECT COUNT(*) AS total FROM task WHERE user_id = ?';
  const params = [userId];
  if (status !== undefined && status !== '') {
    sql += ' AND status = ?';
    params.push(Number(status));
  }
  if (Array.isArray(type) && type.length > 0) {
    sql += ` AND type IN (${type.map(() => '?').join(',')})`;
    params.push(...type);
  } else if (type && !Array.isArray(type)) {
    sql += ' AND type = ?';
    params.push(type);
  }
  const [rows] = await pool().execute(sql, params);
  return rows[0].total;
}

export async function updateTaskStatus(taskId, userId, { status, progress, progressMsg, errorMsg, outputResult, workerId }) {
  const fields = [];
  const params = [];
  for (const [k, v] of Object.entries({ status, progress, progress_msg: progressMsg, error_msg: errorMsg, output_result: outputResult ? JSON.stringify(outputResult) : undefined, worker_id: workerId })) {
    if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (status === 1 && !fields.some((f) => f.startsWith('start_time'))) {
    fields.push('start_time = NOW()');
  }
  if (status === 2 || status === 3) {
    fields.push('end_time = NOW()');
  }
  if (fields.length === 0) return;
  params.push(taskId, userId);
  await pool().execute(`UPDATE task SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
}

export async function getPendingTasks(limit = 5) {
  const [rows] = await pool().execute(
    `SELECT * FROM task WHERE status = 0 ORDER BY priority DESC, create_time ASC LIMIT ${Number(limit)}`,
  );
  return rows.map((r) => ({ ...r, input_params: safeJson(r.input_params) }));
}

export async function completeTask(taskId, userId, { progressMsg = '完成', outputResult = {} }) {
  await updateTaskStatus(taskId, userId, { status: 2, progress: 100, progressMsg, outputResult });

  const task = await getTask(taskId, userId);
  if (task) {
    const { notifyComplete } = await import('../services/taskNotifier.js');
    notifyComplete(taskId, userId, { type: task.type, title: task.title, result: outputResult }).catch(() => {});
  }
}

function safeJson(v) {
  if (!v) return null;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; }
}
