import pool from './db.js';

const pointsDao = {
  async getAccount(userId, conn) {
    const db = conn || pool;
    const [rows] = await db.execute('SELECT id, user_id, balance, total_earned, total_spent, frozen, version FROM points_account WHERE user_id = ? FOR UPDATE', [userId]);
    return rows[0] || null;
  },

  async getAccountReadOnly(userId) {
    const [rows] = await pool.execute('SELECT id, user_id, balance, total_earned, total_spent, frozen, version FROM points_account WHERE user_id = ?', [userId]);
    return rows[0] || null;
  },

  async createAccount(userId) {
    await pool.execute('INSERT INTO points_account (user_id, balance, total_earned) VALUES (?, 0, 0)', [userId]);
  },

  async addPoints(userId, amount, conn) {
    const db = conn || pool;
    await db.execute('UPDATE points_account SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?', [amount, amount, userId]);
  },

  async deductPoints(userId, amount, conn) {
    const db = conn || pool;
    const [r] = await db.execute('UPDATE points_account SET balance = balance - ? WHERE user_id = ? AND balance >= ?', [amount, userId, amount]);
    return r.affectedRows > 0;
  },

  async insertTransaction(data) {
    const [r] = await pool.execute(
      'INSERT INTO points_transaction (user_id, type, amount, balance_after, description, ref_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.user_id, data.type, data.amount, data.balance_after, data.description || '', data.ref_id || ''],
    );
    return r.insertId;
  },

  async listTransactions(userId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await pool.query(
      'SELECT * FROM points_transaction WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, Number(limit), Number(offset)],
    );
    const [cnt] = await pool.execute('SELECT COUNT(*) as total FROM points_transaction WHERE user_id = ?', [userId]);
    return { rows, total: cnt[0].total };
  },

  async listAccounts({ limit = 20, offset = 0 } = {}) {
    const [rows] = await pool.query(
      'SELECT pa.*, u.nickname FROM points_account pa LEFT JOIN user u ON u.id = pa.user_id ORDER BY pa.balance DESC LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)],
    );
    const [cnt] = await pool.execute('SELECT COUNT(*) as total FROM points_account');
    return { rows, total: cnt[0].total };
  },
};

export default pointsDao;
