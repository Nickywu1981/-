/**
 * Finance Controller — 财务控制器
 *
 * Phase 2: 财务核心 (2026-05-11)
 */
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';
import { wrapController } from '../utils/wrapController.js';
import * as financeService from '../services/financeService.js';

// ==================== 收款账户 ====================

export const listBankAccounts = wrapController(async (req, res) => {
  const accounts = await financeService.listBankAccounts(req.tenantId);
  return success(res, accounts);
});

export const addBankAccount = wrapController(async (req, res) => {
  const id = await financeService.addBankAccount(req.tenantId, req.validated);
  return success(res, { id }, '收款账户已绑定');
});

export const removeBankAccount = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  await financeService.removeBankAccount(req.tenantId, id);
  return success(res, null, '收款账户已解绑');
});

// ==================== 账户流水 ====================

export const listLedger = wrapController(async (req, res) => {
  const { page, pageSize, type, startDate, endDate } = req.query;
  const result = await financeService.listLedger(req.tenantId, {
    page: parseInt(page, 10) || 1,
    pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
    type,
    startDate,
    endDate,
  });
  return success(res, result);
});

// ==================== 结算记录 ====================

export const listSettlements = wrapController(async (req, res) => {
  const { page, pageSize } = req.query;
  const result = await financeService.listSettlements(req.tenantId, {
    page: parseInt(page, 10) || 1,
    pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
  });
  return success(res, result);
});

export const getSettlementDetail = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  const detail = await financeService.getSettlementDetail(id);
  return success(res, detail);
});

// ==================== 佣金收益（仅代理） ====================

export const listEarnings = wrapController(async (req, res) => {
  const { page, pageSize, status, startDate, endDate } = req.query;
  const result = await financeService.listEarnings(req.tenantId, {
    page: parseInt(page, 10) || 1,
    pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
    status,
    startDate,
    endDate,
  });
  const summary = await financeService.getEarningsSummary(req.tenantId);
  return success(res, { ...result, summary });
});

// ==================== 提现（仅代理） ====================

export const listWithdrawals = wrapController(async (req, res) => {
  const { page, pageSize, status } = req.query;
  const result = await financeService.listWithdrawals(req.tenantId, {
    page: parseInt(page, 10) || 1,
    pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
    status,
  });
  return success(res, result);
});

export const createWithdrawal = wrapController(async (req, res) => {
  const { amount, bankAccountId } = req.validated;
  const result = await financeService.createWithdrawal(
    req.tenantId,
    req.user?.id || req.user?.userId,
    { amount, bankAccountId },
  );
  return success(res, result, '提现申请已提交，等待审核');
});

export const getWithdrawalDetail = wrapController(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  const detail = await financeService.getWithdrawalDetail(id);
  return success(res, detail);
});

// ==================== 分润政策（仅代理） ====================

export const getCommissionPolicy = wrapController(async (req, res) => {
  const policy = await financeService.getCommissionPolicy(req.tenantId);
  return success(res, policy);
});

export const updateCommissionPolicy = wrapController(async (req, res) => {
  const data = req.validated;
  const policy = await financeService.updateCommissionPolicy(req.tenantId, data);
  return success(res, policy, '分润政策已更新');
});

// ==================== 财务仪表盘 ====================

export const getFinanceDashboard = wrapController(async (req, res) => {
  const dashboard = await financeService.getFinanceDashboard(req.tenantId, getTenantType(req));
  return success(res, dashboard);
});

function getTenantType(req) {
  return req.user?.entRole ? 'agent' : 'enterprise';
}
