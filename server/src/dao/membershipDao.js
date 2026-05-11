import pool from './db.js';

const COLS = 'id, user_id, plan_type, status, trial_quota, trial_used, credit_balance, start_time, end_time, auto_renew, create_time, update_time, is_deleted, tenant_id';

const membershipDao = {
  async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT id, user_id, plan_type, status, trial_quota, trial_used, credit_balance, start_time, end_time, auto_renew FROM user_membership WHERE user_id = ?', [userId]);
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
    await pool.execute('UPDATE user_membership SET auto_renew = ? WHERE user_id = ?', [autoRenew ? 1 : 0, userId]);
  },

  async findExpiring(daysWithin = 7) {
    const [rows] = await pool.execute(
      `SELECT ${COLS} FROM user_membership WHERE auto_renew = 1 AND plan_type != 0 AND end_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)`,
      [daysWithin],
    );
    return rows;
  },

  async listByPlanType(planType, { limit = 20, offset = 0 } = {}) {
    const where = planType ? 'WHERE plan_type = ?' : '';
    const params = planType ? [planType, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
    const [rows] = await pool.query(
      `SELECT um.*, u.nickname, u.phone FROM user_membership um LEFT JOIN user u ON u.id = um.user_id ${where} ORDER BY um.create_time DESC LIMIT ? OFFSET ?`,
      params,
    );
    const [cnt] = await pool.execute(`SELECT COUNT(*) as total FROM user_membership ${where}`, planType ? [planType] : []);
    return { rows, total: cnt[0].total };
  },
};

export default membershipDao;
