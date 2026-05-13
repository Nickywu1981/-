import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

// ==================== 会员套餐更新 ====================

export async function updateMembership(userId, planType, credits, endTime, conn) {
  const db = conn || pool;
  const [r] = await db.execute(
    'UPDATE user_membership SET plan_type = ?, credit_balance = credit_balance + ?, start_time = COALESCE(start_time, NOW()), end_time = ?, update_time = NOW() WHERE user_id = ?',
    [planType, credits, endTime, userId],
  );
  return r.affectedRows;
}

export async function renewMembership(userId, planType, endTime, conn) {
  const db = conn || pool;
  const [r] = await db.execute(
    'UPDATE user_membership SET plan_type = ?, end_time = ?, update_time = NOW() WHERE user_id = ?',
    [planType, endTime, userId],
  );
  return r.affectedRows;
}

// ==================== 账单查询 ====================

export async function getBillingHistory(userId, offset, pageSize) {
  const [rows] = await pool.query(
    `SELECT id, action, credit_before, credit_after, consumed, remark, create_time
     FROM consumption_record WHERE user_id = ? AND type IN (2, 3)
     ORDER BY create_time DESC LIMIT ?, ?`,
    [userId, offset, pageSize],
  );
  return rows;
}

export async function countBillingHistory(userId) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM consumption_record WHERE user_id = ? AND type IN (2, 3)',
    [userId],
  );
  return total;
}

// ==================== 仪表盘统计 ====================

export async function getDashboardStats() {
  const [[[{ userCount }]], [[{ taskCount }]], [[{ todayTaskCount }]], [[{ paidUserCount }]], [[{ totalRevenue }]]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS userCount FROM user WHERE is_deleted = 0'),
    pool.execute('SELECT COUNT(*) AS taskCount FROM task WHERE status IN (1,2)'),
    pool.execute('SELECT COUNT(*) AS todayTaskCount FROM task WHERE DATE(create_time) = CURDATE()'),
    pool.execute('SELECT COUNT(*) AS paidUserCount FROM user_membership WHERE plan_type > 0 AND is_deleted = 0'),
    pool.execute('SELECT COALESCE(SUM(consumed), 0) AS totalRevenue FROM consumption_record WHERE type = 3 AND create_time >= DATE_FORMAT(CURDATE(),\'%Y-%m-01\')'),
  ]);

  const [[taskTrend], [userTrend], [revenueTrend]] = await Promise.all([
    pool.execute(
      `SELECT DATE(create_time) AS date, COUNT(*) AS count FROM task
       WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(create_time) ORDER BY date`,
    ),
    pool.execute(
      `SELECT DATE(create_time) AS date, COUNT(*) AS count FROM user
       WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND is_deleted = 0 GROUP BY DATE(create_time) ORDER BY date`,
    ),
    pool.execute(
      `SELECT DATE(create_time) AS date, COALESCE(SUM(consumed), 0) AS amount FROM consumption_record
       WHERE type = 3 AND create_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(create_time) ORDER BY date`,
    ),
  ]);

  // 任务类型分布（饼图）
  const [taskDistribution] = await pool.execute(
    `SELECT t.type, COUNT(*) AS count FROM task t
     WHERE t.create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY t.type ORDER BY count DESC`,
  );
  const typeLabelMap = {
    main_image: '主图', scene: '场景', detail_h5: '详情页', virtual_tryon: '虚拟试穿',
    color_swap: '换色', style_transfer: '风格迁移', image_translate: '图片翻译',
    img2video: '图生视频', multi2video: '多图生视频', video_packaging: '视频打包',
    action_transfer: '动作迁移', person_replace: '人物替换', digital_human: '数字人',
    action_batch: '批量动作', video_beautify: '视频美化', batch: '批量任务', other: '其他',
  };
  const colorPalette = ['#3B82F6', '#22C55E', '#F59E0B', '#7C3AED', '#EC4899', '#06B6D4', '#F97316', '#8B5CF6', '#14B8A6', '#E11D48'];
  const dist = (taskDistribution || []).map((r, i) => ({
    label: typeLabelMap[r.type] || r.type || '其他',
    value: Number(r.count),
    color: colorPalette[i % colorPalette.length],
  }));

  // 热门功能（30天任务类型 Top 5）
  const popularFeatures = (taskDistribution || []).slice(0, 5).map(r => ({
    label: typeLabelMap[r.type] || r.type || '其他',
    value: Number(r.count),
  }));

  // 模型用量分布（30天）
  const [modelUsage] = await pool.execute(
    `SELECT model_name, COUNT(*) AS count, COALESCE(SUM(total_tokens), 0) AS tokens
     FROM ai_call_log WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY model_name ORDER BY tokens DESC`,
  );
  const modelColorMap = { 'gpt-4o': '#7C3AED', 'gpt-4o-mini': '#A78BFA', 'claude': '#3B82F6', 'claude-3': '#60A5FA',
    'gpt-image-2': '#22C55E', 'sd': '#F97316', 'stability': '#F59E0B', 'sd-xl': '#EC4899',
    'cogvideo': '#06B6D4', 'seedance': '#8B5CF6', 'edge-tts': '#14B8A6',
  };
  const models = (modelUsage || []).map(r => ({
    label: r.model_name || 'unknown',
    value: Number(r.count),
    tokens: Number(r.tokens),
    color: modelColorMap[r.model_name] || '#94A3B8',
  }));

  return {
    userCount, taskCount, todayTaskCount, paidUserCount, totalRevenue: Math.abs(totalRevenue),
    taskTrend, userTrend, revenueTrend,
    taskDistribution: dist.length ? dist : undefined,
    popularFeatures: popularFeatures.length ? popularFeatures : undefined,
    modelUsage: models.length ? models : undefined,
  };
}

