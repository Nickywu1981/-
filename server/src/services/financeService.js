/**
 * Finance Service — 财务业务逻辑层
 *
 * Phase 2: 财务核心 (2026-05-11)
 *
 * 关键区分：
 *   - 代理端(agent): 完整佣金+提现+流水+结算
 *   - 企业端(enterprise): 流水+结算（无提现入口）
 */
import * as financeDao from '../dao/financeDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import crypto from 'crypto';

// ==================== 收款账户 ====================

export async function listBankAccounts(tenantId) {
  return financeDao.listBankAccounts(tenantId);
}

export async function addBankAccount(tenantId, data) {
  const { accountType, accountName, accountNo, bankName, bankBranch, isDefault } = data;
  if (!accountType || !accountName || !accountNo) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '账户类型/户名/账号为必填项');
  }
  // 核验手机号/银行卡号格式
  if (accountType === 'bank' && accountNo.length < 10) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '银行卡号格式不正确');
  }
  return financeDao.addBankAccount(tenantId, { accountType, accountName, accountNo, bankName, bankBranch, isDefault });
}

export async function removeBankAccount(tenantId, id) {
  const account = await financeDao.findBankAccountById(id, tenantId);
  if (!account) {
    throw new BusinessError(ERROR_CODE.NOT_FOUND, '收款账户不存在');
  }
  return financeDao.removeBankAccount(id, tenantId);
}

// ==================== 账户流水（企业+代理共用） ====================

export async function listLedger(tenantId, query) {
  return financeDao.listLedger(tenantId, query);
}

// ==================== 结算记录（企业+代理共用） ====================

export async function listSettlements(tenantId, query) {
  return financeDao.listSettlements(tenantId, query);
}

export async function getSettlementDetail(id) {
  const detail = await financeDao.getSettlementDetail(id);
  if (!detail) throw new BusinessError(ERROR_CODE.NOT_FOUND, '结算记录不存在');
  return detail;
}

// ==================== 佣金收益（仅代理端） ====================

export async function listEarnings(tenantId, query) {
  return financeDao.listEarnings(tenantId, query);
}

export async function getEarningsSummary(tenantId) {
  return financeDao.getEarningsSummary(tenantId);
}

// ==================== 提现（仅代理端） ====================

export async function listWithdrawals(tenantId, query) {
  return financeDao.listWithdrawals(tenantId, query);
}

export async function createWithdrawal(tenantId, userId, data) {
  const { amount, bankAccountId } = data;
  const safeAmount = Number(amount);

  if (!safeAmount || safeAmount <= 0) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '提现金额必须大于0');
  }

  // Validate policy + bank account before acquiring DB lock
  const policy = await getCommissionPolicy(tenantId);
  const minAmount = policy?.min_withdrawal || 100;
  if (safeAmount < minAmount) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, `最低提现金额为 ¥${minAmount}`);
  }

  if (bankAccountId) {
    const account = await financeDao.findBankAccountById(bankAccountId, tenantId);
    if (!account) {
      throw new BusinessError(ERROR_CODE.BAD_REQUEST, '收款账户不存在');
    }
  }

  // 事务内 FOR UPDATE 锁定余额，防并发提现竞态
  const { balance, conn } = await financeDao.lockTenantBalance(tenantId);
  try {
    if (balance < safeAmount) {
      throw new BusinessError(ERROR_CODE.BAD_REQUEST, `余额不足，当前可用余额 ¥${balance}`);
    }

    const fee = Math.round(safeAmount * 0.006 * 100) / 100;
    const actualAmount = safeAmount - fee;
    const orderNo = `WD${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // 插入提现单 (uses raw conn for transactional atomicity)
    const [wdResult] = await conn.query('INSERT INTO withdrawal_order SET ?', {
      order_no: orderNo,
      tenant_id: tenantId,
      user_id: userId,
      amount: safeAmount,
      fee,
      actual_amount: actualAmount,
      bank_account_id: bankAccountId || null,
      status: 'pending_review',
    });

    // 更新余额
    const newBalance = balance - safeAmount;
    await financeDao.updateTenantBalanceInTx(conn, tenantId, newBalance);

    // 写流水
    await financeDao.insertLedgerInTx(conn, {
      tenantId,
      ledgerType: 'withdrawal',
      amount: -safeAmount,
      balanceBefore: balance,
      balanceAfter: newBalance,
      businessType: 'withdrawal',
      businessId: orderNo,
      remark: `提现申请: ¥${safeAmount} (手续费 ¥${fee}, 到账 ¥${actualAmount})`,
    });

    await conn.commit();
    return { id: wdResult.insertId, orderNo, amount: safeAmount, fee, actualAmount };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getWithdrawalDetail(id) {
  const detail = await financeDao.getWithdrawalById(id);
  if (!detail) throw new BusinessError(ERROR_CODE.NOT_FOUND, '提现记录不存在');
  return detail;
}

// ==================== 分润政策（仅代理端） ====================

export async function getCommissionPolicy(tenantId) {
  const policy = await financeDao.getCommissionPolicy(tenantId);
  if (!policy) {
    return { level1Rate: 15, level2Rate: 5, minWithdrawal: 100, settlementCycle: 'monthly', policyType: 'default' };
  }
  return policy;
}

export async function updateCommissionPolicy(tenantId, data) {
  await financeDao.upsertCommissionPolicy(tenantId, data);
  return getCommissionPolicy(tenantId);
}

// ==================== 财务仪表盘 ====================

export async function getFinanceDashboard(tenantId, tenantType) {
  return financeDao.getFinanceDashboard(tenantId, tenantType);
}
