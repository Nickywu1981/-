/**
 * 行为埋点分析服务
 * 追踪关键转化事件：注册/首次上传/首次生成/付费
 */
import pool from '../dao/db.js';

// 事件类型常量
export const EVENT = {
  PAGE_VIEW: 'page_view',
  REGISTER: 'register',
  FIRST_UPLOAD: 'first_upload',
  FIRST_GENERATE: 'first_generate',
  UPGRADE_CLICK: 'upgrade_click',
  PAYMENT_START: 'payment_start',
  PAYMENT_SUCCESS: 'payment_success',
  TOOL_USE: 'tool_use',
  SHARE: 'share',
  INVITE: 'invite',
};

/**
 * 记录用户行为事件
 */
export async function trackEvent(userId, event, metadata = {}) {
  try {
    await pool.execute(
      `INSERT INTO operation_log (user_id, action, target_type, target_id, detail, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        event,
        metadata.targetType || 'analytics',
        metadata.targetId || '',
        JSON.stringify(metadata),
        metadata.ip || '',
      ],
    );
  } catch (err) {
    // 埋点失败不阻塞业务
    console.error('[Analytics] trackEvent error:', err.message);
  }
}

/**
 * 获取注册漏斗数据
 * 注册 → 首次上传 → 首次生成 → 付费
 */
export async function getFunnelMetrics(days = 30) {
  const [rows] = await pool.execute(
    `SELECT
      COUNT(DISTINCT CASE WHEN action = 'register' THEN user_id END) as registrations,
      COUNT(DISTINCT CASE WHEN action = 'first_upload' THEN user_id END) as first_uploads,
      COUNT(DISTINCT CASE WHEN action = 'first_generate' THEN user_id END) as first_generates,
      COUNT(DISTINCT CASE WHEN action = 'payment_success' THEN user_id END) as payments
     FROM operation_log
     WHERE create_time >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  );
  const r = rows[0];
  const regs = Number(r.registrations) || 0;
  const ups = Number(r.first_uploads) || 0;
  const gens = Number(r.first_generates) || 0;
  const pays = Number(r.payments) || 0;
  return {
    registrations: regs,
    firstUploads: ups,
    firstGenerates: gens,
    payments: pays,
    uploadRate: regs > 0 ? ((ups / regs) * 100).toFixed(1) : '0',
    generateRate: regs > 0 ? ((gens / regs) * 100).toFixed(1) : '0',
    payRate: regs > 0 ? ((pays / regs) * 100).toFixed(1) : '0',
  };
}

/**
 * 获取 DAU/MAU
 */
export async function getActiveUsers() {
  const [[dau]] = await pool.execute(
    `SELECT COUNT(DISTINCT user_id) as count FROM operation_log
     WHERE create_time >= CURDATE() AND user_id IS NOT NULL`,
  );
  const [[mau]] = await pool.execute(
    `SELECT COUNT(DISTINCT user_id) as count FROM operation_log
     WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND user_id IS NOT NULL`,
  );
  return { dau: Number(dau.count), mau: Number(mau.count) };
}

/**
 * 获取工具使用热度 Top N
 */
export async function getTopTools(days = 7, limit = 10) {
  const [rows] = await pool.execute(
    `SELECT target_type as tool, COUNT(*) as count
     FROM operation_log
     WHERE action = 'tool_use' AND create_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY target_type
     ORDER BY count DESC
     LIMIT ?`,
    [days, limit],
  );
  return rows;
}

/**
 * 获取每日趋势数据
 */
export async function getDailyTrend(days = 30) {
  const [rows] = await pool.execute(
    `SELECT
      DATE(create_time) as date,
      COUNT(DISTINCT CASE WHEN action = 'register' THEN user_id END) as registrations,
      COUNT(DISTINCT CASE WHEN action = 'first_generate' THEN user_id END) as generates,
      COUNT(DISTINCT CASE WHEN action = 'payment_success' THEN user_id END) as payments
     FROM operation_log
     WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(create_time)
     ORDER BY date ASC`,
    [days],
  );
  return rows;
}

/**
 * 转化漏斗：落地→注册→激活→付费→留存
 */
export async function getConversionFunnel(days = 30) {
  const [[row]] = await pool.execute(
    `SELECT
      COUNT(DISTINCT CASE WHEN action = 'page_view' THEN user_id END) as landing,
      COUNT(DISTINCT CASE WHEN action = 'register' THEN user_id END) as registered,
      COUNT(DISTINCT CASE WHEN action = 'first_generate' THEN user_id END) as activated,
      COUNT(DISTINCT CASE WHEN action = 'payment_success' THEN user_id END) as paid,
      COUNT(DISTINCT CASE WHEN action = 'repeat_use' AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN user_id END) as retained
     FROM operation_log
     WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days],
  );
  const landing = Number(row.landing) || 0;
  const reg = Number(row.registered) || 0;
  const act = Number(row.activated) || 0;
  const paid = Number(row.paid) || 0;
  const ret = Number(row.retained) || 0;
  return {
    steps: [
      { name: '访问落地', count: landing, rate: '100%' },
      { name: '注册', count: reg, rate: landing ? (reg / landing * 100).toFixed(1) + '%' : '0%' },
      { name: '激活(首次生成)', count: act, rate: reg ? (act / reg * 100).toFixed(1) + '%' : '0%' },
      { name: '付费转化', count: paid, rate: act ? (paid / act * 100).toFixed(1) + '%' : '0%' },
      { name: '7日留存', count: ret, rate: act ? (ret / act * 100).toFixed(1) + '%' : '0%' },
    ],
  };
}

export default { trackEvent, getFunnelMetrics, getActiveUsers, getTopTools, getDailyTrend, getConversionFunnel, EVENT };