// ==================== 用户管理 ====================

export async function listAllUsers({ offset, pageSize, keyword, status, planType }) {
  const needMembership = planType !== undefined && planType !== '';

  let sql = 'SELECT u.id, u.username, u.nickname, u.phone, u.status, u.create_time, u.last_login_time';
  if (needMembership) {
    sql += ', m.plan_type, m.credit_balance, m.end_time AS membership_end';
  }
  sql += ' FROM user u';
  if (needMembership) {
    sql += ' LEFT JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0';
  }
  sql += ' WHERE u.is_deleted = 0';
  const params = [];

  if (keyword) {
    sql += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') {
    sql += ' AND u.status = ?';
    params.push(Number(status));
  }
  if (planType !== undefined && planType !== '') {
    sql += ' AND m.plan_type = ?';
    params.push(Number(planType));
  }
  params.push(offset, pageSize);
  sql += ' ORDER BY u.create_time DESC LIMIT ?, ?';

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM user u';
  if (needMembership) {
    countSql += ' LEFT JOIN user_membership m ON u.id = m.user_id AND m.is_deleted = 0';
  }
  countSql += ' WHERE u.is_deleted = 0';
  const countParams = [];
  if (keyword) {
    countSql += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
    countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') { countSql += ' AND u.status = ?'; countParams.push(Number(status)); }
  if (planType !== undefined && planType !== '') { countSql += ' AND m.plan_type = ?'; countParams.push(Number(planType)); }

  const [[{ total }]] = await pool.execute(countSql, countParams);
  return { list: rows, total };
}

export async function updateUserStatus(userId, status, tenantId) {
  let sql = 'UPDATE user SET status = ?, update_time = NOW() WHERE id = ?';
  const params = [status, userId];
  if (tenantId) { sql += ' AND tenant_id = ?'; params.push(tenantId); }
  await pool.execute(sql, params);
}

export async function batchUpdateUserStatus(ids, status, tenantId) {
  if (!ids || !ids.length) return 0;
  // 分批防止 IN 子句过大
  const CHUNK = 500;
  let totalAffected = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(',');
    let sql = `UPDATE user SET status = ? WHERE id IN (${placeholders})`;
    const params = [status, ...chunk];
    if (tenantId) { sql += ' AND tenant_id = ?'; params.push(tenantId); }
    const [result] = await pool.execute(sql, params);
    totalAffected += result.affectedRows;
  }
  return totalAffected;
}

