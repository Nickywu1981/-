/**
 * Enterprise Service — 企业/代理端业务逻辑
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 */
import * as enterpriseDao from '../dao/enterpriseDao.js';
import * as userDao from '../dao/userDao.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// ==================== 企业入驻/登录 ====================

/**
 * 企业注册入驻
 */
export async function registerEnterprise({
  name, code, contactName, contactPhone, contactEmail, password,
  type = 'enterprise', logo = '', domain = '',
}) {
  // 校验 code 唯一性
  const existing = await enterpriseDao.findTenantByCode(code);
  if (existing) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '企业编码已被使用');
  }

  // 校验域名唯一性
  if (domain) {
    const domainTenant = await enterpriseDao.findTenantByDomain(domain);
    if (domainTenant) {
      throw new BusinessError(ERROR_CODE.BAD_REQUEST, '域名已被使用');
    }
  }

  // 1. 创建管理员用户账号
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await userDao.insertUser({
    username: contactPhone,
    password: passwordHash,
    nickname: contactName,
    tenantId: 0,
  });

  // 2. 创建企业 tenant
  const tenantId = await enterpriseDao.createTenant({
    name,
    code,
    type,
    logo,
    domain,
    contactName,
    contactPhone,
    contactEmail,
    planType: 'free',
    maxUsers: 10,
    quotaImages: 500,
    quotaVideo: 50,
  });

  // 3. 将管理员加入企业子账号表
  await enterpriseDao.addEnterpriseUser({
    tenantId,
    userId,
    role: 'enterprise_admin',
  });

  return { tenantId, userId };
}

/**
 * 企业端登录
 */
export async function loginEnterprise({ account, password }) {
  // account: 手机号或邮箱 — 按格式判断
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
  const user = isEmail
    ? await userDao.findByEmail(account)
    : await userDao.findByPhone(account);
  if (!user) {
    throw new BusinessError(ERROR_CODE.UNAUTHORIZED, '账号不存在');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new BusinessError(ERROR_CODE.UNAUTHORIZED, '密码错误');
  }

  // 查找用户所属企业（不限 tenant_id）
  const enterpriseUser = await enterpriseDao.findEnterpriseUserByUserId(user.id);
  if (!enterpriseUser) {
    throw new BusinessError(ERROR_CODE.FORBIDDEN, '该账号未关联任何企业');
  }

  const tenant = await enterpriseDao.findTenantById(enterpriseUser.tenant_id);
  if (!tenant || tenant.status !== 1) {
    throw new BusinessError(ERROR_CODE.FORBIDDEN, '企业已被禁用或不存在');
  }

  // 签发 JWT（含企业端标识）
  const tokenUser = {
    userId: user.id,
    role: user.role,
    tenantId: tenant.id,
    audience: 'enterprise',
    entId: tenant.id,
    entRole: enterpriseUser.role,
  };

  const accessToken = generateAccessToken(tokenUser);
  const refreshToken = generateRefreshToken(tokenUser);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
      email: user.email,
      role: enterpriseUser.role,
    },
    enterprise: {
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      type: tenant.type,
      logo: tenant.logo,
      domain: tenant.domain,
      planType: tenant.plan_type,
      status: tenant.status,
    },
  };
}

// ==================== 企业信息管理 ====================

export async function getEnterpriseProfile(tenantId, userId) {
  const tenant = await enterpriseDao.findTenantById(tenantId);
  if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND, '企业不存在');

  const userCount = await enterpriseDao.countEnterpriseUsers(tenantId);
  let whiteLabel = {};
  if (tenant.white_label) {
    try { whiteLabel = typeof tenant.white_label === 'string' ? JSON.parse(tenant.white_label) : tenant.white_label; } catch { /* keep empty */ }
  }

  return {
    id: tenant.id,
    name: tenant.name,
    code: tenant.code,
    type: tenant.type,
    logo: tenant.logo,
    domain: tenant.domain,
    planType: tenant.plan_type,
    status: tenant.status,
    contactName: tenant.contact_name,
    contactPhone: tenant.contact_phone,
    contactEmail: tenant.contact_email,
    maxUsers: tenant.max_users,
    quotaImages: tenant.quota_images,
    quotaVideo: tenant.quota_video,
    balance: tenant.balance,
    commissionRate: tenant.commission_rate,
    expireTime: tenant.expire_time,
    userCount,
    whiteLabel,
  };
}

export async function updateEnterpriseProfile(tenantId, data) {
  const allowed = ['name', 'logo', 'domain', 'contactName', 'contactEmail', 'whiteLabel'];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData[dbKey] = data[key];
    }
  }
  if (Object.keys(updateData).length === 0) return null;
  await enterpriseDao.updateTenant(tenantId, updateData);
  return getEnterpriseProfile(tenantId);
}

// ==================== 子账号管理 ====================

export async function listEnterpriseUsers(tenantId, query) {
  return enterpriseDao.listEnterpriseUsers(tenantId, query);
}

