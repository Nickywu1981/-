/**
 * 商业化服务 — 第七阶段
 * 会员购买 / 账单记录 / 管理后台 / 风控审计
 */

import * as creditDao from '../dao/creditDao.js';
import * as commerceDao from '../dao/commerceDao.js';
import { mockEnabled } from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
import { PLAN_TYPE } from '../constants/domainStatus.js';

// ==================== 套餐列表 ====================

export async function getPlans() {
  return creditDao.listActivePlans();
}

// ==================== 购买套餐 ====================

export async function purchasePlan(userId, planType) {
  const plan = await creditDao.getPlanByType(planType);
  if (!plan || !plan.status) throw new BusinessError(400, '套餐不存在或已下架');

  const membership = await creditDao.getMembership(userId);
  const now = new Date();
  let endTime;

  switch (planType) {
    case 1: endTime = new Date(now.getTime() + 30 * 86400000); break;  // 月卡+30天
    case 2: endTime = new Date(now.getTime() + 90 * 86400000); break;  // 季卡+90天
    case 3: endTime = new Date(now.getTime() + 365 * 86400000); break; // 年卡+365天
    default: endTime = null;
  }

  // 更新会员
  if (membership && membership.plan_type !== PLAN_TYPE.FREE) {
    const currentEnd = new Date(membership.end_time);
    if (currentEnd > now) {
      endTime = new Date(currentEnd.getTime() + (endTime.getTime() - now.getTime()));
    }
    await commerceDao.renewMembership(userId, planType, endTime);
  } else {
    await commerceDao.updateMembership(userId, planType, plan.credits, endTime);
  }

  // 记录购买账单
  await creditDao.insertConsumptionLog({
    userId, type: 3,
    action: `purchase_plan_${planType}`,
    creditBefore: membership?.credit_balance || 0,
    creditAfter: (membership?.credit_balance || 0) + plan.credits,
    consumed: -plan.credits,
    remark: `购买${plan.name} ¥${plan.price}`,
  });

  return {
    planType,
    planName: plan.name,
    price: plan.price,
    creditsAdded: plan.credits,
    endTime: endTime?.toISOString(),
  };
}

// ==================== 账单记录 ====================

export async function getBillingHistory(userId, { page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [list, total] = await Promise.all([
    commerceDao.getBillingHistory(userId, offset, pageSize),
    commerceDao.countBillingHistory(userId),
  ]);
  return { list, total, page, pageSize };
}

// ==================== 管理后台 ====================

export async function getDashboardStats() {
  if (mockEnabled) {
    return {
      userCount: 5, taskCount: 22, todayTaskCount: 3, paidUserCount: 4, totalRevenue: 326,
      trends: {
        tasks: [{date:'2026-04-30',value:3},{date:'2026-05-01',value:5},{date:'2026-05-02',value:2},{date:'2026-05-03',value:4},{date:'2026-05-04',value:3},{date:'2026-05-05',value:2},{date:'2026-05-06',value:3}],
        users: [{date:'2026-04-30',value:0},{date:'2026-05-01',value:1},{date:'2026-05-02',value:0},{date:'2026-05-03',value:0},{date:'2026-05-04',value:1},{date:'2026-05-05',value:0},{date:'2026-05-06',value:0}],
        revenue: [{date:'2026-04-30',value:69},{date:'2026-05-01',value:0},{date:'2026-05-02',value:29},{date:'2026-05-03',value:0},{date:'2026-05-04',value:199},{date:'2026-05-05',value:29},{date:'2026-05-06',value:0}],
      },
    };
  }

  const stats = await commerceDao.getDashboardStats();

  const fill7Days = (rows, field = 'count') => {
    const map = new Map(rows.map(r => [String(r.date).slice(0, 10), r[field]]));
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, value: Number(map.get(key) || 0) });
    }
    return result;
  };

  return {
    userCount: stats.userCount,
    taskCount: stats.taskCount,
    todayTaskCount: stats.todayTaskCount,
    paidUserCount: stats.paidUserCount,
    totalRevenue: stats.totalRevenue,
    trends: {
      tasks: fill7Days(stats.taskTrend),
      users: fill7Days(stats.userTrend),
      revenue: fill7Days(stats.revenueTrend, 'amount'),
    },
  };
}

export async function listAllUsers({ page = 1, pageSize = 20, keyword = '', status, planType }) {
  const offset = (page - 1) * pageSize;
  const { list, total } = await commerceDao.listAllUsers({ offset, pageSize, keyword, status, planType });
  return { list, total: Number(total), page, pageSize };
}

