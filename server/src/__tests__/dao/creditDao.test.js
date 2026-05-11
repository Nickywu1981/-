import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute, query: mockQuery } }));

import * as creditDao from '../../dao/creditDao.js';

describe('creditDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getMembership 返回会员行', async () => {
    mockExecute.mockResolvedValue([[{ user_id: 1, plan_type: 1, credit_balance: 100 }]]);
    const r = await creditDao.getMembership(1);
    expect(r).toEqual({ user_id: 1, plan_type: 1, credit_balance: 100 });
  });

  it('getMembership 不存在返回 null', async () => {
    mockExecute.mockResolvedValue([[]]);
    expect(await creditDao.getMembership(99)).toBeNull();
  });

  it('updateCreditBalance 受影响行 > 0 返回 true', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    expect(await creditDao.updateCreditBalance(1, -5)).toBe(true);
  });

  it('updateCreditBalance 无匹配返回 false', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 0 }]);
    expect(await creditDao.updateCreditBalance(99, 10)).toBe(false);
  });

  it('insertConsumptionLog 返回 insertId', async () => {
    mockExecute.mockResolvedValue([{ insertId: 42 }]);
    const id = await creditDao.insertConsumptionLog({
      userId: 1, type: 2, action: 'cutout', creditBefore: 10, creditAfter: 9, consumed: 1, remark: 'test', status: 1,
    });
    expect(id).toBe(42);
  });

  it('confirmConsumption 确认消费返回 affectedRows', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    const r = await creditDao.confirmConsumption(1, 95);
    expect(r).toBe(1);
  });

  it('getDailyUsedCredits 返回当天用量', async () => {
    mockExecute.mockResolvedValue([[{ used: 25 }]]);
    const r = await creditDao.getDailyUsedCredits(1);
    expect(r).toBe(25);
  });

  it('getMonthlyUsedCredits 返回当月用量', async () => {
    mockExecute.mockResolvedValue([[{ used: 120 }]]);
    const r = await creditDao.getMonthlyUsedCredits(1);
    expect(r).toBe(120);
  });

  it('getPlanByType 找到套餐', async () => {
    mockExecute.mockResolvedValue([[{ plan_type: 1, name: '月卡', price: 29 }]]);
    const r = await creditDao.getPlanByType(1);
    expect(r.name).toBe('月卡');
  });

  it('listActivePlans 返回套餐列表', async () => {
    mockExecute.mockResolvedValue([[{ plan_type: 1 }, { plan_type: 2 }]]);
    const rows = await creditDao.listActivePlans();
    expect(rows).toHaveLength(2);
  });

  it('getConsumptionByRequestId 防重复幂等', async () => {
    mockExecute.mockResolvedValue([[{ id: 5, consumed: 2 }]]);
    const r = await creditDao.getConsumptionByRequestId('req-123');
    expect(r.id).toBe(5);
  });

  it('listConsumptionRecords 分页查询', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);
    mockQuery.mockResolvedValueOnce([[{ total: 2 }]]);
    const r = await creditDao.listConsumptionRecords({ userId: 1, page: 1, pageSize: 20 });
    expect(r.list).toHaveLength(2);
    expect(r.total).toBe(2);
  });
});
