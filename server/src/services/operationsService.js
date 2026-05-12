/**
 * 跨租户运营看板服务 — 第四层架构：总后台+运营端
 *
 * 提供跨租户数据聚合：租户总览、Token 聚合、利润总览、运营趋势、租户排行
 * 所有查询通过参数化 SQL 执行，mockEnabled 时返回逼真模拟数据
 */
import db from '../dao/db.js';
import { mockEnabled } from '../config/index.js';

// ==================== Mock Data Generators ====================

const MOCK_TENANTS = [
  { id: 1, name: '星辰科技', industry: '电商', status: 1, created_at: '2025-09-15' },
  { id: 2, name: '云帆集团', industry: '零售', status: 1, created_at: '2025-10-08' },
  { id: 3, name: '凌峰数据', industry: 'SaaS', status: 1, created_at: '2025-11-20' },
  { id: 4, name: '瑞达商贸', industry: '跨境', status: 0, created_at: '2026-01-05' },
  { id: 5, name: '锦程互动', industry: '文娱', status: 1, created_at: '2026-02-14' },
];

const MOCK_MODELS = ['gpt-4o', 'claude-sonnet-4-6', 'gemini-2.5-pro', 'gpt-image-2'];

const MOCK_AGENTS = [
  { id: 1, name: '张明远', level: '金牌代理', commission_rate: 0.15 },
  { id: 2, name: '李思琪', level: '银牌代理', commission_rate: 0.12 },
  { id: 3, name: '王建国', level: '铜牌代理', commission_rate: 0.10 },
  { id: 4, name: '赵晓琳', level: '银牌代理', commission_rate: 0.12 },
  { id: 5, name: '陈志远', level: '金牌代理', commission_rate: 0.15 },
];

function seedRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateDailyData(days, baseValue, variance, seed) {
  const rand = seedRandom(seed);
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const val = Math.max(0, Math.round(baseValue + (rand() - 0.5) * variance * 2));
    data.push({ date: d.toISOString().slice(0, 10), value: val });
  }
  return data;
}

function generateTenantDailyData(days, tenants) {
  const rand = seedRandom(42);
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const entry = { date: d.toISOString().slice(0, 10) };
    tenants.forEach(t => { entry[`tenant_${t.id}`] = Math.max(0, Math.round(5000 + rand() * 15000)); });
    data.push(entry);
  }
  return data;
}

// ==================== 1. 跨租户总览 ====================