export async function updateUserStatus(userId, status) {
  await commerceDao.updateUserStatus(userId, status);
}

// ==================== 风控服务 ====================

export async function checkRiskControl({ userId, ip, userAgent, action }) {
  const issues = [];

  if (action === 'register' && ip) {
    const count = await commerceDao.countIPRegister24h(ip);
    if (count >= 3) issues.push('同IP24小时内注册过多');
  }

  if (userId) {
    const count = await commerceDao.countUserAction1m(userId, action);
    if (count >= 30) issues.push('操作频率过高');
    await commerceDao.insertOperationLog(userId, action, ip || '', userAgent || '');
  }

  return { safe: issues.length === 0, issues };
}

// ==================== 操作日志查询 ====================

export async function getOperationLogs({ page = 1, pageSize = 20, userId, action }) {
  const offset = (page - 1) * pageSize;
  const { list, total } = await commerceDao.getOperationLogs({ offset, pageSize, userId, action });
  return { list, total, page, pageSize };
}

// ==================== 违规关键词 ====================

export function containsBannedKeywords(text) {
  const keywords = ['违禁品', '毒品', '枪支', '色情', '赌博'];
  const found = keywords.filter((kw) => text.includes(kw));
  return { hasBanned: found.length > 0, foundKeywords: found };
}

// ==================== 任务管理 ====================

export async function listAllTasks({ page = 1, pageSize = 20, userId, status, type, typeGroup, reviewStatus }) {
  const offset = (page - 1) * pageSize;
  const { list, total } = await commerceDao.listAllTasks({ offset, pageSize, userId, status, type, typeGroup, reviewStatus });
  return { list, total, page, pageSize };
}

// ==================== 套餐管理（后台可调） ====================

export async function getAllPlans() {
  return commerceDao.listAllPlans();
}

export async function updatePlan(planId, data) {
  const updated = await commerceDao.updatePlan(planId, data);
  if (!updated) throw new BusinessError(400, '没有可更新的字段');
  return updated;
}

// ==================== 内容审核 ====================

export async function approveTask(taskId) {
  await commerceDao.approveTask(taskId);
}

export async function rejectTask(taskId) {
  await commerceDao.rejectTask(taskId);
}

// ==================== 套餐订单管理 ====================

export async function listAllOrders({ page = 1, pageSize = 20, userId, planType }) {
  const offset = (page - 1) * pageSize;
  const { list, total } = await commerceDao.listAllOrders({ offset, pageSize, userId, planType });
  return { list, total, page, pageSize };
}

// ==================== 批量操作 ====================

export async function batchUpdateUserStatus(ids, status) {
  if (!Array.isArray(ids) || ids.length === 0) throw new BusinessError(400, '请选择用户');
  if (![0, 1].includes(status)) throw new BusinessError(400, '状态值无效（0启用/1禁用）');
  const affected = await commerceDao.batchUpdateUserStatus(ids, status);
  return { affected };
}

// ==================== 任务操作 ====================

export async function retryTask(taskId) {
  const task = await commerceDao.getTaskById(taskId);
  if (!task) throw new BusinessError(404, '任务不存在');
  if (![3, 4].includes(task.status)) throw new BusinessError(400, '只有失败/异常任务才能重试');
  const maxRetries = 3;
  if (task.retry_count >= maxRetries) throw new BusinessError(400, '已达最大重试次数');
  await commerceDao.updateTaskStatusDirect(taskId, {
    status: 6, progress: 0,
    progress_msg: `重试中(${task.retry_count + 1}/3)`,
  });
}

export async function pauseTask(taskId) {
  const task = await commerceDao.getTaskById(taskId);
  if (!task) throw new BusinessError(404, '任务不存在');
  if (![1].includes(task.status)) throw new BusinessError(400, '只能暂停处理中的任务');
  await commerceDao.updateTaskStatusDirect(taskId, { status: 5 });
}

export async function resumeTask(taskId) {
  const task = await commerceDao.getTaskById(taskId);
  if (!task) throw new BusinessError(404, '任务不存在');
  if (![5].includes(task.status)) throw new BusinessError(400, '只能恢复已暂停的任务');
  await commerceDao.updateTaskStatusDirect(taskId, { status: 1 });
}

export async function cancelTask(taskId) {
  const task = await commerceDao.getTaskById(taskId);
  if (!task) throw new BusinessError(404, '任务不存在');
  if (![0, 1, 5].includes(task.status)) throw new BusinessError(400, '只能取消待处理/处理中/已暂停的任务');
  await commerceDao.updateTaskStatusDirect(taskId, { status: 4, progress_msg: '已取消' });
}
