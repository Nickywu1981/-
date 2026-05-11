import db from './db.js';

export default {
  async saveCredential(userId, { platform, appKey, appSecret, accessToken, shopName }) {
    await db.query(
      `INSERT INTO platform_credentials (user_id, platform, app_key, app_secret, access_token, shop_name, status)
       VALUES (?, ?, ?, ?, ?, ?, 'connected')
       ON DUPLICATE KEY UPDATE app_key=VALUES(app_key), app_secret=VALUES(app_secret),
               access_token=VALUES(access_token), shop_name=VALUES(shop_name), status='connected'`,
      [userId, platform, appKey, appSecret, accessToken, shopName],
    );
  },

  async getUserCredentials(userId) {
    const [rows] = await db.query(
      'SELECT id, platform, shop_name, status, token_expires_at, created_at FROM platform_credentials WHERE user_id = ?',
      [userId],
    );
    return rows;
  },

  async getCredential(userId, platform) {
    const [rows] = await db.query(
      'SELECT * FROM platform_credentials WHERE user_id = ? AND platform = ? AND status = ?',
      [userId, platform, 'connected'],
    );
    return rows[0] || null;
  },

  async disconnectPlatform(userId, platform) {
    await db.query(
      'UPDATE platform_credentials SET status = ? WHERE user_id = ? AND platform = ?',
      ['disconnected', userId, platform],
    );
  },

  async getPlatformConfigs() {
    const [rows] = await db.query(
      'SELECT * FROM platform_config WHERE status = ? ORDER BY id LIMIT 200', ['active'],
    );
    return rows;
  },

  async createPublishRecord(userId, { platform, title, description, images, price, itemId }) {
    const [result] = await db.query(
      `INSERT INTO platform_publish_history (user_id, platform, title, description, images, price, item_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, platform, title, description, JSON.stringify(images || []), price, itemId],
    );
    return { id: result.insertId };
  },

  async updatePublishStatus(id, userId, status, resultUrl = null, errorMsg = null) {
    await db.query(
      'UPDATE platform_publish_history SET status = ?, result_url = COALESCE(?, result_url), error_msg = COALESCE(?, error_msg) WHERE id = ? AND user_id = ?',
      [status, resultUrl, errorMsg, id, userId],
    );
  },

  async getPublishHistory(userId, { platform, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM platform_publish_history WHERE user_id = ?';
    const params = [userId];
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await db.query(sql, params);
    return rows;
  },
};
