import pool from './db.js';

// ========================= 用户邀请码 =========================

export async function getInviteCode(userId) {
  const [rows] = await pool.query(
    'SELECT invite_code, nickname FROM `users` WHERE id = ?',
    [userId],
  );
  return rows[0] || null;
}

export async function getInviteCodeByPhone(phone) {
  const [rows] = await pool.query(
    'SELECT invite_code FROM `users` WHERE phone = ?',
    [phone],
  );
  return rows[0] || null;
}

// ========================= 分销关系 (distributor_relation) =========================

export async function getTeamTotal(userId) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM distributor_relation WHERE parent_id = ? OR grandparent_id = ?',
    [userId, userId],
  );
  return Number(total) || 0;
}

export async function getTeamMembers(userId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT dr.id, dr.user_id, dr.level, dr.bound_at, u.nickname, u.avatar_url
     FROM distributor_relation dr
     JOIN users u ON u.id = dr.user_id
     WHERE dr.parent_id = ? OR dr.grandparent_id = ?
     ORDER BY dr.bound_at DESC LIMIT ? OFFSET ?`,
    [userId, userId, pageSize, offset],
  );
  return rows;
}

export async function getLevelCounts(userId) {
  const [[{ level1_count }]] = await pool.query(
    'SELECT COUNT(*) as level1_count FROM distributor_relation WHERE parent_id = ?',
    [userId],
  );
  const [[{ level2_count }]] = await pool.query(
    'SELECT COUNT(*) as level2_count FROM distributor_relation WHERE grandparent_id = ?',
    [userId],
  );
  return { level1_count: Number(level1_count) || 0, level2_count: Number(level2_count) || 0 };
}

export async function getRelationByUser(consumerId) {
  const [rows] = await pool.query(
    'SELECT parent_id, grandparent_id, level FROM distributor_relation WHERE user_id = ? LIMIT 1',
    [consumerId],
  );
  return rows[0] || null;
}

export async function getMonthlyInviteCount(userId) {
  const [[{ monthlyInvites }]] = await pool.query(
    'SELECT COUNT(*) as monthlyInvites FROM distributor_relation WHERE parent_id = ? AND bound_at >= DATE_FORMAT(NOW(), ?)',
    [userId, '%Y-%m-01'],
  );
  return Number(monthlyInvites) || 0;
}

export async function getTotalRegisters(userId) {
  const [[{ registers }]] = await pool.query(
    'SELECT COUNT(*) as registers FROM distributor_relation WHERE parent_id = ? OR grandparent_id = ?',
    [userId, userId],
  );
  return Number(registers) || 0;
}

// ========================= 分销佣金 (distributor_commission) =========================

export async function getCommissionBalance(userId) {
  const [[result]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'settled' THEN commission ELSE 0 END), 0) as available,
       COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN commission ELSE 0 END), 0) as withdrawn,
       COALESCE(SUM(commission), 0) as total
     FROM distributor_commission WHERE distributor_id = ?`,
    [userId],
  );
  return result;
}

export async function getCommissionHistory(userId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM distributor_commission WHERE distributor_id = ?',
    [userId],
  );
  const [rows] = await pool.query(
    `SELECT dc.id, dc.consumer_id, dc.order_amount, dc.commission_rate, dc.commission, dc.level, dc.status, dc.created_at, dc.settled_at,
            u.nickname as consumer_name
     FROM distributor_commission dc
     LEFT JOIN users u ON u.id = dc.consumer_id
     WHERE dc.distributor_id = ?
     ORDER BY dc.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset],
  );
  return { list: rows, total: Number(total) || 0, page, pageSize };
}

export async function checkDuplicateCommission(orderId, conn) {
  const db = conn || pool;
  const [existing] = await db.query(
    'SELECT id FROM distributor_commission WHERE order_id = ? LIMIT 1',
    [orderId],
  );
  return existing.length > 0;
}

export async function insertCommission({ distributorId, consumerId, orderId, orderAmount, rate, amount, level }, conn) {
  const db = conn || pool;
  await db.query(
    `INSERT INTO distributor_commission (distributor_id, consumer_id, order_id, order_amount, commission_rate, commission, level, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'settled')`,
    [distributorId, consumerId, orderId, orderAmount, rate, amount, level],
  );
}

export async function getAvailableBalanceForUpdate(userId, conn) {
  const db = conn || pool;
  const [[balance]] = await db.query(
    `SELECT COALESCE(SUM(commission), 0) as available
     FROM distributor_commission WHERE distributor_id = ? AND status = 'settled' FOR UPDATE`,
    [userId],
  );
  return Number(balance?.available) || 0;
}

export async function getPendingCommissions(userId, conn) {
  const db = conn || pool;
  const [rows] = await db.query(
    `SELECT id, commission FROM distributor_commission
     WHERE distributor_id = ? AND status = 'settled' ORDER BY id ASC FOR UPDATE`,
    [userId],
  );
  return rows;
}

export async function markCommissionsWithdrawn(ids, conn) {
  const db = conn || pool;
  if (!ids.length) return;
  await db.query(
    `UPDATE distributor_commission SET status = 'withdrawn', settled_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
}

export async function getTotalSales(userId) {
  const [[{ totalSales }]] = await pool.query(
    'SELECT COALESCE(SUM(commission), 0) as totalSales FROM distributor_commission WHERE distributor_id = ? AND status IN (?,?)',
    [userId, 'settled', 'withdrawn'],
  );
  return Number(totalSales) || 0;
}

export async function getTeamPerformance(userId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [members] = await pool.query(
    `SELECT u.id, u.nickname, dr.level, dr.bound_at, COALESCE(SUM(dc.commission), 0) as contributed
     FROM distributor_relation dr JOIN users u ON u.id = dr.user_id
     LEFT JOIN distributor_commission dc ON dc.consumer_id = dr.user_id
     WHERE dr.parent_id = ? OR dr.grandparent_id = ?
     GROUP BY u.id, u.nickname, dr.level, dr.bound_at
     ORDER BY contributed DESC LIMIT ? OFFSET ?`,
    [userId, userId, pageSize, offset],
  );
  const [[agg]] = await pool.query(
    'SELECT COUNT(*) as totalMembers, COALESCE(SUM(dc.commission), 0) as totalContribution FROM distributor_relation dr LEFT JOIN distributor_commission dc ON dc.consumer_id = dr.user_id WHERE dr.parent_id = ? OR dr.grandparent_id = ?',
    [userId, userId],
  );
  return { members, totalMembers: Number(agg?.totalMembers) || 0, totalContribution: Number(agg?.totalContribution) || 0, page, pageSize };
}
