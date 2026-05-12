import pool from './db.js';

const COLS = 'id, user_id, plan_type, status, trial_quota, trial_used, credit_balance, start_time, end_time, auto_renew, create_time, update_time, is_deleted, tenant_id';

const membershipDao = {
  async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT id, user_id, plan_type, status, trial_quota, trial_used, credit_balance, start_time, end_time, auto_renew FROM user_membership WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  },

  async upsert(userId, data, conn) {
    const db = conn || pool;
    await db.execute(
      `INSERT INTO user_membership (user_id, plan_type, credit_balance, start_time, end_time)
       VALUES (?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         plan_type = VALUES(plan_type),
         end_time = VALUES(end_time)`,
      [userId, data.plan_type ?? 0, data.credit_balance || 0, data.end_time || null],
    );
    return this.findByUserId(userId);
  },

  async setAutoRenew(userId, autoRenew) {
    const [r] = await pool.execute('UPDATE user_membership SET auto_renew = ? WHERE user_id = ?', [autoRenew ? 1 : 0, userId]);
    return r.affectedRows;
  },
};

export default membershipDao;
