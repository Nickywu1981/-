import { BusinessError } from '../utils/businessError.js';
import { appUrl } from '../config/index.js';

/**
 * Movio AI v4.1 — Distribution Service (分销系统)
 * G6 数据库接口 | 通过 distributionDao 访问数据库
 * 分销关系 / 佣金计算 / 提现 / 团队数据
 */
import db from '../dao/db.js';
import * as distDao from '../dao/distributionDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 分销佣金比例
const COMMISSION_RATES = {
  level1: 15,  // 直推 15%
  level2: 5,   // 间推 5%
};

// ============================================================
// 获取用户邀请码
// ============================================================
export async function getMyInviteCode(userId) {
  const user = await distDao.getInviteCode(userId);
  if (!user) throw new BusinessError(ERROR_CODE.USER_NOT_FOUND);
  return { invite_code: user.invite_code, nickname: user.nickname };
}

// ============================================================
// 获取我的推广团队（一级+二级）
// ============================================================
export async function getMyTeam(userId, { page = 1, pageSize = 20 } = {}) {
  const [total, rows, counts] = await Promise.all([
    distDao.getTeamTotal(userId),
    distDao.getTeamMembers(userId, { page, pageSize }),
    distDao.getLevelCounts(userId),
  ]);
  return { list: rows, total, page, pageSize, stats: counts };
}

// ============================================================
// 佣金结算（消费时触发）
// ============================================================
export async function settleCommission(consumerId, orderId, orderAmount) {
  const safeAmount = Number(orderAmount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new BusinessError(ERROR_CODE.PARAM_INVALID);
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const relation = await distDao.getRelationByUser(consumerId);
    if (!relation) {
      await conn.commit();
      return [];
    }

    // 幂等检查
    if (await distDao.checkDuplicateCommission(orderId, conn)) {
      await conn.commit();
      return [];
    }

    const commissions = [];
    const { parent_id, grandparent_id } = relation;

    if (parent_id) {
      const rate = COMMISSION_RATES.level1;
      const amount = Math.round(safeAmount * rate) / 100;
      await distDao.insertCommission({
        distributorId: parent_id, consumerId, orderId,
        orderAmount, rate, amount, level: 1,
      }, conn);
      commissions.push({ level: 1, distributor_id: parent_id, amount });
    }

    if (grandparent_id) {
      const rate = COMMISSION_RATES.level2;
      const amount = Math.round(safeAmount * rate) / 100;
      await distDao.insertCommission({
        distributorId: grandparent_id, consumerId, orderId,
        orderAmount, rate, amount, level: 2,
      }, conn);
      commissions.push({ level: 2, distributor_id: grandparent_id, amount });
    }

    await conn.commit();
    return commissions;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// 可提现佣金余额
// ============================================================
export async function getCommissionBalance(userId) {
  return distDao.getCommissionBalance(userId);
}

// ============================================================
// 佣金提现
// ============================================================
export async function withdrawCommission(userId, amount) {
  if (amount <= 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const availableAmount = await distDao.getAvailableBalanceForUpdate(userId, conn);
    const requestAmount = Number(amount) || 0;
    if (availableAmount < requestAmount) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

    // 逐笔扣减
    let remaining = requestAmount;
    const pendingCommissions = await distDao.getPendingCommissions(userId, conn);

    const withdrawIds = [];
    for (const row of pendingCommissions) {
      if (remaining <= 0) break;
      const rowCommission = parseFloat(Number(row.commission).toFixed(2));
      if (rowCommission <= remaining + 0.001) {
        withdrawIds.push(row.id);
        remaining = parseFloat((remaining - rowCommission).toFixed(2));
      }
    }
    const actualWithdrawn = parseFloat((requestAmount - remaining).toFixed(2));
    if (actualWithdrawn <= 0) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

    await distDao.markCommissionsWithdrawn(withdrawIds, conn);

    await conn.commit();
    return { withdrawn: actualWithdrawn, from_balance: availableAmount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// 佣金流水
// ============================================================
export async function getCommissionHistory(userId, { page = 1, pageSize = 20 } = {}) {
  return distDao.getCommissionHistory(userId, { page, pageSize });
}

// ============================================================
// Phase 2: 分销等级体系
// ============================================================
const DISTRIBUTION_TIERS = {
  bronze: { label: '铜牌推广', minSales: 0, rateBonus: 0, level2Enabled: false },
  silver: { label: '银牌推广', minSales: 5000, rateBonus: 2, level2Enabled: true },
  gold:   { label: '金牌推广', minSales: 20000, rateBonus: 5, level2Enabled: true },
  diamond:{ label: '钻石合伙人', minSales: 100000, rateBonus: 10, level2Enabled: true },
};

const PROMO_ASSETS = [
  { type: 'image', key: 'invite_card', label: '邀请卡' },
  { type: 'image', key: 'poster_1', label: '推广海报A' },
  { type: 'image', key: 'poster_2', label: '推广海报B' },
  { type: 'copy', key: 'invite_text', label: '邀请文案', content: '发现一个超好用的AI电商工具，快来免费试用！' },
];

const VIRAL_CAMPAIGNS = [
  { id: 'double_commission', title: '双倍佣金周', description: '活动期间直推佣金翻倍至30%', bonusRate: 2, active: true },
  { id: 'invite_3_reward', title: '拉3送VIP', description: '成功邀请3位有效用户，赠送1个月高级会员', targetCount: 3, reward: '1month_vip', active: true },
];

export function getDistributionTiers() { return DISTRIBUTION_TIERS; }

export async function getUserTier(userId) {
  const totalSales = await distDao.getTotalSales(userId);
  let tierKey = 'bronze';
  for (const [key, tier] of Object.entries(DISTRIBUTION_TIERS)) {
    if (totalSales >= tier.minSales) tierKey = key;
  }
  return { tier: tierKey, ...DISTRIBUTION_TIERS[tierKey], totalSales };
}

export async function getTeamPerformance(userId, { page = 1, pageSize = 20 } = {}) {
  return distDao.getTeamPerformance(userId, { page, pageSize });
}

export function getPromoAssets() { return PROMO_ASSETS; }

export async function getMyPromoLink(userId) {
  const user = await distDao.getInviteCode(userId);
  if (!user) throw new BusinessError(ERROR_CODE.USER_NOT_FOUND);
  const baseUrl = appUrl;
  const inviteUrl = `${baseUrl}/register?ref=${user.invite_code}`;
  return { invite_code: user.invite_code, invite_url: inviteUrl, assets: PROMO_ASSETS };
}

export function getViralCampaigns() { return VIRAL_CAMPAIGNS; }

export async function getMyCampaignProgress(userId) {
  const monthlyInvites = await distDao.getMonthlyInviteCount(userId);
  return { campaigns: VIRAL_CAMPAIGNS, progress: { monthlyInvites, targetForVIP: 3 } };
}

// ============================================================
// 推广转化统计（分销看板使用）
// ============================================================
export async function getStats(userId) {
  const registers = await distDao.getTotalRegisters(userId);
  const estimatedClicks = Math.max(registers * 5, registers > 0 ? 10 : 0);
  const rate = estimatedClicks > 0 ? ((registers / estimatedClicks) * 100).toFixed(1) : '0';
  return { clicks: estimatedClicks, registers, rate };
}

export { DISTRIBUTION_TIERS, COMMISSION_RATES, PROMO_ASSETS, VIRAL_CAMPAIGNS };
