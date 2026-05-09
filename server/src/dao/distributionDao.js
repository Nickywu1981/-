import db from './db.js';

export default {
  async getRelation(userId) {
    const [rows] = await db.query(
      'SELECT * FROM distributor_relation WHERE user_id = ?', [userId],
    );
    return rows[0] || null;
  },

  async createRelation(userId, parentId, grandparentId, level, inviteCode) {
    const [result] = await db.query(
      `INSERT INTO distributor_relation (user_id, parent_id, grandparent_id, level, invite_code)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, parentId, grandparentId, level, inviteCode],
    );
    return result.insertId;
  },

  async getTeam(userId, { page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    const [rows] = await db.query(
      `SELECT dr.id, dr.user_id, dr.level, dr.bound_at, u.nickname, u.avatar_url
       FROM distributor_relation dr
       JOIN user u ON u.id = dr.user_id
       WHERE dr.parent_id = ? OR dr.grandparent_id = ?
       ORDER BY dr.bound_at DESC LIMIT ? OFFSET ?`,
      [userId, userId, pageSize, offset],
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM distributor_relation WHERE parent_id = ? OR grandparent_id = ?',
      [userId, userId],
    );
    return { list: rows, total, page, pageSize };
  },

  async getTeamStats(userId) {
    const [[l1]] = await db.query('SELECT COUNT(*) as cnt FROM distributor_relation WHERE parent_id = ?', [userId]);
    const [[l2]] = await db.query('SELECT COUNT(*) as cnt FROM distributor_relation WHERE grandparent_id = ?', [userId]);
    return { level1_count: l1.cnt, level2_count: l2.cnt };
  },

  async insertCommission({ distributorId, consumerId, orderId, orderAmount, rate, amount, level }) {
    await db.query(
      `INSERT INTO distributor_commission (distributor_id, consumer_id, order_id, order_amount, commission_rate, commission, level, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'settled')`,
      [distributorId, consumerId, orderId, orderAmount, rate, amount, level],
    );
  },

  async getBalance(userId) {
    const [[r]] = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN status='settled' THEN commission ELSE 0 END),0) AS available,
              COALESCE(SUM(CASE WHEN status='withdrawn' THEN commission ELSE 0 END),0) AS withdrawn
       FROM distributor_commission WHERE distributor_id = ?`,
      [userId],
    );
    return r;
  },

  async getCommissionHistory(userId, { page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    const [rows] = await db.query(
      `SELECT dc.*, u.nickname AS consumer_name FROM distributor_commission dc
       LEFT JOIN user u ON u.id = dc.consumer_id
       WHERE dc.distributor_id = ? ORDER BY dc.created_at DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM distributor_commission WHERE distributor_id = ?', [userId],
    );
    return { list: rows, total, page, pageSize };
  },

  async getTotalSales(userId) {
    const [[{ total }]] = await db.query(
      'SELECT COALESCE(SUM(commission), 0) as total FROM distributor_commission WHERE distributor_id = ? AND status IN (?,?)',
      [userId, 'settled', 'withdrawn'],
    );
    return total;
  },

  async getTeamPerformance(userId, { page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    const [members] = await db.query(
      `SELECT u.id, u.nickname, dr.level, dr.bound_at, COALESCE(SUM(dc.commission),0) AS contributed
       FROM distributor_relation dr JOIN user u ON u.id = dr.user_id
       LEFT JOIN distributor_commission dc ON dc.consumer_id = dr.user_id
       WHERE dr.parent_id = ? OR dr.grandparent_id = ?
       GROUP BY u.id, u.nickname, dr.level, dr.bound_at
       ORDER BY contributed DESC LIMIT ? OFFSET ?`,
      [userId, userId, pageSize, offset],
    );
    return members;
  },

  async getMonthlyInvites(userId) {
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) as cnt FROM distributor_relation WHERE parent_id = ? AND bound_at >= DATE_FORMAT(NOW(), ?)',
      [userId, '%Y-%m-01'],
    );
    return cnt;
  },

  async withdrawCommissions(userId, ids) {
    for (const id of ids) {
      await db.query(
        'UPDATE distributor_commission SET status = ?, settled_at = NOW() WHERE id = ? AND distributor_id = ?',
        ['withdrawn', id, userId],
      );
    }
  },
};
