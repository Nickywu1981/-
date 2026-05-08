import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/creditDao.js');
vi.mock('../../services/memberBenefit.js', () => ({
  getBatchLimit: vi.fn().mockResolvedValue(50),
  getSaveDays: vi.fn().mockResolvedValue(30),
  hasFeature: vi.fn().mockResolvedValue(true),
}));

const mockExecute = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());
vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute, query: mockQuery } }));

import * as creditService from '../../services/creditService.js';
import * as creditDao from '../../dao/creditDao.js';

describe('creditService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('initFreeMembership', () => {
    it('使用套餐默认配额', async () => {
      creditDao.getPlanByType.mockResolvedValue({ credits: 50, daily_credits: 5 });
      mockExecute.mockResolvedValue([{ insertId: 1 }]);
      const r = await creditService.initFreeMembership(1);
      expect(r.trialQuota).toBe(50);
      expect(r.dailyCredits).toBe(5);
    });

    it('无套餐时默认 50 配额', async () => {
      creditDao.getPlanByType.mockResolvedValue(null);
      mockExecute.mockResolvedValue([{ insertId: 1 }]);
      const r = await creditService.initFreeMembership(1);
      expect(r.trialQuota).toBe(50);
    });
  });

  describe('consumeCredit', () => {
    it('会员信息不存在抛出 403', async () => {
      creditDao.getMembership.mockResolvedValue(null);
      await expect(creditService.consumeCredit(1, 'cutout')).rejects.toThrow('会员信息不存在');
    });

    it('点数不足抛出错误', async () => {
      creditDao.getMembership.mockResolvedValue({ credit_balance: 0, trial_used: 0, trial_quota: 10 });
      await expect(creditService.consumeCredit(1, 'cutout')).rejects.toThrow('点数不足');
    });

    it('成功扣减点数并记录日志', async () => {
      creditDao.getMembership.mockResolvedValue({ credit_balance: 10, trial_used: 5, trial_quota: 10 });
      creditDao.updateCreditBalance.mockResolvedValue(true);
      creditDao.insertConsumptionLog.mockResolvedValue(undefined);
      const r = await creditService.consumeCredit(1, 'cutout');
      expect(r.success).toBe(true);
      expect(r.creditBefore).toBe(10);
      expect(creditDao.updateCreditBalance).toHaveBeenCalledWith(1, -1);
    });

    it('批量计算折扣', async () => {
      creditDao.getMembership.mockResolvedValue({ credit_balance: 50, trial_used: 5, trial_quota: 10 });
      creditDao.updateCreditBalance.mockResolvedValue(true);
      creditDao.insertConsumptionLog.mockResolvedValue(undefined);
      const r = await creditService.consumeCredit(1, 'cutout', 10);
      expect(r.consumed).toBe(8);
    });
  });

  describe('getUserMembership', () => {
    it('附加套餐信息', async () => {
      creditDao.getMembership.mockResolvedValue({ plan_type: 1, credit_balance: 100 });
      creditDao.getPlanByType.mockResolvedValue({ name: '月卡', price: 29 });
      const r = await creditService.getUserMembership(1);
      expect(r.plan.name).toBe('月卡');
    });

    it('会员不存在返回 null', async () => {
      creditDao.getMembership.mockResolvedValue(null);
      expect(await creditService.getUserMembership(99)).toBeNull();
    });
  });

  describe('getAvailablePlans', () => {
    it('委托 DAO 返回套餐列表', async () => {
      creditDao.listActivePlans.mockResolvedValue([{ plan_type: 1 }, { plan_type: 2 }]);
      expect(await creditService.getAvailablePlans()).toHaveLength(2);
    });
  });
});
