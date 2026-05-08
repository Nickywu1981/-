import pool from './db.js';

const configDao = {
  async getItemsByGroup(groupKey) {
    const [rows] = await pool.execute(
      'SELECT item_key, item_value, item_type, default_val, sort_order FROM sys_config_item WHERE group_key = ? AND is_enabled = 1 ORDER BY sort_order',
      [groupKey],
    );
    return rows;
  },

  async getItemValue(groupKey, itemKey) {
    const [rows] = await pool.execute(
      'SELECT item_value FROM sys_config_item WHERE group_key = ? AND item_key = ?',
      [groupKey, itemKey],
    );
    return rows[0]?.item_value ?? null;
  },

  async updateItemValue(groupKey, itemKey, value) {
    await pool.execute(
      'UPDATE sys_config_item SET item_value = ?, updated_at = NOW() WHERE group_key = ? AND item_key = ?',
      [value, groupKey, itemKey],
    );
  },

  async insertLog(data) {
    const [r] = await pool.execute(
      'INSERT INTO sys_config_log (group_key, item_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
      [data.group_key, data.item_key, data.old_value ?? '', data.new_value ?? '', data.changed_by],
    );
    return r.insertId;
  },

  async getLogById(id) {
    const [rows] = await pool.execute('SELECT * FROM sys_config_log WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async listLogs({ limit = 20, offset = 0 } = {}) {
    const [rows] = await pool.query(
      'SELECT cl.*, u.nickname FROM sys_config_log cl LEFT JOIN user u ON cl.changed_by = u.id ORDER BY cl.id DESC LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)],
    );
    const [cnt] = await pool.execute('SELECT COUNT(*) as total FROM sys_config_log');
    return { rows, total: cnt[0].total };
  },

  async getDictItems(dictKey) {
    const [rows] = await pool.execute(
      'SELECT item_key, item_value, item_extra, sort_order FROM sys_dict_item WHERE dict_key = ? AND is_enabled = 1 ORDER BY sort_order',
      [dictKey],
    );
    return rows;
  },
};

export default configDao;
