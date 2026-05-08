/**
 * 会员权益门控 — 检查用户当前套餐的 feature flag
 */
import pool from '../dao/db.js';

const ALLOWED_FEATURES = new Set(['watermark_free', 'hd_export', 'brand_kit', 'priority_queue']);

/**
 * 获取用户当前套餐的完整计划行（含所有权益字段）
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
async function getUserPlan(userId) {
  const [rows] = await pool.query(
    `SELECT mp.* FROM user_membership um
     JOIN membership_plan mp ON mp.plan_type = um.plan_type AND mp.status = 1
     WHERE um.user_id = ?`,
    [userId],
  );
  return rows?.[0] || null;
}

/**
 * 检查用户是否有指定功能权益
 * @param {number} userId
 * @param {string} feature - 'watermark_free'|'hd_export'|'brand_kit'|'priority_queue'
 * @returns {Promise<boolean>}
 */
export async function hasFeature(userId, feature) {
  if (!ALLOWED_FEATURES.has(feature)) {
    throw new Error(`非法的权益字段: ${feature}`);
  }
  const plan = await getUserPlan(userId);
  return plan?.[feature] === 1;
}

/**
 * 获取用户当前套餐的 batch_limit
 */
export async function getBatchLimit(userId) {
  const plan = await getUserPlan(userId);
  return plan?.batch_limit || 1;
}

/**
 * 获取用户当前套餐的 save_days
 */
export async function getSaveDays(userId) {
  const plan = await getUserPlan(userId);
  return plan?.save_days || 30;
}

export default { hasFeature, getBatchLimit, getSaveDays };
