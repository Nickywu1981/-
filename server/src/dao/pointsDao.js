/**
 * Points DAO — 积分账户与流水 SQL 层
 * G6 Backend-B | 2026-05-15
 *
 * 事务方法接受 conn 参数由 Service 层管理连接生命周期。
 */
import pool from './db.js';

// ==================== 账户 ====================

export async function getAccount(userId) {
  const [rows] = await pool.query(
    'SELECT user_id, balance, total_earned, total_spent, frozen, version FROM points_account WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

export async function getOrCreateAccount(conn, userId) {
  const [rows] = await conn.query(
    'SELECT user_id, balance, total_earned, total_spent, frozen, version FROM points_account WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (rows.length > 0) return rows[0];
  await conn.query(
    'INSERT INTO points_account (user_id, balance, total_earned, total_spent, frozen) VALUES (?, 0, 0, 0, 0)',
    [userId],
  );
  return { user_id: userId, balance: 0, total_earned: 0, total_spent: 0, frozen: 0, version: 1 };
}

export async function addBalance(conn, userId, amount, expectedVersion) {
  const [result] = await conn.query(
    `UPDATE points_account SET balance = balance + ?, total_earned = total_earned + ?, version = version + 1
     WHERE user_id = ? AND version = ?`,
    [amount, amount, userId, expectedVersion],
  );
  return result.affectedRows;
}

export async function deductBalance(conn, userId, amount, expectedVersion) {
  const [result] = await conn.query(
    `UPDATE points_account SET balance = balance - ?, total_spent = total_spent + ?, version = version + 1
     WHERE user_id = ? AND version = ? AND balance >= ?`,
    [amount, amount, userId, expectedVersion, amount],
  );
  return result.affectedRows;
}

// ==================== 流水 ====================

export async function insertTransaction(conn, { userId, transType, amount, balanceAfter, businessType, businessId, remark }) {
  await conn.query(
    `INSERT INTO points_transaction (user_id, trans_type, amount, balance_after, business_type, business_id, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, transType, amount, balanceAfter, businessType, businessId || null, remark],
  );
}

export async function findTransactionByBusiness(conn, userId, businessType, businessId) {
  const [rows] = await conn.query(
    'SELECT id FROM points_transaction WHERE user_id = ? AND business_type = ? AND business_id = ? FOR UPDATE',
    [userId, businessType, businessId],
  );
  return rows;
}

export async function getTransactions(userId, { page = 1, pageSize = 20 } = {}) {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM points_transaction WHERE user_id = ?', [userId]);
  const [rows] = await pool.query(
    'SELECT id, trans_type, amount, balance_after, business_type, remark, created_at FROM points_transaction WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, pageSize, (page - 1) * pageSize],
  );
  return { list: rows, total, page, pageSize };
}

// ==================== 兑换 ====================

export async function addMembershipCredits(conn, userId, creditAmount) {
  const [result] = await conn.query(
    'UPDATE user_membership SET credit_balance = credit_balance + ? WHERE user_id = ?',
    [creditAmount, userId],
  );
  return result.affectedRows;
}
