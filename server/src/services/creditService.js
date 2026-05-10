import * as creditDao from '../dao/creditDao.js';
import { BusinessError } from '../utils/businessError.js';
import { CREDIT_RECORD_STATUS } from '../constants/domainStatus.js';
import db from '../dao/db.js';

// 操作消耗点数额
const CONSUMPTION_RULES = {
  cutout: 1, cutout_hq: 2, scene: 2, enhance: 3, img2video: 10,
  multi2video: 20, detail_h5: 5, model_tryon: 8, color_swap: 3,
  ai_style: 5, action_transfer: 30, digital_human: 15,
  batch_discount: 0.8, night_batch_discount: 0.6,
};

/** 计算消耗 */
function calcConsumed(action, batchCount = 1, isNight = false) {
  const base = CONSUMPTION_RULES[action] || 1;
  if (batchCount > 1) {
    const discount = isNight ? CONSUMPTION_RULES.night_batch_discount : CONSUMPTION_RULES.batch_discount;
    return Math.ceil(base * batchCount * discount);
  }
  return base;
}

// ==================== 冻结（预扣） ====================

export async function freezeCredit(userId, requestId, action, batchCount = 1, isNight = false) {
  const consumedAmount = calcConsumed(action, batchCount, isNight);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 幂等性守卫: INSERT request_log 带 UNIQUE(request_id), 冲突则返回已存在记录
    const existingLog = await creditDao.getRequestLogForUpdate(conn, requestId);
    if (existingLog) {
      await conn.commit();
      const record = await creditDao.getConsumptionByRequestId(requestId);
      return { idempotent: true, recordId: record?.id, status: existingLog.status };
    }

    const membership = await creditDao.getMembershipForUpdate(conn, userId);
    if (!membership) {
      await conn.rollback();
      throw new BusinessError(403, '会员信息不存在');
    }

    const plan = await creditDao.getPlanByType(membership.plan_type);

    const dailyUsed = await creditDao.getDailyUsedCredits(userId, conn);
    const monthlyUsed = await creditDao.getMonthlyUsedCredits(userId, conn);
    if (plan && plan.daily_limit > 0 && dailyUsed + consumedAmount > plan.daily_limit) {
      await conn.rollback();
      throw new BusinessError(4103, '超出每日消费上限');
    }
    if (plan && plan.monthly_limit > 0 && monthlyUsed + consumedAmount > plan.monthly_limit) {
      await conn.rollback();
      throw new BusinessError(4103, '超出每月消费上限');
    }
    if (plan && plan.batch_limit > 0 && batchCount > plan.batch_limit) {
      await conn.rollback();
      throw new BusinessError(4103, `单次批量上限为 ${plan.batch_limit} 张`);
    }

    const creditBefore = membership.credit_balance;
    if (creditBefore < consumedAmount) {
      await conn.rollback();
      throw new BusinessError(4103, '点数不足，请升级会员');
    }

    const ok = await creditDao.updateCreditBalance(userId, -consumedAmount, conn);
    if (!ok) {
      await conn.rollback();
      throw new BusinessError(500, '扣费失败');
    }

    const creditAfter = creditBefore - consumedAmount;

    const recordId = await creditDao.insertConsumptionLog({
      userId, type: 2, action, creditBefore, creditAfter, consumed: consumedAmount,
      remark: `freeze batch=${batchCount}`, taskId: '', requestId, status: 0,
    });

    // 幂等日志写入事务内，UNIQUE(request_id) 防止重复扣费
    await creditDao.insertRequestLog({
      requestId, userId, action: 'freeze', creditAmount: consumedAmount,
      remark: `action=${action} batchCount=${batchCount}`, requestBody: { action, batchCount }, responseBody: { recordId, creditAfter }, status: 1,
    }, conn);

    await conn.commit();

    return { idempotent: false, recordId, creditBefore, creditAfter, consumed: consumedAmount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ==================== 确认消费 ====================

export async function confirmCharge(requestId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const record = await creditDao.getConsumptionByRequestIdForUpdate(conn, requestId);
    if (!record) {
      await conn.rollback();
      throw new BusinessError(404, '预扣记录不存在');
    }
    if (record.status === CREDIT_RECORD_STATUS.CONFIRMED) {
      await conn.rollback();
      return { alreadyConfirmed: true };
    }

    await creditDao.confirmConsumption(record.id, record.credit_before - record.consumed, conn);
    await creditDao.insertRequestLog({
      requestId: `${requestId}_confirm`, userId: record.user_id, action: 'confirm',
      creditAmount: record.consumed, remark: 'confirmed', requestBody: {}, responseBody: {}, status: 1,
    }, conn);
    await conn.commit();
    return { confirmed: true, recordId: record.id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ==================== 回滚 ====================

export async function rollbackCharge(requestId, remark = '') {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const record = await creditDao.getConsumptionByRequestIdForUpdate(conn, requestId);
    if (!record) {
      await conn.rollback();
      throw new BusinessError(404, '预扣记录不存在');
    }
    if (record.status === CREDIT_RECORD_STATUS.ROLLED_BACK) {
      await conn.rollback();
      return { alreadyRolledBack: true };
    }

    await creditDao.updateCreditBalance(record.user_id, record.consumed, conn);
    await creditDao.refundConsumption(record.id, record.credit_before, remark || '系统回滚', conn);
    await creditDao.insertRequestLog({
      requestId: `${requestId}_rollback`, userId: record.user_id, action: 'rollback',
      creditAmount: record.consumed, remark: remark || 'system rollback', requestBody: {}, responseBody: {}, status: 1,
    }, conn);
    await conn.commit();
    return { rolledBack: true, recordId: record.id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ==================== 简单消费（兼容旧接口） ====================

export async function consumeCredit(userId, action, batchCount = 1) {
  const consumed = calcConsumed(action, batchCount);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const membership = await creditDao.getMembershipForUpdate(conn, userId);
    if (!membership) {
      await conn.rollback();
      throw new BusinessError(403, '会员信息不存在');
    }

    const plan = await creditDao.getPlanByType(membership.plan_type);

    if (plan) {
      if (plan.batch_limit > 0 && batchCount > plan.batch_limit) {
        await conn.rollback();
        throw new BusinessError(4103, `单次批量上限为 ${plan.batch_limit} 张`);
      }
      if (plan.daily_limit > 0) {
        const dailyUsed = await creditDao.getDailyUsedCredits(userId, conn);
        if (dailyUsed + consumed > plan.daily_limit) {
          await conn.rollback();
          throw new BusinessError(4103, '超出每日消费上限');
        }
      }
      if (plan.monthly_limit > 0) {
        const monthlyUsed = await creditDao.getMonthlyUsedCredits(userId, conn);
        if (monthlyUsed + consumed > plan.monthly_limit) {
          await conn.rollback();
          throw new BusinessError(4103, '超出每月消费上限');
        }
      }
    }

    const creditBefore = membership.credit_balance;
    if (creditBefore < consumed) {
      await conn.rollback();
      throw new BusinessError(4103, '点数不足');
    }

    const ok = await creditDao.updateCreditBalance(userId, -consumed, conn);
    if (!ok) {
      await conn.rollback();
      throw new BusinessError(500, '扣费失败');
    }

    const creditAfter = creditBefore - consumed;

    await creditDao.insertConsumptionLog({
      userId, type: 2, action, creditBefore, creditAfter, consumed,
      remark: `batch=${batchCount}`, taskId: '', status: 1,
    }, conn);

    await conn.commit();
    return { success: true, creditBefore, creditAfter, consumed };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ==================== 管理员退款 ====================

export async function adminRefundCredit(recordId, remark) {
  return creditDao.adminRefund(0, recordId, remark);
}

export async function listConsumptionRecords(opts) {
  return creditDao.listConsumptionRecords(opts);
}

// ==================== 会员/套餐 ====================

export async function initFreeMembership(userId) {
  const plan = await creditDao.getPlanByType(0);
  const trialQuota = plan?.credits || 50;
  const dailyCredits = plan?.daily_credits || 5;
  await creditDao.insertMembership(userId, 0, trialQuota);
  return { trialQuota, dailyCredits };
}

export async function getUserMembership(userId) {
  const m = await creditDao.getMembership(userId);
  if (!m) return null;
  const plan = await creditDao.getPlanByType(m.plan_type);
  return { ...m, plan };
}

export async function getAvailablePlans() {
  return creditDao.listActivePlans();
}

// ==================== 每日签到 ====================

const CHECK_IN_REWARDS = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 5, 6: 5, 7: 8 };

export async function checkIn(userId) {
  const today = new Date().toISOString().slice(0, 10);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const todayRow = await creditDao.getCheckInByDate(userId, today, conn);
    if (todayRow) {
      await conn.rollback();
      throw new BusinessError(409, '今日已签到');
    }

    const prevRow = await creditDao.getLastCheckIn(userId);
    let streak = 1;
    if (prevRow) {
      const prevDate = new Date(prevRow.check_date);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      if (prevDate.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10)) {
        streak = prevRow.streak + 1;
      }
    }
    if (streak > 7) streak = 1;

    const reward = CHECK_IN_REWARDS[streak] || 2;

    await creditDao.insertCheckIn(userId, today, streak, reward, conn);

    const membership = await creditDao.getMembershipForUpdate(conn, userId);
    if (membership) {
      const creditBefore = membership.credit_balance;
      await creditDao.updateCreditBalance(userId, reward, conn);
      await creditDao.insertConsumptionLog({
        userId, type: 1, action: 'daily_checkin',
        creditBefore, creditAfter: creditBefore + reward,
        consumed: -reward, remark: `签到第${streak}天`, taskId: '', status: 1,
      }, conn);
    }

    await conn.commit();
    return { streak, reward, today };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getCheckInStatus(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = await creditDao.getCheckInByDate(userId, today);
  const lastRow = await creditDao.getLastCheckIn(userId);
  const weekRows = await creditDao.getWeekCheckIns(userId);
  return {
    checkedInToday: !!todayRow,
    todayReward: todayRow?.reward || 0,
    streak: lastRow?.streak || 0,
    weekHistory: weekRows.map(r => ({ date: r.check_date, reward: r.reward })),
    nextReward: CHECK_IN_REWARDS[(lastRow?.streak || 0) + 1] || 2,
    rewards: CHECK_IN_REWARDS,
  };
}

// ==================== 分享/邀请奖励 ====================

const SHARE_REWARD = 2;
const INVITE_REWARD = 10;

export async function shareReward(userId) {
  const today = new Date().toISOString().slice(0, 10);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const record = await creditDao.getActionRecordToday(userId, 'share_reward', today, conn);
    if (record) {
      await conn.rollback();
      return { alreadyClaimed: true };
    }

    const membership = await creditDao.getMembershipForUpdate(conn, userId);
    if (!membership) {
      await conn.rollback();
      throw new BusinessError(404, '会员不存在');
    }

    const creditBefore = membership.credit_balance;
    await creditDao.updateCreditBalance(userId, SHARE_REWARD, conn);
    await creditDao.insertConsumptionLog({
      userId, type: 1, action: 'share_reward',
      creditBefore, creditAfter: creditBefore + SHARE_REWARD,
      consumed: -SHARE_REWARD, remark: '分享奖励', taskId: '', status: 1,
    }, conn);

    await conn.commit();
    return { reward: SHARE_REWARD, creditBefore, creditAfter: creditBefore + SHARE_REWARD };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function inviteReward(inviterId, invitedUserId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const record = await creditDao.getInviteRewardRecord(inviterId, invitedUserId, conn);
    if (record) {
      await conn.rollback();
      return { alreadyClaimed: true };
    }

    const membership = await creditDao.getMembershipForUpdate(conn, inviterId);
    if (!membership) {
      await conn.rollback();
      return { error: 'inviter not found' };
    }

    const creditBefore = membership.credit_balance;
    await creditDao.updateCreditBalance(inviterId, INVITE_REWARD, conn);
    await creditDao.insertConsumptionLog({
      userId: inviterId, type: 1, action: 'invite_reward',
      creditBefore, creditAfter: creditBefore + INVITE_REWARD,
      consumed: -INVITE_REWARD, remark: `invited:${invitedUserId}`, taskId: '', status: 1,
    }, conn);

    await conn.commit();
    return { reward: INVITE_REWARD, inviterId, invitedUserId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ==================== 每日自动赠送 ====================

export async function dailyCreditReward() {
  const plan = await creditDao.getPlanByType(0);
  if (!plan || !plan.daily_credits || plan.daily_credits <= 0) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // FOR UPDATE 锁定用户行，防止并发重复发放
    const members = await creditDao.getFreePlanMembersForUpdate(conn);
    if (!members.length) { await conn.rollback(); return 0; }

    const daily = plan.daily_credits;
    const affected = await creditDao.batchUpdateFreePlanCredits(daily, conn);
    await creditDao.batchInsertConsumptionLogs(
      members.map(m => ({
        userId: m.user_id, type: 1, action: 'daily_free',
        creditBefore: m.credit_balance, creditAfter: m.credit_balance + daily,
        consumed: -daily, remark: '每日免费赠送',
      })),
      conn,
    );

    await conn.commit();
    return affected;
  } catch (err) {
    await conn.rollback();
    logger.error('[Credit] 每日赠送失败', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

// ==================== 积分查询 ====================

export async function getCreditHistory(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const [list, total] = await Promise.all([
    creditDao.getCreditHistory(userId, offset, pageSize),
    creditDao.getCreditHistoryCount(userId),
  ]);
  return { list, total, page, pageSize };
}

export async function getCreditBalance(userId) {
  const m = await creditDao.getMembership(userId);
  if (!m) return { balance: 0, planType: 0 };
  const plan = await creditDao.getPlanByType(m.plan_type);
  return { balance: m.credit_balance, planType: m.plan_type, planName: plan?.name || '免费版' };
}
