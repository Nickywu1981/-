import pool from './db.js';

// ==================== 模板 CRUD ====================
export async function listTemplates({ category, status, keyword, isPublic, creatorId, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];

  if (category) { conditions.push('t.category = ?'); params.push(category); }
  if (status !== undefined && status !== null) { conditions.push('t.status = ?'); params.push(status); }
  if (isPublic !== undefined) { conditions.push('t.is_public = ?'); params.push(isPublic); }
  if (creatorId) { conditions.push('t.creator_id = ?'); params.push(creatorId); }
  if (keyword) { conditions.push('(t.title LIKE ? OR t.description LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = parseInt((page - 1) * pageSize, 10);
  const limit = parseInt(pageSize, 10);

  const [rows] = await pool.query(
    `SELECT t.*, u.nickname AS creator_name FROM prompt_template t LEFT JOIN user u ON t.creator_id = u.id ${where} ORDER BY t.sort_order DESC, t.usage_count DESC LIMIT ?, ?`,
    [...params, offset, limit],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM prompt_template t ${where}`, params);
  return { list: rows, total };
}

export async function getTemplateById(id) {
  const [rows] = await pool.execute('SELECT t.*, u.nickname AS creator_name FROM prompt_template t LEFT JOIN user u ON t.creator_id = u.id WHERE t.id = ?', [id]);
  return rows[0] || null;
}

export async function getTemplateByCode(code) {
  const [rows] = await pool.execute('SELECT * FROM prompt_template WHERE template_code = ?', [code]);
  return rows[0] || null;
}

export async function insertTemplate({ templateCode, category, title, description, content, variables, modelType, icon, sortOrder, isPublic, status, creatorId }) {
  const [r] = await pool.execute(
    'INSERT INTO prompt_template (template_code, category, title, description, content, variables, model_type, icon, sort_order, is_public, status, creator_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [templateCode, category, title, description || '', content, JSON.stringify(variables || []), modelType || 'text', icon || 'star', sortOrder || 0, isPublic || 0, status || 0, creatorId || null],
  );
  return r.insertId;
}

export async function updateTemplate(id, fields) {
  const allowed = ['title', 'content', 'category', 'tags', 'variables', 'is_public', 'status', 'reviewer_id', 'review_remark'];
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && allowed.includes(k)) {
      const col = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      sets.push(`${col} = ?`);
      params.push(k === 'variables' ? JSON.stringify(v) : v);
    }
  }
  if (!sets.length) return;
  params.push(id);
  await pool.execute(`UPDATE prompt_template SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteTemplate(id) {
  await pool.execute('DELETE FROM prompt_template WHERE id = ?', [id]);
}

export async function incrUsageCount(id) {
  await pool.execute('UPDATE prompt_template SET usage_count = usage_count + 1 WHERE id = ?', [id]);
}

export async function updateStatus(id, status, reviewerId, reviewRemark) {
  await pool.execute('UPDATE prompt_template SET status = ?, reviewer_id = ?, review_remark = ? WHERE id = ?', [status, reviewerId, reviewRemark || '', id]);
}

// ==================== 收藏 ====================
export async function listFavorites(userId, { groupId, page = 1, pageSize = 20 }) {
  const conditions = ['f.user_id = ?'];
  const params = [userId];
  if (groupId) { conditions.push('f.group_id = ?'); params.push(groupId); }
  const offset = parseInt((page - 1) * pageSize, 10);
  const limit = parseInt(pageSize, 10);
  const [rows] = await pool.query(
    `SELECT f.id AS favorite_id, t.* FROM prompt_favorite f JOIN prompt_template t ON f.template_id = t.id WHERE ${conditions.join(' AND ')} ORDER BY f.create_time DESC LIMIT ?, ?`,
    [...params, offset, limit],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM prompt_favorite f WHERE ${conditions.join(' AND ')}`, params);
  return { list: rows, total };
}

export async function addFavorite(userId, templateId, groupId) {
  try {
    await pool.execute('INSERT INTO prompt_favorite (user_id, template_id, group_id) VALUES (?,?,?)', [userId, templateId, groupId || null]);
    return true;
  } catch { return false; }
}

export async function removeFavorite(userId, templateId) {
  await pool.execute('DELETE FROM prompt_favorite WHERE user_id = ? AND template_id = ?', [userId, templateId]);
}

// ==================== 分组 ====================
export async function listGroups(userId) {
  const [rows] = await pool.execute('SELECT * FROM prompt_group WHERE user_id = ? ORDER BY sort_order', [userId]);
  return rows;
}

export async function insertGroup(userId, name) {
  const [r] = await pool.execute('INSERT INTO prompt_group (user_id, name) VALUES (?,?)', [userId, name]);
  return r.insertId;
}

export async function updateGroup(id, userId, fields) {
  const allowed = ['name'];
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && allowed.includes(k)) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (!sets.length) return;
  params.push(id, userId);
  await pool.execute(`UPDATE prompt_group SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
}

export async function deleteGroup(id, userId) {
  await pool.execute('DELETE FROM prompt_group WHERE id = ? AND user_id = ?', [id, userId]);
}

// ==================== 分类枚举 ====================
export async function getCategories() {
  const [rows] = await pool.query('SELECT DISTINCT category, COUNT(*) AS cnt FROM prompt_template WHERE status = 2 GROUP BY category');
  return rows;
}

// ==================== 使用历史 ====================
export async function insertUsageHistory(userId, templateId, filledContent, modelType) {
  const [r] = await pool.execute(
    'INSERT INTO prompt_usage_history (user_id, template_id, filled_content, model_type, create_time) VALUES (?,?,?,?,NOW())',
    [userId, templateId, filledContent || '', modelType || 'text'],
  );
  return r.insertId;
}

export async function listUsageHistory(userId, { page = 1, pageSize = 20 }) {
  const offset = parseInt((page - 1) * pageSize, 10);
  const limit = parseInt(pageSize, 10);
  const [rows] = await pool.query(
    `SELECT h.*, t.title AS template_title, t.category FROM prompt_usage_history h
     LEFT JOIN prompt_template t ON h.template_id = t.id
     WHERE h.user_id = ? ORDER BY h.create_time DESC LIMIT ?, ?`,
    [userId, offset, limit],
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM prompt_usage_history WHERE user_id = ?', [userId]);
  return { list: rows, total };
}

// ==================== 智能推荐 ====================
export async function getHotTemplates({ excludeIds = [], limit = 10 }) {
  const exclude = excludeIds.length ? `AND t.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
  const [rows] = await pool.query(
    `SELECT t.* FROM prompt_template t WHERE t.status = 2 ${exclude} ORDER BY t.usage_count DESC, t.sort_order DESC LIMIT ?`,
    [...excludeIds, limit],
  );
  return rows;
}

export async function getCategoryPreference(userId) {
  const [rows] = await pool.query(
    `SELECT t.category, COUNT(*) AS cnt FROM prompt_usage_history h
     JOIN prompt_template t ON h.template_id = t.id
     WHERE h.user_id = ? GROUP BY t.category ORDER BY cnt DESC LIMIT 3`,
    [userId],
  );
  return rows;
}

export async function recommendByCategory(categories, { excludeIds = [], limit = 10 }) {
  if (!categories.length) return getHotTemplates({ excludeIds, limit });
  const placeholders = categories.map(() => '?').join(',');
  const exclude = excludeIds.length ? `AND t.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
  const [rows] = await pool.query(
    `SELECT t.* FROM prompt_template t WHERE t.status = 2 AND t.category IN (${placeholders}) ${exclude} ORDER BY t.usage_count DESC, t.sort_order DESC LIMIT ?`,
    [...categories, ...excludeIds, limit],
  );
  return rows;
}

export async function recommendCollaborative(userId, { limit = 10 }) {
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(h2.user_id) AS co_usage FROM prompt_usage_history h1
     JOIN prompt_usage_history h2 ON h1.template_id = h2.template_id AND h1.user_id != h2.user_id
     JOIN prompt_template t ON h2.template_id = t.id
     WHERE h1.user_id = ? AND t.status = 2 AND h2.template_id NOT IN (
       SELECT DISTINCT template_id FROM prompt_usage_history WHERE user_id = ?
     )
     GROUP BY t.id ORDER BY co_usage DESC LIMIT ?`,
    [userId, userId, limit],
  );
  return rows;
}

// ==================== 评分 ====================
export async function upsertRating(userId, templateId, score) {
  await pool.execute(
    'INSERT INTO prompt_rating (user_id, template_id, score) VALUES (?,?,?) ON DUPLICATE KEY UPDATE score = ?, update_time = NOW()',
    [userId, templateId, score, score],
  );
}

export async function getAverageRating(templateId) {
  const [[row]] = await pool.execute(
    'SELECT AVG(score) AS avg_score, COUNT(*) AS rating_count FROM prompt_rating WHERE template_id = ?',
    [templateId],
  );
  return row || { avg_score: 0, rating_count: 0 };
}

export async function getUserRating(userId, templateId) {
  const [rows] = await pool.execute('SELECT score FROM prompt_rating WHERE user_id = ? AND template_id = ?', [userId, templateId]);
  return rows.length ? rows[0].score : null;
}
