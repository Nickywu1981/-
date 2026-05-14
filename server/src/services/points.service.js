import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Points Service (积分系统)
 * G5 后端开发 | W4
 * 积分赚取 / 消费 / 兑换 / 账户管理（乐观锁防超扣）
 */
import db from '../dao/db.js';
import * as pointsDao from '../dao/pointsDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ── 乐观锁重试工具（版本冲突时自动重试，最大 3 次指数退避）──
async function withOptimisticRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if ((err.status === 409 || err.code === 409) && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 50 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
}

// 积分规则
const POINT_RULES = {
  register: 100,
  daily_checkin: 10,
  checkin_streak_bonus: 5,
  image_gen: 2,
  video_gen: 5,
  action_migrate: 10,
  digital_human: 8,
  viral_replicate: 8,
  share_product: 5,
  invite_register: 50,
  invite_purchase: 200,
  redeem_credits: { 100: 10, 500: 60, 1000: 150 },
};

// ============================================================
// 赚取积分（带乐观锁）
// ============================================================
export async function earnPoints(userId, { amount, businessType, businessId, remark = '' }) {
  if (amount <= 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  return withOptimisticRetry(async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const account = await pointsDao.getOrCreateAccount(conn, userId);
      const affected = await pointsDao.addBalance(conn, userId, amount, account.version);
      if (affected === 0) throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);

      const newBalance = account.balance + amount;
      await pointsDao.insertTransaction(conn, {
        userId, transType: 'earn', amount, balanceAfter: newBalance,
        businessType, businessId, remark,
      });

      await conn.commit();
      return { user_id: userId, balance: newBalance, earned: amount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
}

// ============================================================
// 消费积分（带乐观锁防超扣）
// ============================================================
export async function spendPoints(userId, { amount, businessType, businessId, remark = '' }) {
  if (amount <= 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  return withOptimisticRetry(async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const account = await pointsDao.getOrCreateAccount(conn, userId);
      if (account.balance < amount) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

      const affected = await pointsDao.deductBalance(conn, userId, amount, account.version);
      if (affected === 0) throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);

      const newBalance = account.balance - amount;
      await pointsDao.insertTransaction(conn, {
        userId, transType: 'spend', amount: -amount, balanceAfter: newBalance,
        businessType, businessId, remark,
      });

      await conn.commit();
      return { user_id: userId, balance: newBalance, spent: amount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
}

// ============================================================
// 积分兑换点数
// ============================================================
export async function redeemPointsForCredits(userId, pointsAmount) {
  const rates = POINT_RULES.redeem_credits;
  const creditAmount = rates[pointsAmount];
  if (!creditAmount) throw new BusinessError(ERROR_CODE.PARAM_INVALID, `Unsupported exchange tier, options: ${Object.keys(rates).join(", ")}`);

  return withOptimisticRetry(async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const account = await pointsDao.getOrCreateAccount(conn, userId);
      if (account.balance < pointsAmount) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

      const affected = await pointsDao.deductBalance(conn, userId, pointsAmount, account.version);
      if (affected === 0) throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);

      const newBalance = account.balance - pointsAmount;
      await pointsDao.insertTransaction(conn, {
        userId, transType: 'spend', amount: -pointsAmount, balanceAfter: newBalance,
        businessType: 'redeem_credits', remark: `兑换${creditAmount}点数`,
      });

      const membershipAffected = await pointsDao.addMembershipCredits(conn, userId, creditAmount);
      if (membershipAffected === 0) {
        await conn.rollback();
        throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
      }

      await conn.commit();
      return { user_id: userId, points_balance: newBalance, redeemed_credits: creditAmount, cost_points: pointsAmount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
}

// ============================================================
// 查询积分账户
// ============================================================
export async function getPointsAccount(userId) {
  const account = await pointsDao.getAccount(userId);
  return account || { user_id: userId, balance: 0, total_earned: 0, total_spent: 0, frozen: 0 };
}

// ============================================================
// 积分流水
// ============================================================
export async function getPointsTransactions(userId, { page = 1, pageSize = 20 } = {}) {
  return pointsDao.getTransactions(userId, { page, pageSize });
}

// ============================================================
// 业务触发：自动赚取积分
// ============================================================
export async function awardPointsForTask(userId, taskType, taskId) {
  const points = POINT_RULES[taskType] || 0;
  if (points <= 0) return null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const existing = await pointsDao.findTransactionByBusiness(conn, userId, taskType, taskId);
    if (existing.length > 0) {
      await conn.rollback();
      return null;
    }

    const account = await pointsDao.getOrCreateAccount(conn, userId);
    const affected = await pointsDao.addBalance(conn, userId, points, account.version);
    if (affected === 0) {
      await conn.rollback();
      throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);
    }

    const newBalance = account.balance + points;
    await pointsDao.insertTransaction(conn, {
      userId, transType: 'earn', amount: points, balanceAfter: newBalance,
      businessType: taskType, businessId: taskId, remark: `完成${taskType}任务`,
    });

    await conn.commit();
    return { user_id: userId, balance: newBalance, earned: points };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export { POINT_RULES };