// ==================== 风控 ====================

export async function countIPRegister24h(ip) {
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM operation_log WHERE action = ? AND ip = ? AND create_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
    ['register', ip],
  );
  return count;
}

export async function countUserAction1m(userId, action) {
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM operation_log WHERE user_id = ? AND action = ? AND create_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
    [userId, action],
  );
  return count;
}

export async function insertOperationLog(userId, action, ip, userAgent) {
  await pool.execute(
    'INSERT INTO operation_log (user_id, action, ip, user_agent, create_time) VALUES (?, ?, ?, ?, NOW())',
    [userId, action, ip || '', userAgent || ''],
  );
}

// ==================== 操作日志 ====================

export async function getOperationLogs({ offset, pageSize, userId, action }) {
  let sql = 'SELECT id, user_id, action, ip, user_agent, create_time FROM operation_log WHERE 1=1';
  const params = [];
  if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
  if (action) { sql += ' AND action = ?'; params.push(action); }
  params.push(offset, pageSize);
  sql += ' ORDER BY create_time DESC LIMIT ?, ?';
  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM operation_log WHERE 1=1';
  const countParams = [];
  if (userId) { countSql += ' AND user_id = ?'; countParams.push(userId); }
  if (action) { countSql += ' AND action = ?'; countParams.push(action); }
  const [[{ total }]] = await pool.query(countSql, countParams);
  return { list: rows, total };
}

// ==================== 任务管理（Admin） ====================

export async function getTaskById(taskId) {
  const [[task]] = await pool.execute('SELECT id, user_id, type, title, status, progress, progress_msg, retry_count, input_params, output_result, error_msg, create_time, start_time FROM task WHERE id = ?', [taskId]);
  return task || null;
}

export async function listAllTasks({ offset, pageSize, userId, status, type, typeGroup, reviewStatus }) {
  let sql = `SELECT t.id, t.user_id, t.type, t.status, t.title, t.input_params, t.output_result,
    t.review_status, t.error_msg, t.create_time, t.end_time,
    u.username, u.nickname
    FROM task t LEFT JOIN user u ON t.user_id = u.id WHERE 1=1`;
  const params = [];

  if (userId) { sql += ' AND t.user_id = ?'; params.push(userId); }
  if (status !== undefined && status !== '') { sql += ' AND t.status = ?'; params.push(Number(status)); }
  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (typeGroup) {
    const groups = {
      image: ['main_image', 'scene', 'detail_h5', 'virtual_tryon', 'color_swap', 'style_transfer', 'wrinkle_remove', 'image_translate'],
      video: ['img2video', 'multi2video', 'video_packaging', 'action_transfer', 'person_replace', 'digital_human', 'action_batch', 'video_beautify', 'script_gen', 'shot_plan', 'viral_clone'],
      batch: ['batch'],
    };
    const types = groups[typeGroup];
    if (types) { sql += ` AND t.type IN (${types.map(() => '?').join(',')})`; params.push(...types); }
  }
  if (reviewStatus !== undefined && reviewStatus !== '') { sql += ' AND t.review_status = ?'; params.push(Number(reviewStatus)); }
  params.push(offset, pageSize);
  sql += ' ORDER BY t.create_time DESC LIMIT ?, ?';

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM task t WHERE 1=1';
  const countParams = [];
  if (userId) { countSql += ' AND t.user_id = ?'; countParams.push(userId); }
  if (status !== undefined && status !== '') { countSql += ' AND t.status = ?'; countParams.push(Number(status)); }
  if (type) { countSql += ' AND t.type = ?'; countParams.push(type); }
  if (typeGroup) {
    const groups = {
      image: ['main_image', 'scene', 'detail_h5', 'virtual_tryon', 'color_swap', 'style_transfer', 'wrinkle_remove', 'image_translate'],
      video: ['img2video', 'multi2video', 'video_packaging', 'action_transfer', 'person_replace', 'digital_human', 'action_batch', 'video_beautify', 'script_gen', 'shot_plan', 'viral_clone'],
      batch: ['batch'],
    };
    const types = groups[typeGroup];
    if (types) { countSql += ` AND t.type IN (${types.map(() => '?').join(',')})`; countParams.push(...types); }
  }
  if (reviewStatus !== undefined && reviewStatus !== '') { countSql += ' AND t.review_status = ?'; countParams.push(Number(reviewStatus)); }

  const [[{ total }]] = await pool.execute(countSql, countParams);
  return { list: rows, total };
}

