import pool from './db.js';

// ========================= 跨租户总览 =========================

export async function getTenantStats() {
  const [[{ totalTenants }], [{ activeTenants30d }], [{ totalAgents }], [{ totalEnterprises }], [{ pendingApprovals }]] =
    await Promise.all([
      pool.query('SELECT COUNT(*) AS totalTenants FROM tenant WHERE status = 1'),
      pool.query('SELECT COUNT(DISTINCT tenant_id) AS activeTenants30d FROM ai_call_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
      pool.query(`SELECT COUNT(*) AS totalAgents FROM enterprise_user WHERE role IN ('agent_admin', 'agent_operator', 'agent_viewer') AND is_deleted = 0`),
      pool.query(`SELECT COUNT(*) AS totalEnterprises FROM enterprise_user WHERE role = 'enterprise_admin' AND is_deleted = 0`),
      pool.query('SELECT COUNT(*) AS pendingApprovals FROM enterprise_user WHERE status = 0 AND is_deleted = 0'),
    ]);

  const [tenantList] = await pool.query(
    'SELECT id, name, industry, status, created_at FROM tenant WHERE status = 1 ORDER BY created_at DESC LIMIT 20',
  );

  return {
    totalTenants: Number(totalTenants) || 0,
    activeTenants30d: Number(activeTenants30d) || 0,
    totalAgents: Number(totalAgents) || 0,
    totalEnterprises: Number(totalEnterprises) || 0,
    pendingApprovals: Number(pendingApprovals) || 0,
    tenantList: (tenantList || []).map(t => ({
      id: t.id, name: t.name, industry: t.industry || '', status: t.status, createdAt: t.created_at,
    })),
  };
}

// ========================= Token 聚合 =========================

export async function getTokenAggregation(days = 30) {
  const [{ totalTokens, totalCost, totalCalls }] = await pool.query(
    `SELECT
       COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS totalTokens,
       COALESCE(SUM(cost), 0) AS totalCost,
       COUNT(*) AS totalCalls
     FROM ai_call_log
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  );

  const [modelBreakdown] = await pool.query(
    `SELECT
       model,
       COUNT(*) AS callCount,
       COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS totalTokens,
       COALESCE(SUM(cost), 0) AS totalCost
     FROM ai_call_log
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY model
     ORDER BY totalTokens DESC`,
    [days],
  );

  const [tenantTop10] = await pool.query(
    `SELECT
       acl.tenant_id AS tenantId,
       COALESCE(t.name, '未命名') AS tenantName,
       COALESCE(SUM(acl.prompt_tokens + acl.completion_tokens), 0) AS totalTokens,
       COALESCE(SUM(acl.cost), 0) AS totalCost,
       COUNT(*) AS callCount
     FROM ai_call_log acl
     LEFT JOIN tenant t ON t.id = acl.tenant_id
     WHERE acl.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY acl.tenant_id, t.name
     ORDER BY totalTokens DESC
     LIMIT 10`,
    [days],
  );

  const numericTokens = Number(totalTokens) || 0;
  const numericCalls = Number(totalCalls) || 0;

  return {
    totalTokens: numericTokens,
    totalCost: Math.round((Number(totalCost) || 0) * 100) / 100,
    totalCalls: numericCalls,
    avgTokensPerCall: numericCalls > 0 ? Math.round(numericTokens / numericCalls) : 0,
    modelBreakdown: (modelBreakdown || []).map(m => ({
      model: m.model,
      callCount: Number(m.callCount) || 0,
      totalTokens: Number(m.totalTokens) || 0,
      totalCost: Math.round((Number(m.totalCost) || 0) * 100) / 100,
      avgTokensPerCall: m.callCount > 0 ? Math.round((Number(m.totalTokens) || 0) / Number(m.callCount)) : 0,
    })),
    tenantTop10: (tenantTop10 || []).map(t => ({
      tenantId: t.tenantId,
      tenantName: t.tenantName || '未知',
      totalTokens: Number(t.totalTokens) || 0,
      totalCost: Math.round((Number(t.totalCost) || 0) * 100) / 100,
      callCount: Number(t.callCount) || 0,
    })),
  };
}

// ========================= 利润总览 =========================

export async function getProfitOverview() {
  const [[commStats], [withdrawalPending], [agentTop10]] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS totalCommission,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paidCommission
       FROM commission_records`,
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS pendingWithdrawals
       FROM withdrawal_records
       WHERE status = 'pending'`,
    ),
    pool.query(
      `SELECT
         cr.agent_id AS agentId,
         COALESCE(eu.nickname, eu.username, '未命名') AS agentName,
         COALESCE(eu.level, '') AS level,
         COALESCE(SUM(cr.amount), 0) AS totalCommission,
         COALESCE(SUM(CASE WHEN cr.status = 'paid' THEN cr.amount ELSE 0 END), 0) AS paidCommission,
         COUNT(DISTINCT cr.user_id) AS customerCount
       FROM commission_records cr
       LEFT JOIN enterprise_user eu ON eu.id = cr.agent_id
       GROUP BY cr.agent_id, eu.nickname, eu.username, eu.level
       ORDER BY totalCommission DESC
       LIMIT 10`,
    ),
  ]);

  const totalCommission = Number(commStats?.totalCommission) || 0;
  const paidCommission = Number(commStats?.paidCommission) || 0;
  const pendingWithdrawals = Number(withdrawalPending?.pendingWithdrawals) || 0;

  return {
    totalCommission: Math.round(totalCommission * 100) / 100,
    paidCommission: Math.round(paidCommission * 100) / 100,
    unpaidCommission: Math.round((totalCommission - paidCommission) * 100) / 100,
    pendingWithdrawals: Math.round(pendingWithdrawals * 100) / 100,
    totalPlatformRevenue: 0,
    netProfit: 0,
    agentTop10: (agentTop10 || []).map(a => ({
      agentId: a.agentId,
      agentName: a.agentName || '未知',
      level: a.level || '',
      totalCommission: Math.round((Number(a.totalCommission) || 0) * 100) / 100,
      paidCommission: Math.round((Number(a.paidCommission) || 0) * 100) / 100,
      customerCount: Number(a.customerCount) || 0,
    })),
  };
}

// ========================= 运营趋势 =========================

function fillDays(rows, daysCount) {
  const map = new Map((rows || []).map(r => [String(r.date).slice(0, 10), Number(r.value) || 0]));
  const result = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) || 0 });
  }
  return result;
}

export async function getTrends(days = 30) {
  const [tokensTrend, costTrend, tasksTrend, revenueTrend] = await Promise.all([
    pool.query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS value
       FROM ai_call_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [days],
    ),
    pool.query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(cost), 0) AS value
       FROM ai_call_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [days],
    ),
    pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS value
       FROM ai_call_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [days],
    ),
    pool.query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(amount), 0) AS value
       FROM payment_orders WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [days],
    ),
  ]);

  return {
    tokensTrend: fillDays(tokensTrend, days),
    costTrend: fillDays(costTrend, days).map(t => ({ ...t, value: Math.round(t.value * 100) / 100 })),
    tasksTrend: fillDays(tasksTrend, days),
    revenueTrend: fillDays(revenueTrend, days).map(t => ({ ...t, value: Math.round(t.value * 100) / 100 })),
  };
}

// ========================= 租户排行 =========================

export async function getTenantRanking(metric = 'tokens', limit = 10) {
  let selectClause;
  switch (metric) {
    case 'cost':
      selectClause = 'COALESCE(SUM(acl.cost), 0) AS value';
      break;
    case 'tasks':
      selectClause = 'COUNT(*) AS value';
      break;
    case 'tokens':
    default:
      selectClause = 'COALESCE(SUM(acl.prompt_tokens + acl.completion_tokens), 0) AS value';
      break;
  }

  const [ranking] = await pool.query(
    `SELECT
       acl.tenant_id AS tenantId,
       COALESCE(t.name, '未命名') AS tenantName,
       COALESCE(t.industry, '') AS industry,
       COALESCE(t.status, 1) AS status,
       ${selectClause}
     FROM ai_call_log acl
     LEFT JOIN tenant t ON t.id = acl.tenant_id
     GROUP BY acl.tenant_id, t.name, t.industry, t.status
     ORDER BY value DESC
     LIMIT ?`,
    [limit],
  );

  const [{ totalTenantsCompared }] = await pool.query(
    'SELECT COUNT(DISTINCT tenant_id) AS totalTenantsCompared FROM ai_call_log',
  );

  return {
    metric,
    ranking: (ranking || []).map((r, i) => ({
      rank: i + 1,
      tenantId: r.tenantId,
      tenantName: r.tenantName || '未知',
      industry: r.industry || '',
      status: Number(r.status) || 1,
      value: metric === 'cost'
        ? Math.round((Number(r.value) || 0) * 100) / 100
        : (Number(r.value) || 0),
    })),
    totalTenantsCompared: Number(totalTenantsCompared) || 0,
  };
}
