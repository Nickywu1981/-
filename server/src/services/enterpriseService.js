/**
 * Enterprise Service — 企业/代理端业务逻辑
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 *
 * 子模块:
 *   enterprise/auth.js — 企业注册 + 登录
 */
import { withTransaction } from '../dao/transaction.js';
import * as enterpriseDao from '../dao/enterpriseDao.js';
import * as userDao from '../dao/userDao.js';
import { BusinessError } from '../utils/businessError.js';
import { commerceConfig } from '../config/index.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import bcrypt from 'bcryptjs';
import { registerEnterprise, loginEnterprise } from './enterprise/auth.js';

export { registerEnterprise, loginEnterprise };

const SALT_ROUNDS = 12;

// ═══════ 企业信息管理 ═══════

export async function getEnterpriseProfile(tenantId, userId) {
  const tenant = await enterpriseDao.findTenantById(tenantId);
  if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);

  const userCount = await enterpriseDao.countEnterpriseUsers(tenantId);
  let whiteLabel = {};
  if (tenant.white_label) {
    try { whiteLabel = typeof tenant.white_label === 'string' ? JSON.parse(tenant.white_label) : tenant.white_label; } catch { /* keep empty */ }
  }

  return {
    id: tenant.id, name: tenant.name, code: tenant.code, type: tenant.type, logo: tenant.logo,
    domain: tenant.domain, planType: tenant.plan_type, status: tenant.status,
    contactName: tenant.contact_name, contactPhone: tenant.contact_phone, contactEmail: tenant.contact_email,
    maxUsers: tenant.max_users, quotaImages: tenant.quota_images, quotaVideo: tenant.quota_video,
    balance: tenant.balance, commissionRate: tenant.commission_rate, expireTime: tenant.expire_time,
    userCount, whiteLabel,
  };
}

export async function updateEnterpriseProfile(tenantId, data) {
  const allowed = ['name', 'logo', 'domain', 'contactName', 'contactEmail', 'whiteLabel'];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = data[key];
  }
  if (Object.keys(updateData).length === 0) return null;
  await enterpriseDao.updateTenant(tenantId, updateData);
  return getEnterpriseProfile(tenantId);
}

// ═══════ 子账号管理 ═══════

export async function listEnterpriseUsers(tenantId, query) { return enterpriseDao.listEnterpriseUsers(tenantId, query); }

