import * as creditDao from '../dao/creditDao.js';
import { BusinessError } from '../utils/businessError.js';

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
  const cached = await creditDao.getRequestLog(requestId);
  if (cached) {
    const record = await creditDao.getConsumptionByRequestId(requestId);
    return { idempotent: true, recordId: record?.id, status: cached.status };
  }

  const membership = await creditDao.getMembership(userId);
  if (!membership) throw new BusinessError(403, '会员信息不存在');

  const plan = await creditDao.getPlanByType(membership.plan_type);

  const consumedAmount = calcConsumed(action, batchCount, isNight);
  const dailyUsed = await creditDao.getDailyUsedCredits(userId);
  const monthlyUsed = await creditDao.getMonthlyUsedCredits(userId);
  if (plan && plan.daily_limit > 0 && dailyUsed + consumedAmount > plan.daily_limit) {
    throw new BusinessError(4103, '超出每日消费上限');
  }
  if (plan && plan.monthly_limit > 0 && monthlyUsed + consumedAmount > plan.monthly_limit) {
    throw new BusinessError(4103, '超出每月消费上限');
  }
  if (plan && plan.batch_limit > 0 && batchCount > plan.batch_limit) {
    throw new BusinessError(4103, `单次批量上限为 ${plan.batch_limit} 张`);
  }

  const creditBefore = membership.credit_balance;
  if (creditBefore < consumedAmount) {
    throw new BusinessError(4103, '点数不足，请升级会员');
  }

  const ok = await creditDao.updateCreditBalance(userId, -consumedAmount);
  if (!ok) throw new BusinessError(500, '扣费失败');

  const creditAfter = creditBefore - consumedAmount;

  const recordId = await creditDao.insertConsumptionLog({
    userId, type: 2, action, creditBefore, creditAfter, consumed: consumedAmount,
    remark: `freeze batch=${batchCount}`, taskId: '', requestId, status: 0,
  });

  await creditDao.insertRequestLog({
    requestId, userId, action: 'freeze', creditAmount: consumedAmount,
    remark: `action=${action} batchCount=${batchCount}`, requestBody: { action, batchCount }, responseBody: { recordId, creditAfter }, status: 1,
  });

  return { idempotent: false, recordId, creditBefore, creditAfter, consumed: consumedAmount };
}

// ==================== 确认消费 ====================

export async function confirmCharge(requestId) {
  const record = await creditDao.getConsumptionByRequestId(requestId);
  if (!record) throw new BusinessError(404, '预扣记录不存在');
  if (record.status === 1) return { alreadyConfirmed: true };

  await creditDao.confirmConsumption(record.id, record.credit_before - record.consumed);
  await creditDao.insertRequestLog({
    requestId: `${requestId}_confirm`, userId: record.user_id, action: 'confirm',
    creditAmount: record.consumed, remark: 'confirmed', requestBody: {}, responseBody: {}, status: 1,
  });
  return { confirmed: true, recordId: record.id };
}

// ==================== 回滚 ====================

export async function rollbackCharge(requestId, remark = '') {
  const record = await creditDao.getConsumptionByRequestId(requestId);
  if (!record) throw new BusinessError(404, '预扣记录不存在');
  if (record.status === 2) return { alreadyRolledBack: true };

  await creditDao.updateCreditBalance(record.user_id, record.consumed);
  await creditDao.refundConsumption(record.id, record.credit_before, remark || '系统回滚');

  await creditDao.insertRequestLog({
    requestId: `${requestId}_rollback`, userId: record.user_id, action: 'rollback',
    creditAmount: record.consumed, remark: remark || 'system rollback', requestBody: {}, responseBody: {}, status: 1,
  });
  return { rolledBack: true, recordId: record.id };
}

// ==================== 简单消费（兼容旧接口） ====================

