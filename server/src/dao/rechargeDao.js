import pool from './db.js';

const COIN_RATES = { '10': 100, '50': 550, '100': 1200, '200': 2500, '500': 7000 };
const COLS = 'id, tenant_id, user_id, order_no, amount, coin_amount, pay_channel, pay_status, trade_no, pay_time, client_ip, expire_time, create_time, update_time';

export default {
  COIN_RATES,

  async listByUser(userId, tenantId, { limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(`SELECT ${COLS} FROM recharge_order WHERE user_id = ? AND tenant_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?`, [userId, tenantId, Number(limit), Number(offset)]);
    return rows;
  },

  async listAll(limit = 200) {
    const [rows] = await pool.query('SELECT ro.*, u.nickname FROM recharge_order ro LEFT JOIN user u ON ro.user_id = u.id ORDER BY ro.create_time DESC LIMIT ?', [limit]);
    return rows;
  },

  async getByOrderNo(orderNo) {
    const [rows] = await pool.query(`SELECT ${COLS} FROM recharge_order WHERE order_no = ?`, [orderNo]);
    return rows[0] || null;
  },

  async create(data) {
    const [r] = await pool.query(
      'INSERT INTO recharge_order (tenant_id, user_id, order_no, amount, coin_amount, pay_channel, client_ip, expire_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.tenantId, data.userId, data.orderNo, data.amount, data.coinAmount, data.payChannel, data.clientIp, data.expireTime],
    );
    return r.insertId;
  },

  async markPaid(orderNo, tradeNo, conn) {
    const db = conn || pool;
    await db.query('UPDATE recharge_order SET pay_status = 1, pay_time = NOW(), trade_no = ? WHERE order_no = ? AND pay_status = 0', [tradeNo || '', orderNo]);
  },

  async markFailed(orderNo) {
    await pool.query('UPDATE recharge_order SET pay_status = 2 WHERE order_no = ?', [orderNo]);
  },

  async markRefunded(orderNo) {
    await pool.query('UPDATE recharge_order SET pay_status = 3 WHERE order_no = ?', [orderNo]);
  },

  async addCredit(userId, tenantId, amount) {
    await pool.query('UPDATE user_membership SET credit_balance = credit_balance + ? WHERE user_id = ? AND tenant_id = ?', [amount, userId, tenantId]);
  },

  async addConsumptionRecord(data) {
    const [r] = await pool.query(
      'INSERT INTO consumption_record (tenant_id, user_id, type, amount, balance_after, remark, request_id) VALUES (?, ?, ?, ?, (SELECT credit_balance FROM user_membership WHERE user_id = ? AND tenant_id = ?), ?, ?)',
      [data.tenantId, data.userId, data.type, data.amount, data.userId, data.tenantId, data.remark, data.requestId],
    );
    return r.insertId;
  },

  async logNotify(orderNo, data, type, verified) {
    await pool.query('INSERT INTO recharge_notify_log (order_no, notify_raw, notify_type, verified) VALUES (?, ?, ?, ?)',
      [orderNo, JSON.stringify(data), type, verified ? 1 : 0]);
  },
};