export async function getOpsOverview() {
  if (mockEnabled) {
    return {
      totalTenants: 5,
      activeTenants30d: 4,
      totalAgents: 5,
      totalEnterprises: 12,
      pendingApprovals: 3,
      tenantList: MOCK_TENANTS.map(t => ({
        id: t.id,
        name: t.name,
        industry: t.industry,
        status: t.status,
        createdAt: t.created_at,
      })),
    };
  }

  const [[{ totalTenants }], [{ activeTenants30d }], [{ totalAgents }], [{ totalEnterprises }], [{ pendingApprovals }]] =
    await Promise.all([
      db.query('SELECT COUNT(*) AS totalTenants FROM tenant WHERE is_deleted = 0'),
      db.query('SELECT COUNT(DISTINCT tenant_id) AS activeTenants30d FROM ai_call_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
      db.query('SELECT COUNT(*) AS totalAgents FROM enterprise_user WHERE role IN (\'agent_admin\', \'agent_operator\', \'agent_viewer\') AND is_deleted = 0'),
      db.query('SELECT COUNT(*) AS totalEnterprises FROM enterprise_user WHERE role = \'enterprise_admin\' AND is_deleted = 0'),
      db.query('SELECT COUNT(*) AS pendingApprovals FROM enterprise_user WHERE status = 0 AND is_deleted = 0'),
    ]);

  const [tenantList] = await db.query(
    'SELECT id, name, industry, status, created_at FROM tenant WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 20',
  );

  return {
    totalTenants: Number(totalTenants) || 0,
    activeTenants30d: Number(activeTenants30d) || 0,
    totalAgents: Number(totalAgents) || 0,
    totalEnterprises: Number(totalEnterprises) || 0,
    pendingApprovals: Number(pendingApprovals) || 0,
    tenantList: (tenantList || []).map(t => ({
      id: t.id,
      name: t.name,
      industry: t.industry || '',
      status: t.status,
      createdAt: t.created_at,
    })),
  };
}

// ==================== 2. Token 聚合 ====================

export async function getTokenAggregation({ days = 30 } = {}) {
  if (mockEnabled) {
    const rand = seedRandom(77);
    const modelBreakdown = MOCK_MODELS.map((model, i) => {
      const callCount = Math.round(200 + rand() * 800);
      const avgTokens = model === 'gpt-image-2' ? 0 : Math.round(500 + rand() * 3500);
      const totalTokens = model === 'gpt-image-2' ? 0 : callCount * avgTokens;
      const costPerUnit = model === 'gpt-image-2' ? 0.05 : (i === 0 ? 0.00001 : i === 1 ? 0.000008 : 0.000005);
      const totalCost = model === 'gpt-image-2' ? Math.round(callCount * costPerUnit * 100) / 100 : Math.round(totalTokens * costPerUnit * 100) / 100;
      return {
        model,
        callCount,
        totalTokens,
        totalCost,
        avgTokensPerCall: model === 'gpt-image-2' ? 0 : avgTokens,
      };
    });

    const tenantTop10 = MOCK_TENANTS.map((t, i) => {
      const tokens = Math.round(500000 + rand() * 2500000);
      const cost = Math.round(tokens * (0.000005 + rand() * 0.00001) * 100) / 100;
      return { tenantId: t.id, tenantName: t.name, totalTokens: tokens, totalCost: cost, callCount: Math.round(100 + rand() * 900) };
    }).sort((a, b) => b.totalTokens - a.totalTokens);

    const totalTokens = modelBreakdown.reduce((s, m) => s + m.totalTokens, 0);
    const totalCost = Math.round(modelBreakdown.reduce((s, m) => s + m.totalCost, 0) * 100) / 100;
    const totalCalls = modelBreakdown.reduce((s, m) => s + m.callCount, 0);

    return {
      totalTokens,
      totalCost,
      totalCalls,
      avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
      modelBreakdown,
      tenantTop10,
    };
  }

  const [{ totalTokens, totalCost, totalCalls }] = await db.query(
    `SELECT
       COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS totalTokens,
       COALESCE(SUM(cost), 0) AS totalCost,
       COUNT(*) AS totalCalls
     FROM ai_call_log
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  );

  const [modelBreakdown] = await db.query(
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

  const [tenantTop10] = await db.query(
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

// ==================== 3. 利润总览 ====================

export async function getProfitOverview() {
  if (mockEnabled) {
    const agentEarnings = [
      { agentId: 1, agentName: '张明远', level: '金牌代理', totalCommission: 12580.50, paidCommission: 9800.00, customerCount: 45 },
      { agentId: 2, agentName: '李思琪', level: '银牌代理', totalCommission: 8720.00, paidCommission: 7200.00, customerCount: 32 },
      { agentId: 5, agentName: '陈志远', level: '金牌代理', totalCommission: 11450.30, paidCommission: 8900.00, customerCount: 38 },
      { agentId: 4, agentName: '赵晓琳', level: '银牌代理', totalCommission: 6340.80, paidCommission: 5000.00, customerCount: 25 },
      { agentId: 3, agentName: '王建国', level: '铜牌代理', totalCommission: 4290.00, paidCommission: 3200.00, customerCount: 18 },
    ];

    const totalCommission = agentEarnings.reduce((s, a) => s + a.totalCommission, 0);
    const paidCommission = agentEarnings.reduce((s, a) => s + a.paidCommission, 0);
    const pendingWithdrawals = 4980.60;

    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      paidCommission: Math.round(paidCommission * 100) / 100,
      unpaidCommission: Math.round((totalCommission - paidCommission) * 100) / 100,
      pendingWithdrawals,
      totalPlatformRevenue: 89340.50,
      netProfit: Math.round((89340.50 - paidCommission) * 100) / 100,
      agentTop10: agentEarnings,
    };
  }

  const [[commStats], [withdrawalPending], [agentTop10]] = await Promise.all([
    db.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS totalCommission,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paidCommission
       FROM commission_records`,
    ),
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS pendingWithdrawals
       FROM withdrawal_records
       WHERE status = 'pending'`,
    ),
    db.query(
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

// ==================== 4. 运营趋势 ====================

export async function getOpsTrends({ days = 30 } = {}) {
  if (mockEnabled) {
    const tokensTrend = generateDailyData(days, 85000, 30000, 101);
    const costTrend = generateDailyData(days, 45, 25, 202);
    const tasksTrend = generateDailyData(days, 120, 60, 303);
    const revenueTrend = generateDailyData(days, 210, 130, 404);

    return {
      tokensTrend: tokensTrend.map(t => ({ ...t, value: Math.round(t.value / 100) * 100 })),
      costTrend: costTrend.map(t => ({ ...t, value: Math.round(t.value * 100) / 100 })),
      tasksTrend,
      revenueTrend: revenueTrend.map(t => ({ ...t, value: Math.round(t.value * 100) / 100 })),
    };
  }

  const [tokensTrend, costTrend, tasksTrend, revenueTrend] = await Promise.all([
    db.query(
      `SELECT
         DATE(created_at) AS date,
         COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS value
       FROM ai_call_log
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days],
    ),
    db.query(
      `SELECT
         DATE(created_at) AS date,
         COALESCE(SUM(cost), 0) AS value
       FROM ai_call_log
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days],
    ),
    db.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS value
       FROM ai_call_log
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days],
    ),
    db.query(
      `SELECT
         DATE(created_at) AS date,
         COALESCE(SUM(amount), 0) AS value
       FROM payment_orders
       WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days],
    ),
  ]);

  const fillDays = (rows, daysCount) => {
    const map = new Map((rows || []).map(r => [String(r.date).slice(0, 10), Number(r.value) || 0]));
    const result = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, value: map.get(key) || 0 });
    }
    return result;
  };

  return {
    tokensTrend: fillDays(tokensTrend, days),
    costTrend: fillDays(costTrend, days).map(t => ({ ...t, value: Math.round(t.value * 100) / 100 })),
    tasksTrend: fillDays(tasksTrend, days),
    revenueTrend: fillDays(revenueTrend, days).map(t => ({ ...t, value: Math.round(t.value * 100) / 100 })),
  };
}

