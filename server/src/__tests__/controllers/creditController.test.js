import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn(), getPool: vi.fn() } }));
vi.mock('../../services/creditService.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../config/index.js', () => ({
  jwtSecret: 'test-secret', jwtExpiresIn: '7d',
  isDevelopment: true, isProduction: false,
  logConfig: { level: 'info', sampleRate: 1.0, slowQueryMs: 1000 },
}));
vi.mock('../../utils/sqlGuard.js', () => ({ guardSQL: vi.fn((v) => v) }));

import * as creditService from '../../services/creditService.js';
import {
  getMembership, freezeCredit, confirmCredit, rollbackCredit,
  listRecords, listAllRecords, adminRefund,
  checkIn, checkInStatus, shareReward, creditHistory, creditBalance,
} from '../../controller/creditController.js';

function mockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 1, username: 'u1', role: 'user' },
    path: '/api/test',
    method: 'POST',
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { this._jsonBody = body; return this; });
  res.status = vi.fn(function (code) { this.statusCode = code; return this; });
  res.setHeader = vi.fn();
  return res;
}

describe('creditController', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── getMembership ───
  describe('getMembership', () => {
    it('会员信息不存在抛 NOT_FOUND', async () => {
      creditService.getUserMembership.mockResolvedValue(null);
      const req = mockReq();
      const res = mockRes();
      await getMembership(req, res);
      expect(res._jsonBody.code).toBe(404);
    });

    it('返回会员信息', async () => {
      creditService.getUserMembership.mockResolvedValue({ planType: 2, creditsRemain: 500 });
      const req = mockReq();
      const res = mockRes();
      await getMembership(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.planType).toBe(2);
    });
  });

  // ─── freezeCredit ───
  describe('freezeCredit', () => {
    it('缺少 requestId 抛 BAD_REQUEST', async () => {
      const req = mockReq({ body: { action: 'remove_bg' } });
      const res = mockRes();
      await freezeCredit(req, res);
      expect(res._jsonBody.code).toBe(400);
    });

    it('冻结积分成功', async () => {
      creditService.freezeCredit.mockResolvedValue({ freezeId: 'fz1', frozen: 5 });
      const req = mockReq({ body: { requestId: 'req1', action: 'remove_bg', batchCount: 1 } });
      const res = mockRes();
      await freezeCredit(req, res);
      expect(creditService.freezeCredit).toHaveBeenCalledWith(1, 'req1', 'remove_bg', 1, false);
      expect(res._jsonBody.code).toBe(200);
    });

    it('夜间批量默认 batchCount=1', async () => {
      creditService.freezeCredit.mockResolvedValue({ freezeId: 'fz2', frozen: 5 });
      const req = mockReq({ body: { requestId: 'req2', action: 'generate', isNight: true } });
      const res = mockRes();
      await freezeCredit(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── confirmCredit ───
  describe('confirmCredit', () => {
    it('缺少 requestId 抛错误', async () => {
      const req = mockReq();
      const res = mockRes();
      await confirmCredit(req, res);
      expect(res._jsonBody.code).toBe(400);
    });

    it('确认扣费成功', async () => {
      creditService.confirmCharge.mockResolvedValue({ consumed: 5, remain: 95 });
      const req = mockReq({ body: { requestId: 'req1' } });
      const res = mockRes();
      await confirmCredit(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.consumed).toBe(5);
    });
  });

  // ─── rollbackCredit ───
  describe('rollbackCredit', () => {
    it('通过 recordId 回滚', async () => {
      creditService.rollbackCharge.mockResolvedValue({ rolledBack: 5 });
      const req = mockReq({ body: { recordId: 'rec1', remark: '误扣回滚' } });
      const res = mockRes();
      await rollbackCredit(req, res);
      expect(creditService.rollbackCharge).toHaveBeenCalledWith('rec1', '误扣回滚');
      expect(res._jsonBody.code).toBe(200);
    });

    it('同时为空抛错误', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      await rollbackCredit(req, res);
      expect(res._jsonBody.code).toBe(400);
    });
  });

  // ─── listRecords ───
  describe('listRecords', () => {
    it('返回用户消费记录', async () => {
      creditService.listConsumptionRecords.mockResolvedValue({ list: [{ id: 1, action: 'remove_bg' }], total: 1 });
      const req = mockReq({ query: { page: '1', pageSize: '10' } });
      const res = mockRes();
      await listRecords(req, res);
      expect(res._jsonBody.code).toBe(200);
    });

    it('按类型过滤', async () => {
      creditService.listConsumptionRecords.mockResolvedValue({ list: [], total: 0 });
      const req = mockReq({ query: { type: '1', page: '1', pageSize: '10' } });
      const res = mockRes();
      await listRecords(req, res);
      expect(creditService.listConsumptionRecords).toHaveBeenCalledWith(
        expect.objectContaining({ type: 1, userId: 1 })
      );
    });
  });

  // ─── listAllRecords (admin) ───
  describe('listAllRecords', () => {
    it('管理员查看所有记录', async () => {
      creditService.listConsumptionRecords.mockResolvedValue({ list: [], total: 0 });
      const req = mockReq({ query: { userId: '5', page: '1', pageSize: '10' } });
      const res = mockRes();
      await listAllRecords(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── adminRefund ───
  describe('adminRefund', () => {
    it('管理员退款成功', async () => {
      creditService.adminRefundCredit.mockResolvedValue(undefined);
      const req = mockReq({ body: { recordId: 'rec1', remark: '客服退款' } });
      const res = mockRes();
      await adminRefund(req, res);
      expect(creditService.adminRefundCredit).toHaveBeenCalledWith('rec1', '客服退款');
      expect(res._jsonBody.msg).toMatch(/退款/);
    });
  });

  // ─── checkIn ───
  describe('checkIn (签到)', () => {
    it('签到成功返回积分', async () => {
      creditService.checkIn.mockResolvedValue({ reward: 10, streak: 7 });
      const req = mockReq();
      const res = mockRes();
      await checkIn(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.msg).toMatch(/10.*7/);
    });
  });

  // ─── checkInStatus ───
  describe('checkInStatus', () => {
    it('查询签到状态', async () => {
      creditService.getCheckInStatus.mockResolvedValue({ checkedIn: false, streak: 0 });
      const req = mockReq();
      const res = mockRes();
      await checkInStatus(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── shareReward ───
  describe('shareReward', () => {
    it('分享奖励成功', async () => {
      creditService.shareReward.mockResolvedValue({ reward: 5, alreadyClaimed: false });
      const req = mockReq();
      const res = mockRes();
      await shareReward(req, res);
      expect(res._jsonBody.code).toBe(200);
    });

    it('当日已领取返回特殊消息', async () => {
      creditService.shareReward.mockResolvedValue({ reward: 0, alreadyClaimed: true });
      const req = mockReq();
      const res = mockRes();
      await shareReward(req, res);
      expect(res._jsonBody.msg).toMatch(/已领取/);
    });
  });

  // ─── creditHistory ───
  describe('creditHistory', () => {
    it('返回积分历史', async () => {
      creditService.getCreditHistory.mockResolvedValue({ list: [{ id: 1, points: 10 }], total: 1 });
      const req = mockReq({ query: { page: '1', pageSize: '10' } });
      const res = mockRes();
      await creditHistory(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── creditBalance ───
  describe('creditBalance', () => {
    it('返回积分余额', async () => {
      creditService.getCreditBalance.mockResolvedValue({ balance: 100, totalEarned: 500 });
      const req = mockReq();
      const res = mockRes();
      await creditBalance(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.balance).toBe(100);
    });
  });
});