export async function addEnterpriseUser(tenantId, { phone, email, nickname, password, role = 'enterprise_operator' }) {
  const count = await enterpriseDao.countEnterpriseUsers(tenantId);
  const tenant = await enterpriseDao.findTenantById(tenantId);
  if (tenant && count >= tenant.max_users) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Enterprise sub-account limit reached (${tenant.max_users})`);

  let user;
  if (phone) user = await userDao.findByPhone(phone);
  if (!user && email) user = await userDao.findByEmail(email);

  if (!user) {
    if (!password) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const username = phone || email;
    const userId = await userDao.insertUser({ username, password: passwordHash, nickname: nickname || phone || email, tenantId });
    user = { id: userId };
  }

  const existing = await enterpriseDao.findEnterpriseUser(tenantId, user.id);
  if (existing) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  return enterpriseDao.addEnterpriseUser({ tenantId, userId: user.id, role });
}

export async function updateEnterpriseUser(tenantId, id, data) {
  const eu = await enterpriseDao.findEnterpriseUser(tenantId, id);
  if (!eu) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  return enterpriseDao.updateEnterpriseUser(id, tenantId, data);
}

export async function removeEnterpriseUser(tenantId, id) {
  const eu = await enterpriseDao.findEnterpriseUser(tenantId, id);
  if (!eu) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  return enterpriseDao.removeEnterpriseUser(id, tenantId);
}

// ═══════ 仪表盘 ═══════

export async function getEnterpriseDashboard(tenantId) {
  const [tenant, userCount] = await Promise.all([enterpriseDao.findTenantById(tenantId), enterpriseDao.countEnterpriseUsers(tenantId)]);
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - commerceConfig.dashboardLookbackDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const usage = await enterpriseDao.getEnterpriseUsage(tenantId, { startDate, endDate });
  const totalCalls = usage.reduce((sum, r) => sum + r.call_count, 0);
  const totalCredits = usage.reduce((sum, r) => sum + (r.total_credits || 0), 0);

  return {
    enterprise: { name: tenant.name, type: tenant.type, planType: tenant.plan_type, balance: tenant.balance },
    stats: { userCount, totalCalls30d: totalCalls, totalCredits30d: totalCredits, quotaImages: tenant.quota_images, quotaVideo: tenant.quota_video },
    usage,
  };
}

export async function getEnterpriseUsageDetail(tenantId, query) {
  const { startDate, endDate, userId } = query || {};
  if (!userId) {
    const [usage, byUser] = await Promise.all([enterpriseDao.getEnterpriseUsage(tenantId, { startDate, endDate, userId }), enterpriseDao.getEnterpriseUsageByUser(tenantId, { startDate, endDate })]);
    return { timeline: usage, byUser };
  }
  const usage = await enterpriseDao.getEnterpriseUsage(tenantId, { startDate, endDate, userId });
  return { timeline: usage };
}

// ═══════ 白标 ═══════

export async function getWhiteLabel(tenantId) {
  const tenant = await enterpriseDao.findTenantById(tenantId);
  if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  if (!tenant.white_label) return {};
  try { return typeof tenant.white_label === 'string' ? JSON.parse(tenant.white_label) : tenant.white_label; } catch { return {}; }
}

export async function updateWhiteLabel(tenantId, data) {
  const allowed = ['logo', 'primaryColor', 'domain', 'siteName'];
  const whiteLabel = {};
  for (const key of allowed) { if (data[key] !== undefined) whiteLabel[key] = data[key]; }
  if (whiteLabel.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(whiteLabel.primaryColor)) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  if (whiteLabel.domain && (/[<>"'\s]/.test(whiteLabel.domain) || /^javascript:/i.test(whiteLabel.domain))) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  await enterpriseDao.updateTenant(tenantId, { white_label: whiteLabel });
  return whiteLabel;
}

// ═══════ 企业套餐 ═══════

const ENTERPRISE_PLANS = [
  { id: 'ent_starter', name: '企业入门版', price: 999, credits: 5000, maxUsers: 10, quotaImages: 2000, quotaVideo: 200 },
  { id: 'ent_pro', name: '企业专业版', price: 2999, credits: 20000, maxUsers: 50, quotaImages: 10000, quotaVideo: 1000 },
  { id: 'ent_ultimate', name: '企业旗舰版', price: 9999, credits: 100000, maxUsers: 200, quotaImages: 50000, quotaVideo: 5000 },
];

export function listEnterprisePlans() { return ENTERPRISE_PLANS; }

// ═══════ 审批状态机 ═══════

const VALID_TRANSITIONS = { pending: ['under_review', 'approved', 'rejected'], under_review: ['approved', 'rejected'], approved: ['suspended'], rejected: ['pending'], suspended: ['approved', 'rejected'] };

export function getValidTransitions(currentStatus) { return VALID_TRANSITIONS[currentStatus] || []; }
export async function listPendingTenants(query) { return enterpriseDao.listTenantsByReviewStatus('pending', query); }
export async function getApprovalStats() { return enterpriseDao.getApprovalStats(); }
export async function getApprovalLogs(tenantId, query) { return enterpriseDao.getApprovalLogs(tenantId, query); }

export async function submitForReview(code) {
  const tenant = await enterpriseDao.findTenantByCode(code);
  if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  if (tenant.review_status !== 'pending') throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  await enterpriseDao.updateTenantReviewStatus(tenant.id, { status: 'under_review' });
  await enterpriseDao.insertApprovalLog({ tenantId: tenant.id, action: 'submit', operatorId: 0, oldStatus: 'pending', newStatus: 'under_review' });
  return { id: tenant.id, status: 'under_review' };
}

export async function approveTenant(id, { operatorId }) {
  return withTransaction(async (conn) => {
    const tenant = await enterpriseDao.findTenantById(id, conn, true);
    if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (!getValidTransitions(tenant.review_status).includes('approved')) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Status ${tenant.review_status} cannot be approved`);
    await enterpriseDao.updateTenantReviewStatus(id, { status: 'approved', approvedBy: operatorId }, conn);
    await enterpriseDao.insertApprovalLog({ tenantId: id, action: 'approve', operatorId, oldStatus: tenant.review_status, newStatus: 'approved' }, conn);
    return { id, status: 'approved' };
  });
}

export async function rejectTenant(id, { operatorId, reason }) {
  return withTransaction(async (conn) => {
    const tenant = await enterpriseDao.findTenantById(id, conn, true);
    if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (!getValidTransitions(tenant.review_status).includes('rejected')) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Status ${tenant.review_status} cannot be rejected`);
    if (!reason || reason.trim().length < 4) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    await enterpriseDao.updateTenantReviewStatus(id, { status: 'rejected', approvedBy: operatorId, reason: reason.trim() }, conn);
    await enterpriseDao.insertApprovalLog({ tenantId: id, action: 'reject', operatorId, oldStatus: tenant.review_status, newStatus: 'rejected', reason: reason.trim() }, conn);
    return { id, status: 'rejected' };
  });
}

export async function suspendTenant(id, { operatorId, reason }) {
  return withTransaction(async (conn) => {
    const tenant = await enterpriseDao.findTenantById(id, conn, true);
    if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (tenant.review_status !== 'approved') throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    await enterpriseDao.updateTenantReviewStatus(id, { status: 'suspended' }, conn);
    await enterpriseDao.insertApprovalLog({ tenantId: id, action: 'suspend', operatorId, oldStatus: 'approved', newStatus: 'suspended', reason }, conn);
    return { id, status: 'suspended' };
  });
}

export async function reinstateTenant(id, { operatorId }) {
  return withTransaction(async (conn) => {
    const tenant = await enterpriseDao.findTenantById(id, conn, true);
    if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (tenant.review_status !== 'suspended') throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    await enterpriseDao.updateTenantReviewStatus(id, { status: 'approved' }, conn);
    await enterpriseDao.insertApprovalLog({ tenantId: id, action: 'reinstate', operatorId, oldStatus: 'suspended', newStatus: 'approved' }, conn);
    return { id, status: 'approved' };
  });
}
