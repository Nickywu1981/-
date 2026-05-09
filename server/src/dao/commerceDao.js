import pool from './db.js';

// ==================== 会员套餐更新 ====================

export async function updateMembership(userId, planType, credits, endTime) {
  await pool.execute(
    'UPDATE user_membership SET plan_type = ?, credit_balance = credit_balance + ?, start_time = COALESCE(start_time, NOW()), end_time = ?, update_time = NOW() WHERE user_id = ?',
    [planType, credits, endTime, userId],
  );
}

export async function renewMembership(userId, planType, endTime) {
  await pool.execute(
    'UPDATE user_membership SET plan_type = ?, end_time = ?, update_time = NOW() WHERE user_id = ?',
    [planType, endTime, userId],
  );
}

// ==================== 账单查询 ====================

export async function getBillingHistory(userId, offset, pageSize) {
  const [rows] = await pool.query(
    `SELECT id, action, credit_before, credit_after, consumed, remark, create_time
     FROM consumption_record WHERE user_id = ? AND type IN (2, 3)
     ORDER BY create_time DESC LIMIT ?, ?`,
    [userId, offset, pageSize],
  );
  return rows;
}

export async function countBillingHistory(userId) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM consumption_record WHERE user_id = ? AND type IN (2, 3)',
    [userId],
  );
  return total;
}

// ==================== 仪表盘统计 ====================

export async function getDashboardStats() {
  const [[{ userCount }]] = await pool.execute('SELECT COUNT(*) AS userCount FROM user WHERE is_deleted = 0');
  const [[{ taskCount }]] = await pool.execute('SELECT COUNT(*) AS taskCount FROM task');
  const [[{ todayTaskCount }]] = await pool.execute(
    'SELECT COUNT(*) AS todayTaskCount FROM task WHERE DATE(create_time) = CURDATE()',
  );
  const [[{ paidUserCount }]] = await pool.execute(
    'SELECT COUNT(*) AS paidUserCount FROM user_membership WHERE plan_type > 0',
  );
  const [[{ totalRevenue }]] = await pool.execute(
    'SELECT COALESCE(SUM(consumed), 0) AS totalRevenue FROM consumption_record WHERE type = 3',
  );

  const [taskTrend] = await pool.execute(
    `SELECT DATE(create_time) AS date, COUNT(*) AS count FROM task
     WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(create_time) ORDER BY date`,
  );
  const [userTrend] = await pool.execute(
    `SELECT DATE(create_time) AS date, COUNT(*) AS count FROM user
     WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND is_deleted = 0 GROUP BY DATE(create_time) ORDER BY date`,
  );
  const [revenueTrend] = await pool.execute(
    `SELECT DATE(create_time) AS date, COALESCE(SUM(consumed), 0) AS amount FROM consumption_record
     WHERE type = 3 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(create_time) ORDER BY date`,
  );

  return { userCount, taskCount, todayTaskCount, paidUserCount, totalRevenue: Math.abs(totalRevenue), taskTrend, userTrend, revenueTrend };
}

// ==================== 用户管理 ====================

