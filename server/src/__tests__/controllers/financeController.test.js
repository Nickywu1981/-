import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({
  success: (_res, data, msg) => ({ code: 0, data, message: msg }),
  listResult: (_res, list, total, page, pageSize) => ({ code: 0, data: { list, total, page, pageSize } }),
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/financeService.js');
vi.mock('../../constants/errorCode.js', () => ({
  ERROR_CODE: Object.freeze({ BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404, INTERNAL_ERROR: 500 }),
}));

import * as financeService from '../../services/financeService.js';
import {
  listBankAccounts, addBankAccount, removeBankAccount,
  listLedger, listSettlements, getSettlementDetail,
  listEarnings, listWithdrawals, createWithdrawal, getWithdrawalDetail,
  getCommissionPolicy, updateCommissionPolicy, getFinanceDashboard,
} from '../../controller/financeController.js';

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, tenantId: 't1',
    user: { id: 1, userId: 1, tenantId: 't1', entRole: null },
    validated: null, ...overrides };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('financeController', () => {
  it('listBankAccounts returns list', async () => {
    financeService.listBankAccounts.mockResolvedValue([{ id: 1, bankName: '招商银行' }]);
    const r = await listBankAccounts(mockReq(), {});
    expect(r.code).toBe(0);
    expect(r.data).toHaveLength(1);
  });

  it('addBankAccount creates', async () => {
    financeService.addBankAccount.mockResolvedValue(42);
    const r = await addBankAccount(mockReq({ validated: { bankName: '招商', accountNo: '6222' } }), {});
    expect(r.data.id).toBe(42);
  });

  it('removeBankAccount invalid id throws', async () => {
    await expect(removeBankAccount(mockReq({ params: { id: 'abc' } }), {})).rejects.toThrow();
  });

  it('removeBankAccount success', async () => {
    financeService.removeBankAccount.mockResolvedValue();
    const r = await removeBankAccount(mockReq({ params: { id: '1' } }), {});
    expect(financeService.removeBankAccount).toHaveBeenCalledWith('t1', 1);
    expect(r.code).toBe(0);
  });

  it('listLedger default pagination', async () => {
    financeService.listLedger.mockResolvedValue({ rows: [], total: 0 });
    await listLedger(mockReq(), {});
    expect(financeService.listLedger).toHaveBeenCalledWith('t1',
      { page: 1, pageSize: 20, type: undefined, startDate: undefined, endDate: undefined });
  });

  it('listSettlements returns page', async () => {
    financeService.listSettlements.mockResolvedValue({ rows: [], total: 0 });
    const r = await listSettlements(mockReq(), {});
    expect(r.code).toBe(0);
  });

  it('getSettlementDetail invalid id throws', async () => {
    await expect(getSettlementDetail(mockReq({ params: { id: '0' } }), {})).rejects.toThrow();
  });

  it('getSettlementDetail returns detail', async () => {
    financeService.getSettlementDetail.mockResolvedValue({ id: 1, amount: '100.00' });
    const r = await getSettlementDetail(mockReq({ params: { id: '1' } }), {});
    expect(r.data.id).toBe(1);
  });

  it('listEarnings includes summary', async () => {
    financeService.listEarnings.mockResolvedValue({ rows: [], total: 0 });
    financeService.getEarningsSummary.mockResolvedValue({ totalCommission: '500.00' });
    const r = await listEarnings(mockReq(), {});
    expect(r.data.summary.totalCommission).toBe('500.00');
  });

  it('createWithdrawal submits', async () => {
    financeService.createWithdrawal.mockResolvedValue({ id: 99, status: 'pending' });
    const r = await createWithdrawal(mockReq({ validated: { amount: 1000, bankAccountId: 1 } }), {});
    expect(r.data.id).toBe(99);
  });

  it('getWithdrawalDetail invalid id throws', async () => {
    await expect(getWithdrawalDetail(mockReq({ params: { id: 'x' } }), {})).rejects.toThrow();
  });

  it('getCommissionPolicy returns policy', async () => {
    financeService.getCommissionPolicy.mockResolvedValue({ rate: 0.1 });
    const r = await getCommissionPolicy(mockReq(), {});
    expect(r.data.rate).toBe(0.1);
  });

  it('updateCommissionPolicy updates', async () => {
    financeService.updateCommissionPolicy.mockResolvedValue({ rate: 0.15 });
    const r = await updateCommissionPolicy(mockReq({ validated: { rate: 0.15 } }), {});
    expect(financeService.updateCommissionPolicy).toHaveBeenCalledWith('t1', { rate: 0.15 });
  });

  it('getFinanceDashboard enterprise type', async () => {
    financeService.getFinanceDashboard.mockResolvedValue({ revenue: 0 });
    await getFinanceDashboard(mockReq({ user: { id: 1, tenantId: 't1', entRole: null } }), {});
    expect(financeService.getFinanceDashboard).toHaveBeenCalledWith('t1', 'enterprise');
  });

  it('getFinanceDashboard agent type', async () => {
    financeService.getFinanceDashboard.mockResolvedValue({ revenue: 0 });
    await getFinanceDashboard(mockReq({ user: { id: 1, tenantId: 't1', entRole: 'agent' } }), {});
    expect(financeService.getFinanceDashboard).toHaveBeenCalledWith('t1', 'agent');
  });
});
