/**
 * Finance DAO — 财务数据访问层
 *
 * Phase 2: 财务核心 (2026-05-11)
 * 表: bank_account, settlement_batch, settlement_detail, withdrawal_order, account_ledger, commission_policy
 */
import pool from '../dao/db.js';

// ==================== 收款账户 ====================

export async function listBankAccounts(tenantId, { limit = 50 } = {}) {
  const [rows] = await pool.query(
    'SELECT * FROM bank_account WHERE tenant_id = ? AND is_deleted = 0 ORDER BY is_default DESC, create_time DESC LIMIT ?',
    [tenantId, limit],
  );
  return rows;
}

export async function addBankAccount(tenantId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (data.isDefault) {
      await conn.query('UPDATE bank_account SET is_default = 0 WHERE tenant_id = ?', [tenantId]);
    }
    const [result] = await conn.query('INSERT INTO bank_account SET ?', {
      tenant_id: tenantId,
      account_type: data.accountType,
      account_name: data.accountName,
      account_no: data.accountNo,
      bank_name: data.bankName || null,
      bank_branch: data.bankBranch || null,
      is_default: data.isDefault ? 1 : 0,
    });
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function findBankAccountById(id, tenantId) {
  const [rows] = await pool.query('SELECT * FROM bank_account WHERE id = ? AND tenant_id = ? AND is_deleted = 0', [id, tenantId]);
  return rows[0] || null;
}

export async function removeBankAccount(id, tenantId) {
  const [result] = await pool.query('UPDATE bank_account SET is_deleted = 1 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  return result.affectedRows;
}

// ==================== 账户流水 ====================

export async function listLedger(tenantId, { page = 1, pageSize = 20, type, startDate, endDate } = {}) {
  const conditions = ['tenant_id = ?'];
  const params = [tenantId];
  if (type) { conditions.push('ledger_type = ?'); params.push(type); }
  if (startDate) { conditions.push('create_time >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('create_time <= ?'); params.push(endDate); }
  const where = conditions.join(' AND ');

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM account_ledger WHERE ${where}`, params);
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT * FROM account_ledger WHERE ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

// ==================== 结算批次/明细 ====================

export async function listSettlements(tenantId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM settlement_detail WHERE tenant_id = ?', [tenantId],
  );
  const [rows] = await pool.query(
    `SELECT sd.*, sb.batch_no, sb.cycle_start, sb.cycle_end, sb.status AS batch_status
     FROM settlement_detail sd
     LEFT JOIN settlement_batch sb ON sd.batch_id = sb.id
     WHERE sd.tenant_id = ?
     ORDER BY sd.create_time DESC LIMIT ? OFFSET ?`,
    [tenantId, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

export async function getSettlementDetail(id) {
  const [rows] = await pool.query(
    `SELECT sd.*, sb.batch_no, sb.cycle_start, sb.cycle_end, sb.status AS batch_status
     FROM settlement_detail sd
     LEFT JOIN settlement_batch sb ON sd.batch_id = sb.id
     WHERE sd.id = ?`, [id],
  );
  return rows[0] || null;
}

// ==================== 佣金收益（代理端） ====================

export async function listEarnings(tenantId, { page = 1, pageSize = 20, status, startDate, endDate } = {}) {
  const conditions = ['dc.status != ?'];
  const params = ['cancelled'];
  if (status) { conditions.push('dc.status = ?'); params.push(status); }
  if (startDate) { conditions.push('dc.created_at >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('dc.created_at <= ?'); params.push(endDate); }

  const [euRows] = await pool.query(
    'SELECT user_id FROM enterprise_user WHERE tenant_id = ? AND is_deleted = 0', [tenantId],
  );
  const userIds = euRows.map(r => r.user_id);
  if (userIds.length === 0) return { list: [], total: 0, page, pageSize };

  conditions.push(`dc.distributor_id IN (${userIds.map(() => '?').join(',')})`);
  params.push(...userIds);
  const where = conditions.join(' AND ');

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM distributor_commission dc WHERE ${where}`, params);
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT dc.*, u.nickname AS consumer_name
     FROM distributor_commission dc
     LEFT JOIN user u ON dc.consumer_id = u.id
     WHERE ${where}
     ORDER BY dc.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

export async function getEarningsSummary(tenantId) {
  const [euRows] = await pool.query(
    'SELECT user_id FROM enterprise_user WHERE tenant_id = ? AND is_deleted = 0', [tenantId],
  );
  const userIds = euRows.map(r => r.user_id);
  if (userIds.length === 0) return { totalEarnings: 0, settled: 0, pending: 0, withdrawn: 0 };

  const placeholders = userIds.map(() => '?').join(',');
  const [[summary]] = await pool.query(
    `SELECT
       COALESCE(SUM(commission), 0) AS totalEarnings,
       COALESCE(SUM(CASE WHEN status = 'settled' THEN commission ELSE 0 END), 0) AS settled,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN commission ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN commission ELSE 0 END), 0) AS withdrawn
     FROM distributor_commission
     WHERE distributor_id IN (${placeholders}) AND status != 'cancelled'`,
    userIds,
  );
  return summary;
}

// ==================== 提现（代理端） ====================

export async function listWithdrawals(tenantId, { page = 1, pageSize = 20, status } = {}) {
  const conditions = ['wo.tenant_id = ?'];
  const params = [tenantId];
  if (status) { conditions.push('wo.status = ?'); params.push(status); }
  const where = conditions.join(' AND ');

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM withdrawal_order wo WHERE ${where}`, params);
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT wo.*, ba.account_type, ba.account_name, ba.account_no, ba.bank_name
     FROM withdrawal_order wo
     LEFT JOIN bank_account ba ON wo.bank_account_id = ba.id
     WHERE ${where} ORDER BY wo.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

export async function createWithdrawal(data) {
  const [result] = await pool.query('INSERT INTO withdrawal_order SET ?', {
    order_no: data.orderNo,
    tenant_id: data.tenantId,
    user_id: data.userId,
    amount: data.amount,
    fee: data.fee || 0,
    actual_amount: data.actualAmount,
    bank_account_id: data.bankAccountId || null,
    status: 'pending_review',
  });
  return result.insertId;
}

export async function getWithdrawalById(id) {
  const [rows] = await pool.query(
    `SELECT wo.*, ba.account_type, ba.account_name, ba.account_no, ba.bank_name
     FROM withdrawal_order wo
     LEFT JOIN bank_account ba ON wo.bank_account_id = ba.id
     WHERE wo.id = ?`, [id],
  );
  return rows[0] || null;
}

export async function getPendingWithdrawalTotal(tenantId) {
  const [[row]] = await pool.query(
    `SELECT COALESCE(SUM(actual_amount), 0) AS total FROM withdrawal_order
     WHERE tenant_id = ? AND status IN ('pending_review','approved','processing')`, [tenantId],
  );
  return row.total;
}

// ==================== 事务安全的余额操作 ====================

export async function getTenantBalance(tenantId) {
  const [rows] = await pool.query('SELECT balance FROM tenant WHERE id = ?', [tenantId]);
  return rows[0]?.balance || 0;
}

/** 在事务中锁定余额行，返回 { balance, conn }，调用方负责 commit/rollback/release */
export async function lockTenantBalance(tenantId) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  const [rows] = await conn.query('SELECT balance FROM tenant WHERE id = ? FOR UPDATE', [tenantId]);
  return { balance: rows[0]?.balance || 0, conn };
}

export async function updateTenantBalanceInTx(conn, tenantId, newBalance) {
  await conn.query('UPDATE tenant SET balance = ? WHERE id = ?', [newBalance, tenantId]);
}

export async function updateTenantBalance(tenantId, newBalance) {
  const [r] = await pool.query('UPDATE tenant SET balance = ? WHERE id = ?', [newBalance, tenantId]);
  return r.affectedRows;
}

// ==================== 流水 ====================

export async function insertLedger(data) {
  const [result] = await pool.query('INSERT INTO account_ledger SET ?', {
    tenant_id: data.tenantId,
    ledger_type: data.ledgerType,
    amount: data.amount,
    balance_before: data.balanceBefore,
    balance_after: data.balanceAfter,
    business_type: data.businessType || null,
    business_id: data.businessId || null,
    remark: data.remark || null,
  });
  return result.insertId;
}

export async function insertLedgerInTx(conn, data) {
  await conn.query('INSERT INTO account_ledger SET ?', {
    tenant_id: data.tenantId,
    ledger_type: data.ledgerType,
    amount: data.amount,
    balance_before: data.balanceBefore,
    balance_after: data.balanceAfter,
    business_type: data.businessType || null,
    business_id: data.businessId || null,
    remark: data.remark || null,
  });
}

// ==================== 分润政策 ====================

export async function getCommissionPolicy(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM commission_policy WHERE tenant_id = ? AND status = 1', [tenantId],
  );
  return rows[0] || null;
}

export async function upsertCommissionPolicy(tenantId, data) {
  await pool.query(
    `INSERT INTO commission_policy (tenant_id, level1_rate, level2_rate, min_withdrawal, settlement_cycle, policy_type)
     VALUES (?, ?, ?, ?, ?, 'custom')
     ON DUPLICATE KEY UPDATE
       level1_rate = VALUES(level1_rate),
       level2_rate = VALUES(level2_rate),
       min_withdrawal = VALUES(min_withdrawal),
       settlement_cycle = VALUES(settlement_cycle),
       policy_type = 'custom'`,
    [tenantId, data.level1Rate || 15, data.level2Rate || 5, data.minWithdrawal || 100, data.settlementCycle || 'monthly'],
  );
}

// ==================== 财务仪表盘 ====================

export async function getFinanceDashboard(tenantId, tenantType) {
  const balance = await getTenantBalance(tenantId);

  const [[{ totalRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM account_ledger WHERE tenant_id = ? AND ledger_type = 'revenue'`, [tenantId],
  );
  const [[{ totalWithdrawn }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalWithdrawn FROM account_ledger WHERE tenant_id = ? AND ledger_type = 'withdrawal'`, [tenantId],
  );
  const [[{ monthRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS monthRevenue FROM account_ledger WHERE tenant_id = ? AND ledger_type = 'revenue' AND create_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, [tenantId],
  );

  const result = { balance, totalRevenue, totalWithdrawn, monthRevenue };

  if (tenantType === 'agent') {
    const earningsSummary = await getEarningsSummary(tenantId);
    const pendingWithdrawal = await getPendingWithdrawalTotal(tenantId);
    result.earnings = earningsSummary;
    result.pendingWithdrawal = pendingWithdrawal;
  }

  return result;
}