export async function listAllUsers({ offset, pageSize, keyword, status, planType }) {
  const needMembership = planType !== undefined && planType !== '';

  let sql = 'SELECT u.id, u.username, u.nickname, u.phone, u.status, u.create_time, u.last_login_time';
  if (needMembership) {
    sql += ', m.plan_type, m.credit_balance, m.end_time AS membership_end';
  }
  sql += ' FROM user u';
  if (needMembership) {
    sql += ' LEFT JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0';
  }
  sql += ' WHERE u.is_deleted = 0';
  const params = [];

  if (keyword) {
    sql += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') {
    sql += ' AND u.status = ?';
    params.push(Number(status));
  }
  if (planType !== undefined && planType !== '') {
    sql += ' AND m.plan_type = ?';
    params.push(Number(planType));
  }
  params.push(offset, pageSize);
  sql += ' ORDER BY u.create_time DESC LIMIT ?, ?';

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM user u';
  if (needMembership) {
    countSql += ' LEFT JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0';
  }
  countSql += ' WHERE u.is_deleted = 0';
  const countParams = [];
  if (keyword) {
    countSql += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
    countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') { countSql += ' AND u.status = ?'; countParams.push(Number(status)); }
  if (planType !== undefined && planType !== '') { countSql += ' AND m.plan_type = ?'; countParams.push(Number(planType)); }

  const [[{ total }]] = await pool.execute(countSql, countParams);
  return { list: rows, total };
}

export async function updateUserStatus(userId, status) {
  await pool.execute('UPDATE user SET status = ?, update_time = NOW() WHERE id = ?', [status, userId]);
}

export async function batchUpdateUserStatus(ids, status) {
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE user SET status = ? WHERE id IN (${placeholders})`,
    [status, ...ids],
  );
  return result.affectedRows;
}

// ==================== 风控 ====================

export async function countIPRegister24h(ip) {
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM operation_log WHERE action = ? AND ip = ? AND create_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
    ['register', ip],
  );
  return count;
}

export async function countUserAction1m(userId, action) {
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM operation_log WHERE user_id = ? AND action = ? AND create_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
    [userId, action],
  );
  return count;
}

export async function insertOperationLog(userId, action, ip, userAgent) {
  await pool.execute(
    'INSERT INTO operation_log (user_id, action, ip, user_agent, create_time) VALUES (?, ?, ?, ?, NOW())',
    [userId, action, ip || '', userAgent || ''],
  );
}

// ==================== 操作日志 ====================

export async function getOperationLogs({ offset, pageSize, userId, action }) {
  let sql = 'SELECT id, user_id, action, ip, user_agent, create_time FROM operation_log WHERE 1=1';
  const params = [];
  if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
  if (action) { sql += ' AND action = ?'; params.push(action); }
  params.push(offset, pageSize);
  sql += ' ORDER BY create_time DESC LIMIT ?, ?';
  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM operation_log WHERE 1=1';
  const countParams = [];
  if (userId) { countSql += ' AND user_id = ?'; countParams.push(userId); }
  if (action) { countSql += ' AND action = ?'; countParams.push(action); }
  const [[{ total }]] = await pool.query(countSql, countParams);
  return { list: rows, total };
}

// ==================== 任务管理（Admin） ====================

export async function getTaskById(taskId) {
  const [[task]] = await pool.execute('SELECT * FROM task WHERE id = ?', [taskId]);
  return task || null;
}

export async function listAllTasks({ offset, pageSize, userId, status, type, typeGroup, reviewStatus }) {
  let sql = `SELECT t.id, t.user_id, t.type, t.status, t.title, t.input_params, t.output_result,
    t.review_status, t.error_msg, t.create_time, t.end_time,
    u.username, u.nickname
    FROM task t LEFT JOIN user u ON t.user_id = u.id WHERE 1=1`;
  const params = [];

  if (userId) { sql += ' AND t.user_id = ?'; params.push(userId); }
  if (status !== undefined && status !== '') { sql += ' AND t.status = ?'; params.push(Number(status)); }
  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (typeGroup) {
    const groups = {
      image: ['main_image', 'scene', 'detail_h5', 'virtual_tryon', 'color_swap', 'style_transfer', 'wrinkle_remove', 'image_translate'],
      video: ['img2video', 'multi2video', 'video_packaging', 'action_transfer', 'person_replace', 'digital_human', 'action_batch', 'video_beautify', 'script_gen', 'shot_plan', 'viral_clone'],
      batch: ['batch'],
    };
    const types = groups[typeGroup];
    if (types) { sql += ` AND t.type IN (${types.map(() => '?').join(',')})`; params.push(...types); }
  }
  if (reviewStatus !== undefined && reviewStatus !== '') { sql += ' AND t.review_status = ?'; params.push(Number(reviewStatus)); }
  params.push(offset, pageSize);
  sql += ' ORDER BY t.create_time DESC LIMIT ?, ?';

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM task t WHERE 1=1';
  const countParams = [];
  if (userId) { countSql += ' AND t.user_id = ?'; countParams.push(userId); }
  if (status !== undefined && status !== '') { countSql += ' AND t.status = ?'; countParams.push(Number(status)); }
  if (type) { countSql += ' AND t.type = ?'; countParams.push(type); }
  if (typeGroup) {
    const groups = {
      image: ['main_image', 'scene', 'detail_h5', 'virtual_tryon', 'color_swap', 'style_transfer', 'wrinkle_remove', 'image_translate'],
      video: ['img2video', 'multi2video', 'video_packaging', 'action_transfer', 'person_replace', 'digital_human', 'action_batch', 'video_beautify', 'script_gen', 'shot_plan', 'viral_clone'],
      batch: ['batch'],
    };
    const types = groups[typeGroup];
    if (types) { countSql += ` AND t.type IN (${types.map(() => '?').join(',')})`; countParams.push(...types); }
  }
  if (reviewStatus !== undefined && reviewStatus !== '') { countSql += ' AND t.review_status = ?'; countParams.push(Number(reviewStatus)); }

  const [[{ total }]] = await pool.execute(countSql, countParams);
  return { list: rows, total };
}

export async function updateTaskStatusDirect(taskId, fields) {
  const allowed = ['status', 'progress', 'progress_msg', 'error_msg', 'output_result', 'worker_id'];
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k) && v !== undefined) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (sets.length === 0) return;
  params.push(taskId);
  await pool.execute(`UPDATE task SET ${sets.join(', ')} WHERE id = ?`, params);
}

// ==================== 审核 ====================

export async function approveTask(taskId) {
  await pool.execute(
    'UPDATE task SET review_status = 1, update_time = NOW() WHERE id = ?',
    [taskId],
  );
}

export async function rejectTask(taskId) {
  await pool.execute(
    'UPDATE task SET review_status = 2, update_time = NOW() WHERE id = ?',
    [taskId],
  );
}

// ==================== 套餐管理 ====================

export async function listAllPlans() {
  const [rows] = await pool.execute('SELECT * FROM membership_plan ORDER BY sort_order, id');
  return rows;
}

export async function createPlan(data) {
  const { name, price, credits, duration_days, plan_type, description, status } = data;
  const [result] = await pool.execute(
    'INSERT INTO membership_plan (name, price, credits, duration_days, plan_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, price || 0, credits || 0, duration_days || 30, plan_type || 1, description || null, status ?? 1],
  );
  return result.insertId;
}

export async function deletePlan(planId) {
  await pool.execute('DELETE FROM membership_plan WHERE id = ?', [planId]);
}

export async function updatePlan(planId, data) {
  const sets = [];
  const params = [];
  const allowed = ['name', 'price', 'original_price', 'credits', 'daily_credits', 'daily_limit', 'monthly_limit', 'save_days',
    'watermark_free', 'hd_export', 'brand_kit', 'batch_limit', 'priority_queue', 'status', 'sort_order'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (sets.length === 0) return null;
  params.push(planId);
  await pool.execute(`UPDATE membership_plan SET ${sets.join(', ')}, update_time = NOW() WHERE id = ?`, params);
  const [rows] = await pool.execute('SELECT * FROM membership_plan WHERE id = ?', [planId]);
  return rows[0] || null;
}

// ==================== 订单管理 ====================

export async function listAllOrders({ offset, pageSize, userId, planType }) {
  let sql = `
    SELECT cr.id, cr.user_id, u.username, u.nickname, cr.action, cr.credit_before, cr.credit_after,
           cr.consumed, cr.remark, cr.create_time,
           CASE cr.action
             WHEN 'purchase_plan_1' THEN '月卡'
             WHEN 'purchase_plan_2' THEN '季卡'
             WHEN 'purchase_plan_3' THEN '年卡'
             ELSE ''
           END AS plan_name,
           CAST(SUBSTRING_INDEX(cr.action, '_', -1) AS UNSIGNED) AS plan_type
    FROM consumption_record cr
    LEFT JOIN user u ON u.id = cr.user_id
    WHERE cr.type = 3
  `;
  const params = [];
  if (userId) { sql += ' AND cr.user_id = ?'; params.push(Number(userId)); }
  if (planType) { sql += ' AND cr.action = ?'; params.push(`purchase_plan_${planType}`); }
  params.push(offset, pageSize);
  sql += ' ORDER BY cr.create_time DESC LIMIT ?, ?';

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM consumption_record cr WHERE cr.type = 3';
  const countParams = [];
  if (userId) { countSql += ' AND cr.user_id = ?'; countParams.push(Number(userId)); }
  if (planType) {
    countSql += ' AND cr.action = ?';
    countParams.push(`purchase_plan_${planType}`);
  }
  const [[{ total }]] = await pool.execute(countSql, countParams);

  return { list: rows, total };
}

export async function deletePaymentOrder(orderId) {
  await pool.execute('DELETE FROM payment_order WHERE id = ?', [orderId]);
}