// ==================== 5. 租户排行 ====================

export async function getTenantRanking({ metric = 'tokens', limit = 10 } = {}) {
  if (mockEnabled) {
    const rand = seedRandom(999);
    const ranking = MOCK_TENANTS.map((t, i) => {
      let value;
      switch (metric) {
        case 'cost':
          value = Math.round((25 + rand() * 180) * 100) / 100;
          break;
        case 'tasks':
          value = Math.round(300 + rand() * 2700);
          break;
        case 'tokens':
        default:
          value = Math.round(150000 + rand() * 2850000);
          break;
      }
      return {
        rank: 0,
        tenantId: t.id,
        tenantName: t.name,
        industry: t.industry,
        status: t.status,
        value,
      };
    }).sort((a, b) => b.value - a.value);

    ranking.forEach((r, i) => { r.rank = i + 1; });

    return {
      metric,
      ranking: ranking.slice(0, limit),
      totalTenantsCompared: MOCK_TENANTS.length,
    };
  }

  let selectClause, orderClause;
  switch (metric) {
    case 'cost':
      selectClause = 'COALESCE(SUM(acl.cost), 0) AS value';
      orderClause = 'value DESC';
      break;
    case 'tasks':
      selectClause = 'COUNT(*) AS value';
      orderClause = 'value DESC';
      break;
    case 'tokens':
    default:
      selectClause = 'COALESCE(SUM(acl.prompt_tokens + acl.completion_tokens), 0) AS value';
      orderClause = 'value DESC';
      break;
  }

  const [ranking] = await db.query(
    `SELECT
       acl.tenant_id AS tenantId,
       COALESCE(t.name, '未命名') AS tenantName,
       COALESCE(t.industry, '') AS industry,
       COALESCE(t.status, 1) AS status,
       ${selectClause}
     FROM ai_call_log acl
     LEFT JOIN tenant t ON t.id = acl.tenant_id
     GROUP BY acl.tenant_id, t.name, t.industry, t.status
     ORDER BY ${orderClause}
     LIMIT ?`,
    [limit],
  );

  const [{ totalTenantsCompared }] = await db.query(
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
