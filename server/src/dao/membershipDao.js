import pool from './db.js';

const membershipDao = {
  async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM user_membership WHERE user_id = ?', [userId]);
    return rows[0] || null;
  },

  async upsert(userId, data) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const sets = [];
      const params = [];
      if (data.plan_type !== undefined) { sets.push('plan_type = ?'); params.push(data.plan_type); }
      if (data.credit_balance !== undefined) { sets.push('credit_balance = ?'); params.push(data.credit_balance); }
      if (data.expire_at) { sets.push('end_time = ?'); params.push(data.expire_at); }
      if (data.start_time) { sets.push('start_time = ?'); params.push(data.start_time); }
      if (sets.length === 0) return existing;
      params.push(userId);
      await pool.execute(`UPDATE user_membership SET ${sets.join(', ')} WHERE user_id = ?`, params);
      return this.findByUserId(userId);
    }
    await pool.execute(
      'INSERT INTO user_membership (user_id, plan_type, credit_balance, start_time, end_time) VALUES (?, ?, ?, NOW(), ?)',
      [userId, data.plan_type || 'free', data.credit_balance || 0, data.expire_at || null],
    );
    return this.findByUserId(userId);
  },

  async addCredits(userId, amount) {
    await pool.execute('UPDATE user_membership SET credit_balance = credit_balance + ? WHERE user_id = ?', [amount, userId]);
  },

  async listByPlanType(planType, { limit = 20, offset = 0 } = {}) {
    const where = planType ? 'WHERE plan_type = ?' : '';
    const params = planType ? [planType, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
    const [rows] = await pool.query(
      `SELECT um.*, u.nickname, u.phone FROM user_membership um LEFT JOIN users u ON u.id = um.user_id ${where} ORDER BY um.created_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    const [cnt] = await pool.execute(`SELECT COUNT(*) as total FROM user_membership ${where}`, planType ? [planType] : []);
    return { rows, total: cnt[0].total };
  },
};

export default membershipDao;
