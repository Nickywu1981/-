/**
 * Movio AI v4.1 — Points Service (积分系统)
 * G5 后端开发 | W4
 * 积分赚取 / 消费 / 兑换 / 账户管理（乐观锁防超扣）
 */
import db from '../dao/db.js';

// 积分规则
const POINT_RULES = {
  register: 100,        // 注册奖励
  daily_checkin: 10,    // 每日签到
  checkin_streak_bonus: 5, // 连续签到额外
  image_gen: 2,         // 生图
  video_gen: 5,         // 生视频
  action_migrate: 10,   // 动作迁移
  digital_human: 8,     // 数字人
  viral_replicate: 8,   // 爆款复刻
  share_product: 5,     // 分享作品
  invite_register: 50,  // 邀请注册
  invite_purchase: 200, // 邀请首购
  redeem_credits: { 100: 10, 500: 60, 1000: 150 }, // 积分兑换点数 (积分:点数)
};

// ============================================================
// 获取/创建积分账户
// ============================================================
async function getOrCreateAccount(conn, userId) {
  const [rows] = await conn.query('SELECT * FROM points_account WHERE user_id = ?', [userId]);
  if (rows.length > 0) return rows[0];
  await conn.query(
    'INSERT INTO points_account (user_id, balance, total_earned, total_spent, frozen) VALUES (?, 0, 0, 0, 0)',
    [userId]
  );
  return { user_id: userId, balance: 0, total_earned: 0, total_spent: 0, frozen: 0, version: 1 };
}

// ============================================================
// 赚取积分（带乐观锁）
// ============================================================
export async function earnPoints(userId, { amount, businessType, businessId, remark = '' }) {
  if (amount <= 0) throw { status: 400, message: '积分数量必须大于0' };

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const account = await getOrCreateAccount(conn, userId);

    // 乐观锁更新
    const [result] = await conn.query(
      `UPDATE points_account SET balance = balance + ?, total_earned = total_earned + ?, version = version + 1
       WHERE user_id = ? AND version = ?`,
      [amount, amount, userId, account.version]
    );
    if (result.affectedRows === 0) throw { status: 409, message: '积分更新冲突，请重试' };

    const newBalance = account.balance + amount;

    // 记录流水
    await conn.query(
      `INSERT INTO points_transaction (user_id, trans_type, amount, balance_after, business_type, business_id, remark)
       VALUES (?, 'earn', ?, ?, ?, ?, ?)`,
      [userId, amount, newBalance, businessType, businessId || null, remark]
    );

    await conn.commit();
    return { user_id: userId, balance: newBalance, earned: amount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// 消费积分（带乐观锁防超扣）
// ============================================================
export async function spendPoints(userId, { amount, businessType, businessId, remark = '' }) {
  if (amount <= 0) throw { status: 400, message: '积分数量必须大于0' };

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const account = await getOrCreateAccount(conn, userId);
    if (account.balance < amount) throw { status: 400, message: `积分不足，当前余额 ${account.balance}` };

    const [result] = await conn.query(
      `UPDATE points_account SET balance = balance - ?, total_spent = total_spent + ?, version = version + 1
       WHERE user_id = ? AND version = ? AND balance >= ?`,
      [amount, amount, userId, account.version, amount]
    );
    if (result.affectedRows === 0) throw { status: 409, message: '积分更新冲突或余额不足，请重试' };

    const newBalance = account.balance - amount;

    await conn.query(
      `INSERT INTO points_transaction (user_id, trans_type, amount, balance_after, business_type, business_id, remark)
       VALUES (?, 'spend', ?, ?, ?, ?, ?)`,
      [userId, -amount, newBalance, businessType, businessId || null, remark]
    );

    await conn.commit();
    return { user_id: userId, balance: newBalance, spent: amount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// 积分兑换点数
// ============================================================
export async function redeemPointsForCredits(userId, pointsAmount) {
  const rates = POINT_RULES.redeem_credits;
  const creditAmount = rates[pointsAmount];
  if (!creditAmount) throw { status: 400, message: `不支持该兑换档位，可选: ${Object.keys(rates).join(', ')}` };

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const account = await getOrCreateAccount(conn, userId);
    if (account.balance < pointsAmount) throw { status: 400, message: `积分不足，当前余额 ${account.balance}` };

    // 扣积分
    const [result] = await conn.query(
      `UPDATE points_account SET balance = balance - ?, total_spent = total_spent + ?, version = version + 1
       WHERE user_id = ? AND version = ? AND balance >= ?`,
      [pointsAmount, pointsAmount, userId, account.version, pointsAmount]
    );
    if (result.affectedRows === 0) throw { status: 409, message: '兑换失败，请重试' };

    const newBalance = account.balance - pointsAmount;

    await conn.query(
      `INSERT INTO points_transaction (user_id, trans_type, amount, balance_after, business_type, remark)
       VALUES (?, 'spend', ?, ?, 'redeem_credits', ?)`,
      [userId, -pointsAmount, newBalance, `兑换${creditAmount}点数`]
    );

    // 加点数到会员账户
    const [membership] = await conn.query(
      'UPDATE user_membership SET credit_balance = credit_balance + ? WHERE user_id = ?',
      [creditAmount, userId]
    );
    if (membership.affectedRows === 0) {
      await conn.rollback();
      throw { status: 404, message: '会员账户不存在' };
    }

    await conn.commit();
    return { user_id: userId, points_balance: newBalance, redeemed_credits: creditAmount, cost_points: pointsAmount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// 查询积分账户
// ============================================================
export async function getPointsAccount(userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT user_id, balance, total_earned, total_spent, frozen FROM points_account WHERE user_id = ?', [userId]);
    return rows.length > 0 ? rows[0] : { user_id: userId, balance: 0, total_earned: 0, total_spent: 0, frozen: 0 };
  } finally {
    conn.release();
  }
}

// ============================================================
// 积分流水
// ============================================================
export async function getPointsTransactions(userId, { page = 1, pageSize = 20 } = {}) {
  const conn = await db.getConnection();
  try {
    const [[{ total }]] = await conn.query('SELECT COUNT(*) as total FROM points_transaction WHERE user_id = ?', [userId]);
    const [rows] = await conn.query(
      'SELECT id, trans_type, amount, balance_after, business_type, remark, created_at FROM points_transaction WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, (page - 1) * pageSize]
    );
    return { list: rows, total, page, pageSize };
  } finally {
    conn.release();
  }
}

// ============================================================
// 业务触发：自动赚取积分
// ============================================================
export async function awardPointsForTask(userId, taskType, taskId) {
  const points = POINT_RULES[taskType] || 0;
  if (points <= 0) return null;

  // 防重：同一任务只奖励一次
  const conn = await db.getConnection();
  try {
    const [existing] = await conn.query(
      'SELECT id FROM points_transaction WHERE user_id = ? AND business_type = ? AND business_id = ?',
      [userId, taskType, taskId]
    );
    if (existing.length > 0) return null; // 已奖励
  } finally {
    conn.release();
  }

  return earnPoints(userId, { amount: points, businessType: taskType, businessId: taskId, remark: `完成${taskType}任务` });
}

export { POINT_RULES };
