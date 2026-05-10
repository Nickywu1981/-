import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/creditDao.js');

import * as commerceService from '../../services/commerceService.js';
import * as creditDao from '../../dao/creditDao.js';

// commerceService uses pool from '../dao/db.js' with both execute() and query()
const mockExecute = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());
const mockBeginTransaction = vi.hoisted(() => vi.fn());
const mockCommit = vi.hoisted(() => vi.fn());
const mockRollback = vi.hoisted(() => vi.fn());
const mockRelease = vi.hoisted(() => vi.fn());
const mockGetConnection = vi.hoisted(() => vi.fn(() => ({
  execute: mockExecute,
  query: mockQuery,
  beginTransaction: mockBeginTransaction,
  commit: mockCommit,
  rollback: mockRollback,
  release: mockRelease,
})));
vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute, query: mockQuery, getConnection: mockGetConnection } }));

describe('commerceService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getPlans', () => {
    it('返回活跃套餐', async () => {
      creditDao.listActivePlans.mockResolvedValue([{ plan_type: 1 }, { plan_type: 2 }]);
      expect(await commerceService.getPlans()).toHaveLength(2);
    });
  });

  describe('purchasePlan', () => {
    it('套餐不存在抛出 400', async () => {
      creditDao.getPlanByType.mockResolvedValue(null);
      await expect(commerceService.purchasePlan(1, 1)).rejects.toThrow('套餐不存在或已下架');
    });

    it('新开通返回购买结果', async () => {
      creditDao.getPlanByType.mockResolvedValue({ plan_type: 1, name: '月卡', price: 29, credits: 300, status: 1 });
      creditDao.getMembership.mockResolvedValue({ plan_type: 0, credit_balance: 0 });
      creditDao.insertConsumptionLog.mockResolvedValue(undefined);
      mockExecute.mockResolvedValue([]);
      const r = await commerceService.purchasePlan(1, 1);
      expect(r.planType).toBe(1);
      expect(r.planName).toBe('月卡');
      expect(r.creditsAdded).toBe(300);
    });
  });

  describe('getBillingHistory', () => {
    it('返回分页账单', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1, action: 'cutout' }]]);
      mockQuery.mockResolvedValueOnce([[{ total: 1 }]]);
      const r = await commerceService.getBillingHistory(1, { page: 1, pageSize: 20 });
      expect(r.list).toHaveLength(1);
      expect(r.total).toBe(1);
    });
  });

  describe('getDashboardStats', () => {
    it('聚合统计数据', async () => {
      mockExecute.mockResolvedValueOnce([[{ userCount: 100 }]]);
      mockExecute.mockResolvedValueOnce([[{ taskCount: 500 }]]);
      mockExecute.mockResolvedValueOnce([[{ todayTaskCount: 20 }]]);
      mockExecute.mockResolvedValueOnce([[{ paidUserCount: 15 }]]);
      mockExecute.mockResolvedValueOnce([[{ totalRevenue: -2990 }]]);
      mockExecute.mockResolvedValueOnce([[]]);
      mockExecute.mockResolvedValueOnce([[]]);
      mockExecute.mockResolvedValueOnce([[]]);
      const r = await commerceService.getDashboardStats();
      expect(r.userCount).toBe(100);
      expect(r.totalRevenue).toBe(2990);
    });
  });

  describe('listAllUsers', () => {
    it('不带关键词搜索', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
      mockExecute.mockResolvedValueOnce([[{ total: 1 }]]);
      const r = await commerceService.listAllUsers({ page: 1, pageSize: 20, keyword: '' });
      expect(r.list).toHaveLength(1);
    });
  });

  describe('updateUserStatus', () => {
    it('更新用户状态', async () => {
      mockExecute.mockResolvedValue([]);
      await expect(commerceService.updateUserStatus(1, 1)).resolves.toBeUndefined();
    });
  });

  describe('containsBannedKeywords', () => {
    it('干净文本返回 false', () => {
      const r = commerceService.containsBannedKeywords('正常商品描述');
      expect(r.hasBanned).toBe(false);
    });

    it('违规文本返回关键词列表', () => {
      const r = commerceService.containsBannedKeywords('这里有毒品和枪支');
      expect(r.hasBanned).toBe(true);
      expect(r.foundKeywords).toContain('毒品');
      expect(r.foundKeywords).toContain('枪支');
    });
  });
});