export async function consumeCredit(userId, action, batchCount = 1) {
  const membership = await creditDao.getMembership(userId);
  if (!membership) throw new BusinessError(403, '会员信息不存在');

  const plan = await creditDao.getPlanByType(membership.plan_type);
  const consumed = calcConsumed(action, batchCount);

  // daily_limit / monthly_limit / batch_limit 检查（对齐 freezeCredit）
  if (plan) {
    if (plan.batch_limit > 0 && batchCount > plan.batch_limit) {
      throw new BusinessError(4103, `单次批量上限为 ${plan.batch_limit} 张`);
    }
    if (plan.daily_limit > 0) {
      const dailyUsed = await creditDao.getDailyUsedCredits(userId);
      if (dailyUsed + consumed > plan.daily_limit) {
        throw new BusinessError(4103, '超出每日消费上限');
      }
    }
    if (plan.monthly_limit > 0) {
      const monthlyUsed = await creditDao.getMonthlyUsedCredits(userId);
      if (monthlyUsed + consumed > plan.monthly_limit) {
        throw new BusinessError(4103, '超出每月消费上限');
      }
    }
  }

  const creditBefore = membership.credit_balance;
  if (creditBefore < consumed) {
    throw new BusinessError(4103, '点数不足');
  }

  const ok = await creditDao.updateCreditBalance(userId, -consumed);
  if (!ok) throw new BusinessError(500, '扣费失败');

  const creditAfter = creditBefore - consumed;
  await creditDao.insertConsumptionLog({
    userId, type: 2, action, creditBefore, creditAfter, consumed,
    remark: `batch=${batchCount}`, taskId: '', status: 1,
  });
  return { success: true, creditBefore, creditAfter, consumed };
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

  const todayRow = await creditDao.getCheckInByDate(userId, today);
  if (todayRow) {
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

  await creditDao.insertCheckIn(userId, today, streak, reward);

  const membership = await creditDao.getMembership(userId);
  if (membership) {
    const creditBefore = membership.credit_balance;
    await creditDao.updateCreditBalance(userId, reward);
    await creditDao.insertConsumptionLog({
      userId, type: 1, action: 'daily_checkin',
      creditBefore, creditAfter: creditBefore + reward,
      consumed: -reward, remark: `签到第${streak}天`, taskId: '', status: 1,
    });
  }

  return { streak, reward, today };
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
  const record = await creditDao.getActionRecordToday(userId, 'share_reward', today);
  if (record) return { alreadyClaimed: true };

  const membership = await creditDao.getMembership(userId);
  if (!membership) throw new BusinessError(404, '会员不存在');

  const creditBefore = membership.credit_balance;
  await creditDao.updateCreditBalance(userId, SHARE_REWARD);
  await creditDao.insertConsumptionLog({
    userId, type: 1, action: 'share_reward',
    creditBefore, creditAfter: creditBefore + SHARE_REWARD,
    consumed: -SHARE_REWARD, remark: '分享奖励', taskId: '', status: 1,
  });
  return { reward: SHARE_REWARD, creditBefore, creditAfter: creditBefore + SHARE_REWARD };
}

export async function inviteReward(inviterId, invitedUserId) {
  const record = await creditDao.getInviteRewardRecord(inviterId, invitedUserId);
  if (record) return { alreadyClaimed: true };

  const membership = await creditDao.getMembership(inviterId);
  if (!membership) return { error: 'inviter not found' };

  const creditBefore = membership.credit_balance;
  await creditDao.updateCreditBalance(inviterId, INVITE_REWARD);
  await creditDao.insertConsumptionLog({
    userId: inviterId, type: 1, action: 'invite_reward',
    creditBefore, creditAfter: creditBefore + INVITE_REWARD,
    consumed: -INVITE_REWARD, remark: `invited:${invitedUserId}`, taskId: '', status: 1,
  });
  return { reward: INVITE_REWARD, inviterId, invitedUserId };
}

// ==================== 每日自动赠送 ====================

export async function dailyCreditReward() {
  const plan = await creditDao.getPlanByType(0);
  if (!plan || !plan.daily_credits || plan.daily_credits <= 0) return;

  const members = await creditDao.getFreePlanMembers();
  for (const m of members) {
    const daily = plan.daily_credits;
    await creditDao.updateCreditBalance(m.user_id, daily);
    await creditDao.insertConsumptionLog({
      userId: m.user_id, type: 1, action: 'daily_free',
      creditBefore: m.credit_balance, creditAfter: m.credit_balance + daily,
      consumed: -daily, remark: '每日免费赠送', taskId: '', status: 1,
    });
  }
  return members.length;
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