export async function addEnterpriseUser(tenantId, { phone, email, nickname, password, role = 'enterprise_operator' }) {
  // 检查用户数上限
  const count = await enterpriseDao.countEnterpriseUsers(tenantId);
  const tenant = await enterpriseDao.findTenantById(tenantId);
  if (tenant && count >= tenant.max_users) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, `已达到企业子账号上限 (${tenant.max_users}人)`);
  }

  // 查找或创建用户
  let user;
  if (phone) user = await userDao.findByPhone(phone);
  if (!user && email) user = await userDao.findByEmail(email);

  if (!user) {
    if (!password) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '新建账号需要提供密码');
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const username = phone || email;
    const userId = await userDao.insertUser({
      username,
      password: passwordHash,
      nickname: nickname || phone || email,
      tenantId,
    });
    user = { id: userId };
  }

  // 检查是否已加入该企业
  const existing = await enterpriseDao.findEnterpriseUser(tenantId, user.id);
  if (existing) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '该用户已是企业成员');

  return enterpriseDao.addEnterpriseUser({ tenantId, userId: user.id, role });
}

export async function updateEnterpriseUser(tenantId, id, data) {
  // 跨租户防护：验证该用户属于当前租户
  const eu = await enterpriseDao.findEnterpriseUser(tenantId, id);
  if (!eu) throw new BusinessError(ERROR_CODE.NOT_FOUND, '子账号不存在');
  return enterpriseDao.updateEnterpriseUser(id, data);
}

export async function removeEnterpriseUser(tenantId, id) {
  // 跨租户防护：验证该用户属于当前租户
  const eu = await enterpriseDao.findEnterpriseUser(tenantId, id);
  if (!eu) throw new BusinessError(ERROR_CODE.NOT_FOUND, '子账号不存在');
  return enterpriseDao.removeEnterpriseUser(id);
}

// ==================== 仪表盘 ====================

export async function getEnterpriseDashboard(tenantId) {
  const tenant = await enterpriseDao.findTenantById(tenantId);
  const userCount = await enterpriseDao.countEnterpriseUsers(tenantId);

  // 获取最近 30 天用量
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const usage = await enterpriseDao.getEnterpriseUsage(tenantId, { startDate, endDate });
  const totalCalls = usage.reduce((sum, r) => sum + r.call_count, 0);
  const totalCredits = usage.reduce((sum, r) => sum + (r.total_credits || 0), 0);

  return {
    enterprise: {
      name: tenant.name,
      type: tenant.type,
      planType: tenant.plan_type,
      balance: tenant.balance,
    },
    stats: {
      userCount,
      totalCalls30d: totalCalls,
      totalCredits30d: totalCredits,
      quotaImages: tenant.quota_images,
      quotaVideo: tenant.quota_video,
    },
    usage,
  };
}

export async function getEnterpriseUsageDetail(tenantId, query) {
  const { startDate, endDate, userId } = query || {};
  const usage = await enterpriseDao.getEnterpriseUsage(tenantId, { startDate, endDate, userId });

  if (!userId) {
    const byUser = await enterpriseDao.getEnterpriseUsageByUser(tenantId, { startDate, endDate });
    return { timeline: usage, byUser };
  }
  return { timeline: usage };
}

// ==================== 白标 ====================

export async function getWhiteLabel(tenantId) {
  const tenant = await enterpriseDao.findTenantById(tenantId);
  if (!tenant) throw new BusinessError(ERROR_CODE.NOT_FOUND, '企业不存在');
  if (!tenant.white_label) return {};
  try {
    return typeof tenant.white_label === 'string' ? JSON.parse(tenant.white_label) : tenant.white_label;
  } catch {
    return {};
  }
}

export async function updateWhiteLabel(tenantId, data) {
  const allowed = ['logo', 'primaryColor', 'domain', 'siteName'];
  const whiteLabel = {};
  for (const key of allowed) {
    if (data[key] !== undefined) whiteLabel[key] = data[key];
  }
  // 验证主色格式
  if (whiteLabel.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(whiteLabel.primaryColor)) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '主色格式无效，需要 #RRGGBB');
  }
  // 验证域名格式（防 XSS）
  if (whiteLabel.domain) {
    if (/[<>"'\s]/.test(whiteLabel.domain) || /^javascript:/i.test(whiteLabel.domain)) {
      throw new BusinessError(ERROR_CODE.BAD_REQUEST, '域名格式无效');
    }
  }
  await enterpriseDao.updateTenant(tenantId, { white_label: whiteLabel });
  return whiteLabel;
}

// ==================== 企业套餐 ====================

const ENTERPRISE_PLANS = [
  { id: 'ent_starter', name: '企业入门版', price: 999, credits: 5000, maxUsers: 10, quotaImages: 2000, quotaVideo: 200, description: '适合小型团队起步' },
  { id: 'ent_pro', name: '企业专业版', price: 2999, credits: 20000, maxUsers: 50, quotaImages: 10000, quotaVideo: 1000, description: '适合中型企业日常运营' },
  { id: 'ent_ultimate', name: '企业旗舰版', price: 9999, credits: 100000, maxUsers: 200, quotaImages: 50000, quotaVideo: 5000, description: '适合大型企业/代理商' },
];

export function listEnterprisePlans() {
  return ENTERPRISE_PLANS;
}
