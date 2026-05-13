import { BusinessError } from '../utils/businessError.js';
import { appUrl } from '../config/index.js';

/**
 * Movio AI v4.1 — Distribution Service (分销系统)
 * G5 后端开发 | W4
 * 分销关系 / 佣金计算 / 提现 / 团队数据
 */
import db from '../dao/db.js';
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
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT invite_code, nickname FROM `users` WHERE id = ?', [userId]);
    if (rows.length === 0) throw new BusinessError(ERROR_CODE.USER_NOT_FOUND);
    return { invite_code: rows[0].invite_code, nickname: rows[0].nickname };
  } finally {
    conn.release();
  }
}

// ============================================================
// 获取我的推广团队（一级+二级）
// ============================================================
export async function getMyTeam(userId, { page = 1, pageSize = 20 } = {}) {
  const conn = await db.getConnection();
  try {
    // 统计直推+间推人数
    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) as total FROM distributor_relation WHERE parent_id = ? OR grandparent_id = ?',
      [userId, userId],
    );

    // 分页查询
    const [rows] = await conn.query(
      `SELECT dr.id, dr.user_id, dr.level, dr.bound_at, u.nickname, u.avatar_url
       FROM distributor_relation dr
       JOIN users u ON u.id = dr.user_id
       WHERE dr.parent_id = ? OR dr.grandparent_id = ?
       ORDER BY dr.bound_at DESC LIMIT ? OFFSET ?`,
      [userId, userId, pageSize, (page - 1) * pageSize],
    );

    // 统计直推/间推数量
    const [[{ level1_count }]] = await conn.query(
      'SELECT COUNT(*) as level1_count FROM distributor_relation WHERE parent_id = ?',
      [userId],
    );
    const [[{ level2_count }]] = await conn.query(
      'SELECT COUNT(*) as level2_count FROM distributor_relation WHERE grandparent_id = ?',
      [userId],
    );

    return {
      list: rows,
      total,
      page,
      pageSize,
      stats: { level1_count, level2_count },
    };
  } finally {
    conn.release();
  }
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

    // 查找分销关系
    const [relations] = await conn.query(
      'SELECT parent_id, grandparent_id, level FROM distributor_relation WHERE user_id = ? LIMIT 1',
      [consumerId],
    );

    const commissions = [];

    if (relations.length > 0) {
      const { parent_id, grandparent_id } = relations[0];

      // 幂等检查：防止同一订单重复结算
      const [existing] = await conn.query(
        'SELECT id FROM distributor_commission WHERE order_id = ? LIMIT 1',
        [orderId],
      );
      if (existing.length > 0) {
        await conn.commit();
        return [];
      }

      // 一级佣金
      if (parent_id) {
        const rate = COMMISSION_RATES.level1;
        const amount = Math.round(safeAmount * rate) / 100;
        await conn.query(
          `INSERT INTO distributor_commission (distributor_id, consumer_id, order_id, order_amount, commission_rate, commission, level, status)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'settled')`,
          [parent_id, consumerId, orderId, orderAmount, rate, amount],
        );
        commissions.push({ level: 1, distributor_id: parent_id, amount });
      }

      // 二级佣金
      if (grandparent_id) {
        const rate = COMMISSION_RATES.level2;
        const amount = Math.round(safeAmount * rate) / 100;
        await conn.query(
          `INSERT INTO distributor_commission (distributor_id, consumer_id, order_id, order_amount, commission_rate, commission, level, status)
           VALUES (?, ?, ?, ?, ?, ?, 2, 'settled')`,
          [grandparent_id, consumerId, orderId, orderAmount, rate, amount],
        );
        commissions.push({ level: 2, distributor_id: grandparent_id, amount });
      }
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
  const conn = await db.getConnection();
  try {
    const [[result]] = await conn.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'settled' THEN commission ELSE 0 END), 0) as available,
         COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN commission ELSE 0 END), 0) as withdrawn,
         COALESCE(SUM(commission), 0) as total
       FROM distributor_commission WHERE distributor_id = ?`,
      [userId],
    );
    return result;
  } finally {
    conn.release();
  }
}

// ============================================================
// 佣金提现
// ============================================================
export async function withdrawCommission(userId, amount) {
  if (amount <= 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 查可用余额（FOR UPDATE 防并发提现）
    const [[balance]] = await conn.query(
      `SELECT COALESCE(SUM(commission), 0) as available
       FROM distributor_commission WHERE distributor_id = ? AND status = 'settled' FOR UPDATE`,
      [userId],
    );

    const availableAmount = Number(balance.available) || 0;
    const requestAmount = Number(amount) || 0;
    if (availableAmount < requestAmount) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);

    // 逐笔扣减
    let remaining = requestAmount;
    const [pendingCommissions] = await conn.query(
      `SELECT id, commission FROM distributor_commission
       WHERE distributor_id = ? AND status = 'settled' ORDER BY id ASC FOR UPDATE`,
      [userId],
    );

    // 批量标记已提现
    const withdrawIds = [];
    for (const row of pendingCommissions) {
      if (remaining <= 0) break;
      const rowCommission = parseFloat(Number(row.commission).toFixed(2));
      if (rowCommission <= remaining + 0.001) {  // 浮点容差
        withdrawIds.push(row.id);
        remaining = parseFloat((remaining - rowCommission).toFixed(2));
      }
    }
    const actualWithdrawn = parseFloat((requestAmount - remaining).toFixed(2));
    if (actualWithdrawn <= 0) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);
    if (withdrawIds.length > 0) {
      await conn.query(
        `UPDATE distributor_commission SET status = 'withdrawn', settled_at = NOW() WHERE id IN (${withdrawIds.map(() => '?').join(',')})`,
        withdrawIds,
      );
    }

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
  const conn = await db.getConnection();
  try {
    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) as total FROM distributor_commission WHERE distributor_id = ?',
      [userId],
    );
    const [rows] = await conn.query(
      `SELECT dc.id, dc.consumer_id, dc.order_amount, dc.commission_rate, dc.commission, dc.level, dc.status, dc.created_at, dc.settled_at,
              u.nickname as consumer_name
       FROM distributor_commission dc
       LEFT JOIN users u ON u.id = dc.consumer_id
       WHERE dc.distributor_id = ?
       ORDER BY dc.created_at DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, (page - 1) * pageSize],
    );
    return { list: rows, total, page, pageSize };
  } finally {
    conn.release();
  }
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
  const conn = await db.getConnection();
  try {
    const [[{ totalSales }]] = await conn.query(
      'SELECT COALESCE(SUM(commission), 0) as totalSales FROM distributor_commission WHERE distributor_id = ? AND status IN (?,?)',
      [userId, 'settled', 'withdrawn'],
    );
    let tierKey = 'bronze';
    for (const [key, tier] of Object.entries(DISTRIBUTION_TIERS)) {
      if (totalSales >= tier.minSales) tierKey = key;
    }
    return { tier: tierKey, ...DISTRIBUTION_TIERS[tierKey], totalSales };
  } finally { conn.release(); }
}

