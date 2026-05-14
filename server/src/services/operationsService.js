/**
 * 跨租户运营看板服务 — 第四层架构：总后台+运营端
 *
 * 提供跨租户数据聚合：租户总览、Token 聚合、利润总览、运营趋势、租户排行
 * G6 数据库接口 | 通过 operationsDao 访问数据库
 */
import * as opsDao from '../dao/operationsDao.js';
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

  return opsDao.getTenantStats();
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
      return { model, callCount, totalTokens, totalCost, avgTokensPerCall: model === 'gpt-image-2' ? 0 : avgTokens };
    });

    const tenantTop10 = MOCK_TENANTS.map((t, i) => {
      const tokens = Math.round(500000 + rand() * 2500000);
      const cost = Math.round(tokens * (0.000005 + rand() * 0.00001) * 100) / 100;
      return { tenantId: t.id, tenantName: t.name, totalTokens: tokens, totalCost: cost, callCount: Math.round(100 + rand() * 900) };
    }).sort((a, b) => b.totalTokens - a.totalTokens);

    const totalTokens = modelBreakdown.reduce((s, m) => s + m.totalTokens, 0);
    const totalCost = Math.round(modelBreakdown.reduce((s, m) => s + m.totalCost, 0) * 100) / 100;
    const totalCalls = modelBreakdown.reduce((s, m) => s + m.callCount, 0);

    return { totalTokens, totalCost, totalCalls, avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0, modelBreakdown, tenantTop10 };
  }

  return opsDao.getTokenAggregation(days);
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

  return opsDao.getProfitOverview();
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

  return opsDao.getTrends(days);
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

  return opsDao.getTenantRanking(metric, limit);
}
