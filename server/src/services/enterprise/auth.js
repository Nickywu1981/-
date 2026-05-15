/**
 * Enterprise 认证模块 — 企业注册 + 登录
 * 提取自 enterpriseService.js
 */
import { withTransaction } from '../../dao/transaction.js';
import * as enterpriseDao from '../../dao/enterpriseDao.js';
import * as userDao from '../../dao/userDao.js';
import { generateAccessToken, generateRefreshToken } from '../../middleware/auth.js';
import { BusinessError } from '../../utils/businessError.js';
import { ERROR_CODE } from '../../constants/errorCode.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function registerEnterprise({ name, code, contactName, contactPhone, contactEmail, password, type = 'enterprise', logo = '', domain = '' }) {
  const existing = await enterpriseDao.findTenantByCode(code);
  if (existing) throw new BusinessError(ERROR_CODE.BAD_REQUEST);

  if (domain) {
    if (/[<>"'\s]/.test(domain) || /^javascript:/i.test(domain)) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    const domainTenant = await enterpriseDao.findTenantByDomain(domain);
    if (domainTenant) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { tenantId, userId } = await withTransaction(async (conn) => {
    const uid = await userDao.insertUser({ username: contactPhone, password: passwordHash, nickname: contactName, tenantId: 0 }, conn);
    const tid = await enterpriseDao.createTenant({ name, code, type, logo, domain, contactName, contactPhone, contactEmail, planType: 'free', maxUsers: 10, quotaImages: 500, quotaVideo: 50 }, conn);
    await enterpriseDao.addEnterpriseUser({ tenantId: tid, userId: uid, role: 'enterprise_admin' }, conn);
    return { tenantId: tid, userId: uid };
  }, { maxRetries: 2 });

  return { tenantId, userId };
}

export async function loginEnterprise({ account, password }) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
  const user = isEmail ? await userDao.findByEmail(account) : await userDao.findByPhone(account);
  if (!user) throw new BusinessError(ERROR_CODE.UNAUTHORIZED);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new BusinessError(ERROR_CODE.UNAUTHORIZED);

  const enterpriseUser = await enterpriseDao.findEnterpriseUserByUserId(user.id);
  if (!enterpriseUser) throw new BusinessError(ERROR_CODE.FORBIDDEN);

  const tenant = await enterpriseDao.findTenantById(enterpriseUser.tenant_id);
  if (!tenant || tenant.status !== 1) throw new BusinessError(ERROR_CODE.FORBIDDEN);

  const tokenUser = { userId: user.id, role: user.role, tenantId: tenant.id, audience: 'enterprise', entId: tenant.id, entRole: enterpriseUser.role };
  const accessToken = generateAccessToken(tokenUser);
  const refreshToken = generateRefreshToken(tokenUser);

  return {
    accessToken, refreshToken,
    user: { id: user.id, nickname: user.nickname, phone: user.phone, email: user.email, role: enterpriseUser.role },
    enterprise: { id: tenant.id, name: tenant.name, code: tenant.code, type: tenant.type, logo: tenant.logo, domain: tenant.domain, planType: tenant.plan_type, status: tenant.status },
  };
}