export async function updateTaskStatusDirect(taskId, fields, tenantId) {
  const allowed = ['status', 'progress', 'progress_msg', 'error_msg', 'output_result', 'worker_id'];
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k) && v !== undefined) {
      sets.push(`t.${k} = ?`);
      params.push(v);
    }
  }
  if (sets.length === 0) return;
  params.push(taskId);
  if (tenantId) {
    params.push(tenantId);
    await pool.execute(`UPDATE task t JOIN user u ON t.user_id = u.id SET ${sets.join(', ')} WHERE t.id = ? AND u.tenant_id = ?`, params);
  } else {
    await pool.execute(`UPDATE task SET ${sets.join(', ')} WHERE id = ?`, params);
  }
}

// ==================== 审核 ====================

export async function approveTask(taskId, tenantId) {
  if (tenantId) {
    await pool.execute(
      'UPDATE task t JOIN user u ON t.user_id = u.id SET t.review_status = 1, t.update_time = NOW() WHERE t.id = ? AND u.tenant_id = ?',
      [taskId, tenantId],
    );
  } else {
    await pool.execute(
      'UPDATE task SET review_status = 1, update_time = NOW() WHERE id = ?',
      [taskId],
    );
  }
}

export async function rejectTask(taskId, tenantId) {
  if (tenantId) {
    await pool.execute(
      'UPDATE task t JOIN user u ON t.user_id = u.id SET t.review_status = 2, t.update_time = NOW() WHERE t.id = ? AND u.tenant_id = ?',
      [taskId, tenantId],
    );
  } else {
    await pool.execute(
      'UPDATE task SET review_status = 2, update_time = NOW() WHERE id = ?',
      [taskId],
    );
  }
}

// ==================== 套餐管理 ====================

const PLAN_COLS = 'id, plan_type, name, price, original_price, credits, daily_credits, save_days, watermark_free, hd_export, brand_kit, batch_limit, priority_queue, status, sort_order, create_time, update_time';

export async function listAllPlans() {
  const [rows] = await pool.execute(`SELECT ${PLAN_COLS} FROM membership_plan ORDER BY sort_order, id`);
  return rows;
}

export async function createPlan(data) {
  const { name, price, credits, duration_days, plan_type, description, status } = data;
  const [result] = await pool.execute(
    'INSERT INTO membership_plan (name, price, credits, duration_days, plan_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, price || 0, credits || 0, duration_days || 30, plan_type || 1, description || null, status ?? 1],
  );
  return result.insertId;
}

export async function deletePlan(planId) {
  const [r] = await pool.execute('DELETE FROM membership_plan WHERE id = ?', [planId]);
  return r.affectedRows;
}

