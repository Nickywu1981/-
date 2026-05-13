import pool from './db.js';

// ==================== 客户列表查询 ====================

export async function countCustomersByTenant(tenantId, { keyword, status, tagId, startDate, endDate } = {}) {
  let sql = 'SELECT COUNT(*) AS total FROM user u WHERE u.tenant_id = ? AND u.is_deleted = 0';
  const params = [tenantId];
  if (keyword) {
    sql += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') { sql += ' AND u.status = ?'; params.push(Number(status)); }
  if (tagId) {
    sql += ' AND u.id IN (SELECT user_id FROM customer_tag_rel WHERE tag_id = ?)';
    params.push(Number(tagId));
  }
  if (startDate) { sql += ' AND u.create_time >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND u.create_time <= ?'; params.push(endDate + ' 23:59:59'); }
  const [[{ total }]] = await pool.execute(sql, params);
  return total;
}

export async function listCustomersByTenant(tenantId, { keyword, status, tagId, startDate, endDate, offset, pageSize }) {
  let sql = `SELECT u.id, u.username, u.nickname, u.phone, u.email, u.avatar, u.status,
    u.last_login_time, u.create_time,
    m.plan_type, m.credit_balance, m.end_time AS membership_end
    FROM user u
    LEFT JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0
    WHERE u.tenant_id = ? AND u.is_deleted = 0`;
  const params = [tenantId];
  if (keyword) {
    sql += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') { sql += ' AND u.status = ?'; params.push(Number(status)); }
  if (tagId) {
    sql += ' AND u.id IN (SELECT user_id FROM customer_tag_rel WHERE tag_id = ?)';
    params.push(Number(tagId));
  }
  if (startDate) { sql += ' AND u.create_time >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND u.create_time <= ?'; params.push(endDate + ' 23:59:59'); }
  params.push(offset, pageSize);
  sql += ' ORDER BY u.create_time DESC LIMIT ?, ?';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getCustomerDetail(tenantId, userId) {
  const [[user]] = await pool.execute(
    `SELECT u.id, u.username, u.nickname, u.phone, u.email, u.avatar, u.status,
      u.last_login_time, u.create_time,
      m.plan_type, m.credit_balance, m.start_time AS membership_start, m.end_time AS membership_end
     FROM user u
     LEFT JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0
     WHERE u.id = ? AND u.tenant_id = ? AND u.is_deleted = 0`,
    [userId, tenantId],
  );
  if (!user) return null;

  const [tags] = await pool.execute(
    `SELECT t.id, t.name, t.color FROM customer_tag t
     INNER JOIN customer_tag_rel r ON t.id = r.tag_id
     WHERE r.user_id = ? AND t.tenant_id = ? AND t.is_deleted = 0
     LIMIT 100`,
    [userId, tenantId],
  );
  user.tags = tags;

  const [orders] = await pool.execute(
    `SELECT id, action, credit_before, credit_after, consumed, remark, create_time
     FROM consumption_record
     WHERE user_id = ? AND type = 3
     ORDER BY create_time DESC LIMIT 20`,
    [userId],
  );
  user.recentOrders = orders;

  const [[{ taskTotal }]] = await pool.execute(
    'SELECT COUNT(*) AS taskTotal FROM task WHERE user_id = ?', [userId],
  );
  const [[{ totalSpent }]] = await pool.execute(
    `SELECT COALESCE(SUM(consumed), 0) AS totalSpent FROM consumption_record
     WHERE user_id = ? AND type = 3`, [userId],
  );
  user.stats = { taskTotal, totalSpent };

  return user;
}

// ==================== 客户标签 CRUD ====================

export async function createTag(tenantId, { name, color }) {
  const [result] = await pool.execute(
    'INSERT INTO customer_tag (tenant_id, name, color) VALUES (?, ?, ?)',
    [tenantId, name, color || '#3B82F6'],
  );
  return result.insertId;
}

export async function listTags(tenantId) {
  const [rows] = await pool.execute(
    'SELECT id, name, color, sort_order, create_time FROM customer_tag WHERE tenant_id = ? AND is_deleted = 0 ORDER BY sort_order, id LIMIT 500',
    [tenantId],
  );
  return rows;
}

export async function updateTag(tenantId, tagId, { name, color, sortOrder }) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (color !== undefined) { sets.push('color = ?'); params.push(color); }
  if (sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(sortOrder); }
  if (sets.length === 0) return false;
  params.push(tagId, tenantId);
  const [result] = await pool.execute(
    `UPDATE customer_tag SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ? AND is_deleted = 0`,
    params,
  );
  return result.affectedRows > 0;
}

export async function deleteTag(tenantId, tagId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM customer_tag_rel WHERE tag_id = ?', [tagId]);
    const [result] = await conn.execute(
      'UPDATE customer_tag SET is_deleted = 1 WHERE id = ? AND tenant_id = ?',
      [tagId, tenantId],
    );
    await conn.commit();
    return result.affectedRows > 0;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getTagById(tenantId, tagId) {
  const [[tag]] = await pool.execute(
    'SELECT id, name, color, sort_order FROM customer_tag WHERE id = ? AND tenant_id = ? AND is_deleted = 0',
    [tagId, tenantId],
  );
  return tag || null;
}

// ==================== 标签关联操作 ====================

export async function tagCustomer(tagId, userId) {
  const [r] = await pool.execute(
    'INSERT IGNORE INTO customer_tag_rel (tag_id, user_id) VALUES (?, ?)',
    [tagId, userId],
  );
  return r.affectedRows;
}

export async function untagCustomer(tagId, userId) {
  const [r] = await pool.execute(
    'DELETE FROM customer_tag_rel WHERE tag_id = ? AND user_id = ?',
    [tagId, userId],
  );
  return r.affectedRows;
}

export async function batchTagCustomers(tagId, userIds) {
  if (!userIds || !userIds.length) return 0;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const placeholders = userIds.map(() => '(?, ?)').join(', ');
    const flatParams = [];
    for (const uid of userIds) { flatParams.push(tagId, uid); }
    const [r] = await conn.execute(
      `INSERT IGNORE INTO customer_tag_rel (tag_id, user_id) VALUES ${placeholders}`,
      flatParams,
    );
    await conn.commit();
    return r.affectedRows;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ==================== 客户统计 ====================

export async function getCustomerStats(tenantId) {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM user WHERE tenant_id = ? AND is_deleted = 0', [tenantId],
  );
  const [[{ activeToday }]] = await pool.execute(
    'SELECT COUNT(DISTINCT user_id) AS activeToday FROM task WHERE user_id IN (SELECT id FROM user WHERE tenant_id = ? AND is_deleted = 0) AND DATE(create_time) = CURDATE()', [tenantId],
  );
  const [[{ newThisMonth }]] = await pool.execute(
    'SELECT COUNT(*) AS newThisMonth FROM user WHERE tenant_id = ? AND is_deleted = 0 AND create_time >= DATE_FORMAT(CURDATE(),"%Y-%m-01")', [tenantId],
  );
  const [[{ withMembership }]] = await pool.execute(
    `SELECT COUNT(*) AS withMembership FROM user u
     INNER JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0 AND m.end_time > NOW()
     WHERE u.tenant_id = ? AND u.is_deleted = 0`, [tenantId],
  );
  const [[{ totalRevenue }]] = await pool.execute(
    `SELECT COALESCE(SUM(consumed), 0) AS totalRevenue FROM consumption_record
     WHERE source_tenant_id = ? AND type = 3`, [tenantId],
  );
  return { total, activeToday, newThisMonth, withMembership, totalRevenue };
}