export async function getTeamPerformance(userId, { page = 1, pageSize = 20 } = {}) {
  const conn = await db.getConnection();
  try {
    const [members] = await conn.query(
      `SELECT u.id, u.nickname, dr.level, dr.bound_at, COALESCE(SUM(dc.commission), 0) as contributed
       FROM distributor_relation dr JOIN users u ON u.id = dr.user_id
       LEFT JOIN distributor_commission dc ON dc.consumer_id = dr.user_id
       WHERE dr.parent_id = ? OR dr.grandparent_id = ?
       GROUP BY u.id, u.nickname, dr.level, dr.bound_at
       ORDER BY contributed DESC LIMIT ? OFFSET ?`,
      [userId, userId, pageSize, (page - 1) * pageSize],
    );
    const [[agg]] = await conn.query(
      'SELECT COUNT(*) as totalMembers, COALESCE(SUM(dc.commission), 0) as totalContribution FROM distributor_relation dr LEFT JOIN distributor_commission dc ON dc.consumer_id = dr.user_id WHERE dr.parent_id = ? OR dr.grandparent_id = ?',
      [userId, userId],
    );
    return { members, totalMembers: agg.totalMembers, totalContribution: agg.totalContribution, page, pageSize };
  } finally { conn.release(); }
}

export function getPromoAssets() { return PROMO_ASSETS; }

export async function getMyPromoLink(userId) {
  const [[user]] = await db.query('SELECT invite_code FROM `users` WHERE id = ?', [userId]);
  if (!user) throw new BusinessError(ERROR_CODE.USER_NOT_FOUND);
  const baseUrl = appUrl;
  const inviteUrl = `${baseUrl}/register?ref=${user.invite_code}`;
  return { invite_code: user.invite_code, invite_url: inviteUrl, assets: PROMO_ASSETS };
}

export function getViralCampaigns() { return VIRAL_CAMPAIGNS; }

export async function getMyCampaignProgress(userId) {
  const conn = await db.getConnection();
  try {
    const [[{ monthlyInvites }]] = await conn.query(
      'SELECT COUNT(*) as monthlyInvites FROM distributor_relation WHERE parent_id = ? AND bound_at >= DATE_FORMAT(NOW(), ?)',
      [userId, '%Y-%m-01'],
    );
    return { campaigns: VIRAL_CAMPAIGNS, progress: { monthlyInvites, targetForVIP: 3 } };
  } finally { conn.release(); }
}

// ============================================================
// 推广转化统计（分销看板使用）
// ============================================================
export async function getStats(userId) {
  const conn = await db.getConnection();
  try {
    const [[{ registers }]] = await conn.query(
      'SELECT COUNT(*) as registers FROM distributor_relation WHERE parent_id = ? OR grandparent_id = ?',
      [userId, userId],
    );
    // 点击量暂用注册数的5倍估算（实际应在推广链接点击时记录）
    const estimatedClicks = Math.max(registers * 5, registers > 0 ? 10 : 0);
    const rate = estimatedClicks > 0 ? ((registers / estimatedClicks) * 100).toFixed(1) : '0';
    return { clicks: estimatedClicks, registers, rate };
  } finally { conn.release(); }
}

export { DISTRIBUTION_TIERS, COMMISSION_RATES, PROMO_ASSETS, VIRAL_CAMPAIGNS };
