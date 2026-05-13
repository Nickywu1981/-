/**
 * Enterprise Controller — 企业/代理端控制器
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 */
import { success } from '../utils/response.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';
import { cookieSecure } from '../utils/cookieHelper.js';
import { wrapController } from '../utils/wrapController.js';
import { revokeAllUserTokens } from '../utils/jwtToken.js';
import * as enterpriseService from '../services/enterpriseService.js';
import * as auditLogDao from '../dao/auditLogDao.js';

/** 写入审计日志（fire-and-forget） */
function audit(req, action, targetId, targetTitle) {
  auditLogDao.insert({
    userId: req.user?.userId || req.user?.id || 0,
    action,
    targetType: 'enterprise',
    targetId: targetId != null ? String(targetId) : null,
    targetTitle,
    ip: req.ip,
  }).catch(err => { logger.warn('[enterprise] audit log failed', err.message); });
}

// ==================== 企业入驻/登录 ====================

export const registerEnterprise = wrapController(async (req, res) => {
  const data = req.validated || req.body;
  const result = await enterpriseService.registerEnterprise(data);
  audit(req, 'enterprise.register', result.tenantId, `企业入驻: ${data.name}`);
  return success(res, result, '企业入驻成功');
});

export const loginEnterprise = wrapController(async (req, res) => {
  const { account, password } = req.validated || req.body;
  const result = await enterpriseService.loginEnterprise({ account, password: String(password) });

  // 设置 cookie
  res.cookie('token', result.accessToken, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  audit(req, 'enterprise.login', result.tenantId, '企业登录');
  return success(res, result, '登录成功');
});

export const logoutEnterprise = wrapController(async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  if (userId) {
    await revokeAllUserTokens(userId);
  }
  res.clearCookie('token', { httpOnly: true, secure: cookieSecure(req), sameSite: 'lax', path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: cookieSecure(req), sameSite: 'lax', path: '/' });
  return success(res, null, '已退出登录');
});

// ==================== 企业信息 ====================

export const getProfile = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw new BusinessError(ERROR_CODE.FORBIDDEN, '无企业权限');
  const profile = await enterpriseService.getEnterpriseProfile(tenantId, req.user?.id);
  return success(res, profile);
});

export const updateProfile = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw new BusinessError(ERROR_CODE.FORBIDDEN, '无企业权限');
  const profile = await enterpriseService.updateEnterpriseProfile(tenantId, req.validated || req.body);
  audit(req, 'enterprise.updateProfile', tenantId, '更新企业信息');
  return success(res, profile, '更新成功');
});

// ==================== 子账号管理 ====================

export const listUsers = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
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
  const tenantId = req.tenantId;
  const { phone, email, nickname, password, role } = req.validated || req.body;
  const id = await enterpriseService.addEnterpriseUser(tenantId, { phone, email, nickname, password, role });
  audit(req, 'enterprise.addUser', id, `添加子账号: ${phone}`);
  return success(res, { id }, '子账号创建成功');
});

export const updateUser = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '无效的子账号ID');
  const data = req.validated || req.body;
  await enterpriseService.updateEnterpriseUser(tenantId, id, data);
  audit(req, 'enterprise.updateUser', id, `更新子账号: ${id}`);
  return success(res, null, '更新成功');
});

export const removeUser = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '无效的子账号ID');
  await enterpriseService.removeEnterpriseUser(tenantId, id);
  audit(req, 'enterprise.removeUser', id, `移除子账号: ${id}`);
  return success(res, null, '移除成功');
});

// ==================== 仪表盘 ====================

export const getDashboard = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const dashboard = await enterpriseService.getEnterpriseDashboard(tenantId);
  return success(res, dashboard);
});

export const getUsage = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const { startDate, endDate, userId, page, pageSize } = req.validated || req.query;
  const usage = await enterpriseService.getEnterpriseUsageDetail(tenantId, {
    startDate, endDate, userId, page, pageSize,
  });
  return success(res, usage);
});

// ==================== 白标 ====================

export const getWhiteLabel = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const whiteLabel = await enterpriseService.getWhiteLabel(tenantId);
  return success(res, whiteLabel);
});

export const updateWhiteLabel = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const whiteLabel = await enterpriseService.updateWhiteLabel(tenantId, req.validated || req.body);
  audit(req, 'enterprise.updateWhiteLabel', tenantId, '更新白标配置');
  return success(res, whiteLabel, '白标配置已更新');
});

// ==================== 企业套餐 ====================

export const listPlans = wrapController(async (req, res) => {
  const plans = enterpriseService.listEnterprisePlans();
  return success(res, plans);
});

// ==================== 审批状态机 (Admin) ====================

export const listPending = wrapController(async (req, res) => {
  const result = await enterpriseService.listPendingTenants(req.validated || req.query);
  return success(res, result);
});

export const getApprovalStats = wrapController(async (req, res) => {
  const stats = await enterpriseService.getApprovalStats();
  return success(res, stats);
});

export const getApprovalLogs = wrapController(async (req, res) => {
  const tenantId = parseInt(req.params.id, 10);
  const result = await enterpriseService.getApprovalLogs(tenantId, req.query);
  return success(res, result);
});

export const approve = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await enterpriseService.approveTenant(id, {
    operatorId: req.user?.userId || req.user?.id,
  });
  audit(req, 'enterprise.approve', id, '通过企业入驻审批');
  return success(res, result, '审批已通过');
});

export const reject = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await enterpriseService.rejectTenant(id, {
    operatorId: req.user?.userId || req.user?.id,
    reason: req.validated?.reason || req.body.reason,
  });
  audit(req, 'enterprise.reject', id, `驳回企业: ${result.reason || ''}`);
  return success(res, result, '已驳回');
});

export const suspend = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await enterpriseService.suspendTenant(id, {
    operatorId: req.user?.userId || req.user?.id,
    reason: req.validated?.reason || req.body.reason,
  });
  audit(req, 'enterprise.suspend', id, '停用企业');
  return success(res, result, '企业已停用');
});

export const reinstate = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await enterpriseService.reinstateTenant(id, {
    operatorId: req.user?.userId || req.user?.id,
  });
  audit(req, 'enterprise.reinstate', id, '恢复企业');
  return success(res, result, '企业已恢复');
});