export async function updatePlan(planId, data) {
  const sets = [];
  const params = [];
  const allowed = ['name', 'price', 'original_price', 'credits', 'daily_credits', 'daily_limit', 'monthly_limit', 'save_days',
    'watermark_free', 'hd_export', 'brand_kit', 'batch_limit', 'priority_queue', 'status', 'sort_order'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (sets.length === 0) return null;
  params.push(planId);
  await pool.execute(`UPDATE membership_plan SET ${sets.join(', ')}, update_time = NOW() WHERE id = ?`, params);
  const [rows] = await pool.execute(`SELECT ${PLAN_COLS} FROM membership_plan WHERE id = ? LIMIT 1`, [planId]);
  return rows[0] || null;
}

// ==================== 订单管理 ====================

export async function listAllOrders({ offset, pageSize, userId, planType }) {
  let sql = `
    SELECT cr.id, cr.user_id, u.username, u.nickname, cr.action, cr.credit_before, cr.credit_after,
           cr.consumed, cr.remark, cr.create_time,
           CASE cr.action
             WHEN 'purchase_plan_1' THEN '月卡'
             WHEN 'purchase_plan_2' THEN '季卡'
             WHEN 'purchase_plan_3' THEN '年卡'
             ELSE ''
           END AS plan_name,
           CAST(SUBSTRING_INDEX(cr.action, '_', -1) AS UNSIGNED) AS plan_type
    FROM consumption_record cr
    LEFT JOIN user u ON u.id = cr.user_id
    WHERE cr.type = 3
  `;
  const params = [];
  if (userId) { sql += ' AND cr.user_id = ?'; params.push(Number(userId)); }
  if (planType) { sql += ' AND cr.action = ?'; params.push(`purchase_plan_${planType}`); }
  params.push(offset, pageSize);
  sql += ' ORDER BY cr.create_time DESC LIMIT ?, ?';

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM consumption_record cr WHERE cr.type = 3';
  const countParams = [];
  if (userId) { countSql += ' AND cr.user_id = ?'; countParams.push(Number(userId)); }
  if (planType) {
    countSql += ' AND cr.action = ?';
    countParams.push(`purchase_plan_${planType}`);
  }
  const [[{ total }]] = await pool.execute(countSql, countParams);

  return { list: rows, total };
}

export async function deletePaymentOrder(orderId, tenantId) {
  // tenant_id 隔离必传，避免跨租户删除
  if (!tenantId) return 0;
  const [r] = await pool.execute('DELETE po FROM payment_order po JOIN user u ON po.user_id = u.id WHERE po.id = ? AND u.tenant_id = ?', [orderId, tenantId]);
  return r.affectedRows;
}

// ==================== 企业订单管理 ====================

export async function listEnterpriseOrders(tenantId, { page, pageSize, status, startDate, endDate, keyword }) {
  const conditions = ['o.tenant_id = ?'];
  const params = [tenantId];
  if (status) { conditions.push('o.status = ?'); params.push(status); }
  if (startDate) { conditions.push('o.created_at >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('o.created_at <= ?'); params.push(endDate + ' 23:59:59'); }
  if (keyword) { conditions.push('(o.order_no LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }

  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT o.*, u.nickname AS customer_name, u.phone AS customer_phone
     FROM \`order\` o LEFT JOIN user u ON o.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM \`order\` o WHERE ${conditions.join(' AND ')}`,
    params,
  );
  return { list: rows, total };
}

export async function getEnterpriseOrderById(orderId, tenantId) {
  const [rows] = await pool.query(
    `SELECT o.*, u.nickname AS customer_name, u.phone AS customer_phone, u.email AS customer_email
     FROM \`order\` o LEFT JOIN user u ON o.user_id = u.id
     WHERE o.id = ? AND o.tenant_id = ?
     LIMIT 1`,
    [orderId, tenantId],
  );
  return rows[0] || null;
}

export async function getEnterpriseOrderStats(tenantId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total_orders,
            COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) AS total_refund,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count
     FROM \`order\` WHERE tenant_id = ?`,
    [tenantId],
  );
  return rows[0];
}
