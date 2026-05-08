/**
 * 会员权益门控 — 检查用户当前套餐的 feature flag
 * G5 后端 | 阶段4
 */
import pool from '../dao/db.js';

/**
 * 检查用户是否有指定功能权益
 * @param {number} userId
 * @param {string} feature - 'watermark_free'|'hd_export'|'brand_kit'|'priority_queue'
 * @returns {Promise<boolean>}
 */
export async function hasFeature(userId, feature) {
  const [rows] = await pool.query(
    `SELECT mp.${feature} FROM user_membership um
     JOIN membership_plan mp ON mp.plan_type = um.plan_type AND mp.status = 1
     WHERE um.user_id = ?`,
    [userId],
  );
  return rows?.[0]?.[feature] === 1;
}

/**
 * 获取用户当前套餐的 batch_limit
 */
export async function getBatchLimit(userId) {
  const [rows] = await pool.query(
    'SELECT mp.batch_limit FROM user_membership um JOIN membership_plan mp ON mp.plan_type = um.plan_type WHERE um.user_id = ?',
    [userId],
  );
  return rows?.[0]?.batch_limit || 1;
}

/**
 * 获取用户当前套餐的 save_days
 */
export async function getSaveDays(userId) {
  const [rows] = await pool.query(
    'SELECT mp.save_days FROM user_membership um JOIN membership_plan mp ON mp.plan_type = um.plan_type WHERE um.user_id = ?',
    [userId],
  );
  return rows?.[0]?.save_days || 30;
}

export default { hasFeature, getBatchLimit, getSaveDays };
