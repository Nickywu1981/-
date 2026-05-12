import pool from './db.js';

const COLS = 'id, reqsn, order_type, business_id, user_id, amount, trxamt, pay_channel, status, trxid, pay_time, expire_time, notify_raw, create_time, update_time';

export default {
  async create(data) {
    const [r] = await pool.query(
      `INSERT INTO allinpay_order (reqsn, order_type, business_id, user_id, amount, trxamt, pay_channel, expire_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.reqsn, data.orderType, data.businessId, data.userId, data.amount, data.trxamt, data.payChannel, data.expireTime],
    );
    return r.insertId;
  },

  async getByReqsn(reqsn) {
    const [rows] = await pool.query(`SELECT ${COLS} FROM allinpay_order WHERE reqsn = ? LIMIT 1`, [reqsn]);
    return rows[0] || null;
  },

  async markPaid(reqsn, trxid, notifyRaw, conn) {
    const db = conn || pool;
    const [r] = await db.query(
      `UPDATE allinpay_order SET status = 1, trxid = ?, pay_time = NOW(), notify_raw = ?, update_time = NOW()
       WHERE reqsn = ? AND status = 0`,
      [trxid || '', JSON.stringify(notifyRaw || {}), reqsn],
    );
    return r.affectedRows;
  },

  async markFailed(reqsn) {
    const [r] = await pool.query(
      'UPDATE allinpay_order SET status = 2, update_time = NOW() WHERE reqsn = ? AND status = 0',
      [reqsn],
    );
    return r.affectedRows;
  },

  async markClosed(reqsn) {
    const [r] = await pool.query(
      'UPDATE allinpay_order SET status = 3, update_time = NOW() WHERE reqsn = ? AND status = 0',
      [reqsn],
    );
    return r.affectedRows;
  },

  async logNotify(data) {
    await pool.query(
      `INSERT INTO allinpay_notify_log (reqsn, trxid, notify_body, sign_verified, process_status, process_msg)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.reqsn, data.trxid || '', data.notifyBody, data.signVerified, data.processStatus, data.processMsg || ''],
    );
  },

  async isCallbackProcessed(reqsn, trxid) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM allinpay_notify_log WHERE reqsn = ? AND trxid = ? AND process_status = 1',
      [reqsn, trxid || ''],
    );
    return rows[0].cnt > 0;
  },

  async getBillingHistory(userId) {
    const [rows] = await pool.query(
      'SELECT reqsn, trxid, amount, pay_channel, status, create_time, pay_time FROM allinpay_order WHERE user_id = ? AND status = 1 ORDER BY create_time DESC LIMIT 50',
      [userId],
    );
    return rows;
  },
};
