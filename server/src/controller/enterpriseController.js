/**
 * Enterprise Controller — 企业/代理端控制器
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 */
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';
import { wrapController } from '../utils/wrapController.js';
import * as enterpriseService from '../services/enterpriseService.js';

/** 获取当前用户的 tenantId（企业端专用） */
function getTenantId(req) {
  return req.user?.entId || req.user?.tenantId;
}

// ==================== 企业入驻/登录 ====================

export const registerEnterprise = wrapController(async (req, res) => {
  const { name, code, contactName, contactPhone, contactEmail, password, type, logo, domain } = req.body;
  if (!name || !code || !contactName || !contactPhone || !password) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '企业名称/编码/联系人/手机/密码为必填项');
  }
  if (password.length < 8) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '密码至少8位');
  }
  const result = await enterpriseService.registerEnterprise({
    name, code, contactName, contactPhone, contactEmail, password: String(password), type, logo, domain,
  });
  return success(res, result, '企业入驻成功');
});

export const loginEnterprise = wrapController(async (req, res) => {
  const { account, password } = req.body;
  if (!account || !password) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '账号和密码为必填项');
  }
  const result = await enterpriseService.loginEnterprise({ account, password: String(password) });

  // 设置 cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return success(res, result, '登录成功');
});

// ==================== 企业信息 ====================

export const getProfile = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) throw new BusinessError(ERROR_CODE.FORBIDDEN, '无企业权限');
  const profile = await enterpriseService.getEnterpriseProfile(tenantId, req.user?.id);
  return success(res, profile);
});

export const updateProfile = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) throw new BusinessError(ERROR_CODE.FORBIDDEN, '无企业权限');
  const profile = await enterpriseService.updateEnterpriseProfile(tenantId, req.body);
  return success(res, profile, '更新成功');
});

// ==================== 子账号管理 ====================

export const listUsers = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize, 10) || 20), 100);
  const { status, keyword } = req.query;
  const result = await enterpriseService.listEnterpriseUsers(tenantId, {
    page, pageSize,
    status: status !== undefined ? parseInt(status, 10) : undefined,
    keyword,
  });
  return success(res, result);
});

export const addUser = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const { phone, email, nickname, password, role } = req.body;
  if (!phone && !email) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '手机号或邮箱为必填项');
  const id = await enterpriseService.addEnterpriseUser(tenantId, { phone, email, nickname, password, role });
  return success(res, { id }, '子账号创建成功');
});

export const updateUser = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '无效的子账号ID');
  const { role, status } = req.body;
  await enterpriseService.updateEnterpriseUser(tenantId, id, { role, status });
  return success(res, null, '更新成功');
});

export const removeUser = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '无效的子账号ID');
  await enterpriseService.removeEnterpriseUser(tenantId, id);
  return success(res, null, '移除成功');
});

// ==================== 仪表盘 ====================

export const getDashboard = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const dashboard = await enterpriseService.getEnterpriseDashboard(tenantId);
  return success(res, dashboard);
});

export const getUsage = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const { startDate, endDate, userId } = req.query;
  const usage = await enterpriseService.getEnterpriseUsageDetail(tenantId, { startDate, endDate, userId });
  return success(res, usage);
});

// ==================== 白标 ====================

export const getWhiteLabel = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const whiteLabel = await enterpriseService.getWhiteLabel(tenantId);
  return success(res, whiteLabel);
});

export const updateWhiteLabel = wrapController(async (req, res) => {
  const tenantId = getTenantId(req);
  const whiteLabel = await enterpriseService.updateWhiteLabel(tenantId, req.body);
  return success(res, whiteLabel, '白标配置已更新');
});

// ==================== 企业套餐 ====================

export const listPlans = wrapController(async (req, res) => {
  const plans = enterpriseService.listEnterprisePlans();
  return success(res, plans);
});
