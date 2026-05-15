import pool from './db.js';

export async function getItemsByGroup(groupKey) {
  const [rows] = await pool.execute(
    'SELECT item_key, item_value, item_type, default_val, sort_order FROM sys_config_item WHERE group_key = ? AND is_enabled = 1 ORDER BY sort_order',
    [groupKey],
  );
  return rows;
}

export async function getItemValue(groupKey, itemKey) {
  const [rows] = await pool.execute(
    'SELECT item_value FROM sys_config_item WHERE group_key = ? AND item_key = ?',
    [groupKey, itemKey],
  );
  return rows[0]?.item_value ?? null;
}

export async function updateItemValue(groupKey, itemKey, value) {
  const [r] = await pool.execute(
    'UPDATE sys_config_item SET item_value = ?, updated_at = NOW() WHERE group_key = ? AND item_key = ?',
    [value, groupKey, itemKey],
  );
  return r.affectedRows;
}

export async function insertLog(data) {
  const [r] = await pool.execute(
    'INSERT INTO sys_config_log (group_key, item_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
    [data.group_key, data.item_key, data.old_value ?? '', data.new_value ?? '', data.changed_by],
  );
  return r.insertId;
}

export async function getLogById(id) {
  const [rows] = await pool.execute('SELECT id, group_key, item_key, old_value, new_value, changed_by, created_at FROM sys_config_log WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function listLogs({ limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    'SELECT cl.*, u.nickname FROM sys_config_log cl LEFT JOIN user u ON cl.changed_by = u.id ORDER BY cl.id DESC LIMIT ? OFFSET ?',
    [Number(limit), Number(offset)],
  );
  const [cnt] = await pool.execute('SELECT COUNT(*) as total FROM sys_config_log');
  return { rows, total: cnt[0].total };
}

export async function getDictItems(dictKey) {
  const [rows] = await pool.execute(
    'SELECT item_key, item_value, item_extra, sort_order FROM sys_dict_item WHERE dict_key = ? AND is_enabled = 1 ORDER BY sort_order',
    [dictKey],
  );
  return rows;
}

export async function getGroupList() {
  const [rows] = await pool.execute(
    'SELECT group_key, group_name, parent_key, sort_order, is_enabled FROM sys_config_group ORDER BY sort_order, group_key',
  );
  return rows;
}

export async function getGroupItems(groupKey) {
  const [rows] = await pool.execute(
    'SELECT item_key, item_value, item_type, default_val, placeholder, sort_order, is_enabled FROM sys_config_item WHERE group_key = ? ORDER BY sort_order',
    [groupKey],
  );
  return rows;
}
