import pool from './db.js';

export async function getMembership(userId) {
  const [rows] = await pool.execute(
    'SELECT id, user_id, plan_type, status, trial_quota, trial_used, credit_balance, start_time, end_time, auto_renew FROM user_membership WHERE user_id = ? AND status = 1 AND is_deleted = 0 ORDER BY id DESC LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

export async function getMembershipForUpdate(conn, userId) {
  const [rows] = await conn.execute(
    'SELECT id, user_id, plan_type, status, trial_quota, trial_used, credit_balance, start_time, end_time, auto_renew FROM user_membership WHERE user_id = ? AND status = 1 AND is_deleted = 0 ORDER BY id DESC LIMIT 1 FOR UPDATE',
    [userId],
  );
  return rows[0] || null;
}

export async function updateCreditBalance(userId, delta, conn) {
  const db = conn || pool;
  const [result] = await db.execute(
    'UPDATE user_membership SET credit_balance = credit_balance + ? WHERE user_id = ? AND status = 1 AND is_deleted = 0 AND credit_balance + ? >= 0',
    [delta, userId, delta],
  );
  return result.affectedRows > 0;
}

export async function getPlanByType(planType) {
  const [rows] = await pool.execute('SELECT * FROM membership_plan WHERE plan_type = ? AND status = 1 LIMIT 1', [planType]);
  return rows[0] || null;
}

export async function listActivePlans() {
  const [rows] = await pool.execute(
    'SELECT plan_type, name, price, original_price, credits, daily_credits, daily_limit, monthly_limit, save_days, watermark_free, hd_export, brand_kit, batch_limit, priority_queue FROM membership_plan WHERE status = 1 ORDER BY sort_order',
  );
  return rows;
}

// ==================== 幂等日志 ====================

export async function getRequestLog(requestId) {
  const [rows] = await pool.execute('SELECT * FROM credit_request_log WHERE request_id = ?', [requestId]);
  return rows[0] || null;
}

export async function insertRequestLog({ requestId, userId, action, creditAmount, remark, requestBody, responseBody, status = 1 }) {
  await pool.execute(
    'INSERT INTO credit_request_log (request_id, user_id, action, credit_amount, remark, request_body, response_body, status) VALUES (?,?,?,?,?,?,?,?)',
    [requestId, userId, action, creditAmount, remark, JSON.stringify(requestBody || {}), JSON.stringify(responseBody || {}), status],
  );
}

// ==================== 消费记录（增强版） ====================

export async function insertConsumptionLog({ userId, type, action, creditBefore, creditAfter, consumed, remark, taskId, requestId, status }) {
  const [r] = await pool.execute(
    'INSERT INTO consumption_record (user_id, type, action, credit_before, credit_after, consumed, remark, task_id, request_id, status, freeze_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())',
    [userId, type, action, creditBefore, creditAfter, consumed, remark, taskId || '', requestId || null, status || 1],
  );
  return r.insertId;
}

export async function confirmConsumption(recordId, creditAfter) {
  await pool.execute(
    'UPDATE consumption_record SET status = 1, credit_after = ?, confirm_at = NOW() WHERE id = ?',
    [creditAfter, recordId],
  );
}

export async function refundConsumption(recordId, creditAfter, remark = '') {
  await pool.execute(
    'UPDATE consumption_record SET status = 2, credit_after = ?, refund_at = NOW(), refund_remark = ? WHERE id = ?',
    [creditAfter, remark, recordId],
  );
}

export async function getConsumptionByRequestId(requestId) {
  const [rows] = await pool.execute('SELECT * FROM consumption_record WHERE request_id = ?', [requestId]);
  return rows[0] || null;
}

export async function getDailyUsedCredits(userId, conn) {
  const db = conn || pool;
  const [rows] = await db.execute(
    'SELECT IFNULL(SUM(consumed), 0) AS used FROM consumption_record WHERE user_id = ? AND status = 1 AND type = 2 AND DATE(create_time) = CURDATE()',
    [userId],
  );
  return rows[0].used;
}

export async function getMonthlyUsedCredits(userId, conn) {
  const db = conn || pool;
  const [rows] = await db.execute(
    'SELECT IFNULL(SUM(consumed), 0) AS used FROM consumption_record WHERE user_id = ? AND status = 1 AND type = 2 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())',
    [userId],
  );
  return rows[0].used;
}

// ==================== 管理员退款 ====================

export async function adminRefund(userId, recordId, remark) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 锁定记录
    const [[record]] = await conn.execute('SELECT * FROM consumption_record WHERE id = ? AND status = 1 AND type = 2 FOR UPDATE', [recordId]);
    if (!record) { await conn.rollback(); return { ok: false, msg: '记录不存在或已退款' }; }

    // 退款
    await conn.execute('UPDATE user_membership SET credit_balance = credit_balance + ? WHERE user_id = ? AND status = 1', [record.consumed, record.user_id]);
    await conn.execute('UPDATE consumption_record SET status = 2, refund_at = NOW(), refund_remark = ? WHERE id = ?', [remark, recordId]);

    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// 列表（管理后台）
export async function listConsumptionRecords({ userId, status, type, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
  if (type !== undefined) { conditions.push('type = ?'); params.push(type); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = parseInt((page - 1) * pageSize, 10);
  const limit = parseInt(pageSize, 10);
  params.push(offset, limit);
  const [rows] = await pool.query(
    `SELECT * FROM consumption_record ${where} ORDER BY create_time DESC LIMIT ?, ?`,
    params,
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM consumption_record ${where}`, params);
  return { list: rows, total };
}

// ==================== 会员初始化 ====================

export async function insertMembership(userId, planType, trialQuota) {
  await pool.execute(
    'INSERT INTO user_membership (user_id, plan_type, trial_quota, credit_balance, start_time) VALUES (?,?,?,?,?)',
    [userId, planType, trialQuota, trialQuota, new Date()],
  );
}

// ==================== 签到 ====================

export async function getCheckInByDate(userId, date) {
  const [rows] = await pool.execute(
    'SELECT id, streak FROM check_ins WHERE user_id = ? AND check_date = ?',
    [userId, date],
  );
  return rows[0] || null;
}

export async function getLastCheckIn(userId) {
  const [rows] = await pool.execute(
    'SELECT check_date, streak FROM check_ins WHERE user_id = ? ORDER BY check_date DESC LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

export async function insertCheckIn(userId, date, streak, reward) {
  await pool.execute(
    'INSERT INTO check_ins (user_id, check_date, streak, reward) VALUES (?, ?, ?, ?)',
    [userId, date, streak, reward],
  );
}

export async function getWeekCheckIns(userId) {
  const [rows] = await pool.execute(
    'SELECT check_date, reward FROM check_ins WHERE user_id = ? AND check_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ORDER BY check_date',
    [userId],
  );
  return rows;
}

// ==================== 分享/邀请奖励 ====================

export async function getActionRecordToday(userId, action, date) {
  const [rows] = await pool.execute(
    'SELECT id FROM consumption_record WHERE user_id = ? AND action = ? AND DATE(create_time) = ?',
    [userId, action, date],
  );
  return rows[0] || null;
}

export async function getInviteRewardRecord(inviterId, invitedUserId) {
  const [rows] = await pool.execute(
    'SELECT id FROM consumption_record WHERE user_id = ? AND action = ? AND remark = ?',
    [inviterId, 'invite_reward', `invited:${invitedUserId}`],
  );
  return rows[0] || null;
}

// ==================== 免费会员批量查询 ====================

export async function getFreePlanMembers() {
  const [rows] = await pool.execute(
    'SELECT user_id, credit_balance FROM user_membership WHERE plan_type = 0 AND status = 1 AND is_deleted = 0',
  );
  return rows;
}

// ==================== 积分历史 ====================

export async function getCreditHistory(userId, offset, limit) {
  const [rows] = await pool.query(
    `SELECT id, type, action, credit_before, credit_after, consumed, remark, status, create_time
     FROM consumption_record WHERE user_id = ? ORDER BY create_time DESC LIMIT ?, ?`,
    [userId, offset, limit],
  );
  return rows;
}

export async function getCreditHistoryCount(userId) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM consumption_record WHERE user_id = ?',
    [userId],
  );
  return total;
}
