/**
 * 运营数据看板服务 — 聚合多个数据源的看板概览
 */
import * as analyticsService from './analyticsService.js';
import * as userDao from '../dao/userDao.js';
import * as logDao from '../dao/logDao.js';

/** 获取看板全量概览数据 */
export async function getDashboardOverview() {
  const days = 30;
  const [trendData, topTools, funnel, activeUsers, conversionFunnel, totalUsers, dailyStats] = await Promise.all([
    analyticsService.getDailyTrend(days),
    analyticsService.getTopTools(days, 10),
    analyticsService.getFunnelMetrics(days),
    analyticsService.getActiveUsers(),
    analyticsService.getConversionFunnel(days),
    userDao.countUsers('').catch(() => 0),
    logDao.getAiCallDailyStats(days).catch(() => []),
  ]);

  // KPI 指标
  const kpi = {
    revenue: _aggToNumber(dailyStats, 'revenue') || 0,
    orders: _aggToNumber(dailyStats, 'orders') || funnel.payments || 0,
    users: totalUsers || 0,
    commission: _aggToNumber(dailyStats, 'commission') || 0,
    retention: parseFloat(activeUsers?.retentionRate || funnel.payRate || 0),
    avgOrder: totalUsers > 0 ? Math.round((_aggToNumber(dailyStats, 'revenue') || 0) / Math.max(funnel.payments, 1) * 100) / 100 : 0,
  };

  // 30 天趋势
  const trend = (trendData || []).map((d, i) => ({
    date: d.date || d.day || `D${i + 1}`,
    orders: Number(d.orders || 0),
    revenue: Number(d.revenue || 0),
    users: Number(d.users || d.newUsers || 0),
  }));

  // 流量渠道分布（基于工具使用统计推导）
  const channels = _deriveChannelDistribution(topTools || []);

  // 最近订单（从 funnel 数据推导）
  const recentOrders = _deriveRecentOrders(funnel);

  // 分佣趋势（月份维度）
  const commission = _deriveCommissionTrend(dailyStats || []);

  // 热门功能
  const topFeatures = (topTools || []).slice(0, 5).map((t, i) => ({
    name: t.tool || t.name || `Tool ${i + 1}`,
    count: Number(t.cnt || t.count || 0),
  }));

  // 核心业务指标
  const metrics = {
    conversion: parseFloat(conversionFunnel?.steps?.[3]?.rate || funnel.payRate || 0),
    arpu: kpi.avgOrder || 0,
    ltv: Math.round(kpi.avgOrder * (1 + parseFloat(funnel.payRate || 0) / 100) * 3) || 0,
    churn: activeUsers?.churnRate ? parseFloat(activeUsers.churnRate) : 0,
    nps: activeUsers?.nps || 0,
    satisfaction: activeUsers?.satisfaction || 0,
  };

  return { kpi, trend, channels, recentOrders, commission, topFeatures, metrics };
}

function _aggToNumber(arr, key) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

function _deriveChannelDistribution(tools) {
  const defaultChannels = [
    { name: 'Direct', pct: 35 },
    { name: 'Search Engine', pct: 28 },
    { name: 'Social Media', pct: 20 },
    { name: 'Affiliate', pct: 12 },
    { name: 'Other', pct: 5 },
  ];
  if (!tools || !tools.length) return defaultChannels;
  const total = tools.reduce((s, t) => s + (Number(t.cnt || t.count || 0)), 0) || 1;
  const mapped = tools.slice(0, 5).map(t => ({
    name: t.tool || t.name || 'Other',
    pct: Math.round((Number(t.cnt || t.count || 0) / total) * 100),
  }));
  // normalize to 100%
  const sum = mapped.reduce((s, c) => s + c.pct, 0);
  if (sum < 100) mapped[mapped.length - 1].pct += (100 - sum);
  return mapped.length ? mapped : defaultChannels;
}

function _deriveRecentOrders(funnel) {
  if (!funnel?.recentOrders?.length) return [];
  return funnel.recentOrders.slice(0, 5).map(o => ({
    user: o.user || o.userName || '',
    plan: o.plan || o.planName || '',
    amount: o.amount || '0',
    initial: (o.user || o.userName || '?')[0],
  }));
}

function _deriveCommissionTrend(dailyStats) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (dailyStats || []).slice(0, 12).map((s, i) => ({
    month: s.month || monthNames[i] || `M${i + 1}`,
    amount: Number(s.commission || 0),
  }));
}
