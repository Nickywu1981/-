import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute, query: mockQuery } }));

import * as dao from '../../dao/commerceDao.js';

describe('commerceDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── 会员套餐 ──

  it('updateMembership 应更新积分并返回 affectedRows', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    const r = await dao.updateMembership(10, 'pro', 500, '2026-12-31');
    expect(r).toBe(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_membership'),
      ['pro', 500, '2026-12-31', 10],
    );
  });

  it('renewMembership 应续费不叠加积分', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    await dao.renewMembership(10, 'pro', '2027-06-30');
    const callArgs = mockExecute.mock.calls[0][1];
    expect(callArgs).toEqual(['pro', '2027-06-30', 10]);
  });

  // ── 仪表盘统计 ──

  it('getDashboardStats 应对5个并行查询做聚合', async () => {
    mockExecute
      .mockResolvedValueOnce([{ userCount: 1000 }])
      .mockResolvedValueOnce([{ taskCount: 500 }])
      .mockResolvedValueOnce([{ todayTaskCount: 30 }])
      .mockResolvedValueOnce([{ paidUserCount: 200 }])
      .mockResolvedValueOnce([{ totalRevenue: 9999 }])
      .mockResolvedValueOnce([{ date: '2026-05-14', count: 10 }])   // taskTrend
      .mockResolvedValueOnce([{ date: '2026-05-14', count: 5 }])    // userTrend
      .mockResolvedValueOnce([{ date: '2026-05-14', amount: 100 }]); // revenueTrend

    const stats = await dao.getDashboardStats();

    expect(stats.userCount).toBe(1000);
    expect(stats.taskCount).toBe(500);
    expect(stats.todayTaskCount).toBe(30);
    expect(stats.paidUserCount).toBe(200);
    expect(stats.totalRevenue).toBe(9999);
    expect(stats.taskTrend[0].count).toBe(10);
    expect(stats.userTrend[0].count).toBe(5);
    expect(stats.revenueTrend[0].amount).toBe(100);
  });

  // ── 用户管理 ──

  it('listAllUsers 无筛选应返回列表+total', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, username: 'u1' }]]);
    mockExecute.mockResolvedValueOnce([[{ total: 1 }]]);

    const r = await dao.listAllUsers({ offset: 0, pageSize: 20 });
    expect(r.list).toHaveLength(1);
    expect(r.total).toBe(1);
  });

  it('listAllUsers 带keyword筛选', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([[{ total: 0 }]]);

    await dao.listAllUsers({ offset: 0, pageSize: 20, keyword: 'test', planType: 1 });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('u.username LIKE ?'),
      expect.arrayContaining(['%test%']),
    );
  });

  it('updateUserStatus 应传入status和userId', async () => {
    mockExecute.mockResolvedValue([{}]);
    await dao.updateUserStatus(5, 0);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user'),
      [0, 5],
    );
  });

  it('updateUserStatus 带tenantId应追加AND条件', async () => {
    mockExecute.mockResolvedValue([{}]);
    await dao.updateUserStatus(5, 0, 't1');
    const sql = mockExecute.mock.calls[0][0];
    expect(sql).toContain('AND tenant_id');
    expect(mockExecute.mock.calls[0][1]).toEqual([0, 5, 't1']);
  });

  it('batchUpdateUserStatus 空数组应返回0', async () => {
    expect(await dao.batchUpdateUserStatus([], 1)).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('batchUpdateUserStatus 应分批执行', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 2 }]);
    const r = await dao.batchUpdateUserStatus([1, 2], 1);
    expect(r).toBe(2);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('id IN (?,?)'),
      [1, 1, 2],
    );
  });

  // ── 操作日志 ──

  it('insertOperationLog 应写入日志', async () => {
    mockExecute.mockResolvedValue([{}]);
    await dao.insertOperationLog(10, 'login', '1.2.3.4', 'Mozilla');
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO operation_log'),
      [10, 'login', '1.2.3.4', 'Mozilla'],
    );
  });

  it('getOperationLogs 应支持userId+action双筛选', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const r = await dao.getOperationLogs({ offset: 0, pageSize: 10, userId: 10, action: 'login' });
    expect(r.list).toHaveLength(1);
    expect(r.total).toBe(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('user_id = ? AND action = ?'),
      [10, 'login', 0, 10],
    );
  });

  // ── 任务管理 ──

  it('getTaskById 查到返回task对象', async () => {
    mockExecute.mockResolvedValue([[{ id: 100, type: 'main_image' }]]);
    expect(await dao.getTaskById(100)).toEqual({ id: 100, type: 'main_image' });
  });

  it('getTaskById 未查到返回null', async () => {
    mockExecute.mockResolvedValue([[]]);
    expect(await dao.getTaskById(999)).toBeNull();
  });

  it('listAllTasks typeGroup=image 应展开IN子句', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([[{ total: 0 }]]);

    await dao.listAllTasks({ offset: 0, pageSize: 20, typeGroup: 'image' });
    expect(mockQuery.mock.calls[0][0]).toContain('t.type IN');
  });

  it('updateTaskStatusDirect 仅更新allowed字段', async () => {
    mockExecute.mockResolvedValue([{}]);
    await dao.updateTaskStatusDirect(1, { status: 3, progress: 50, _hack: 'bad' });
    const sql = mockExecute.mock.calls[0][0];
    expect(sql).toContain('status');
    expect(sql).toContain('progress');
    expect(sql).not.toContain('_hack');
  });

  // ── 审核 ──

  it('approveTask 应设置review_status=1', async () => {
    mockExecute.mockResolvedValue([{}]);
    await dao.approveTask(100);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('review_status = 1'),
      [100],
    );
  });

  it('rejectTask 带tenantId应JOIN user', async () => {
    mockExecute.mockResolvedValue([{}]);
    await dao.rejectTask(100, 't1');
    expect(mockExecute.mock.calls[0][0]).toContain('JOIN user');
  });

  // ── 套餐 ──

  it('createPlan 返回 insertId', async () => {
    mockExecute.mockResolvedValue([{ insertId: 77 }]);
    expect(await dao.createPlan({ name: 'Pro', price: 99, credits: 500, plan_type: 2 })).toBe(77);
  });

  it('deletePlan 返回 affectedRows', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    expect(await dao.deletePlan(1)).toBe(1);
  });

  it('updatePlan 只更新allowed字段', async () => {
    mockExecute.mockResolvedValue([{}]);
    mockExecute.mockResolvedValueOnce([{}]);
    mockExecute.mockResolvedValueOnce([[{ id: 1, name: 'Pro' }]]);
    await dao.updatePlan(1, { name: 'ProPlus', _evil: true });
    const updateSql = mockExecute.mock.calls[0][0];
    expect(updateSql).toContain('name');
    expect(updateSql).not.toContain('_evil');
  });

  // ── 订单 ──

  it('listAllOrders 应联表user', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, username: 'u1' }]]);
    mockExecute.mockResolvedValueOnce([[{ total: 1 }]]);
    const r = await dao.listAllOrders({ offset: 0, pageSize: 10 });
    expect(r.list).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('LEFT JOIN user');
  });

  it('deletePaymentOrder 无tenantId应拒绝删除', async () => {
    expect(await dao.deletePaymentOrder(1, null)).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('deletePaymentOrder 带tenantId应JOIN user做隔离', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    expect(await dao.deletePaymentOrder(1, 't1')).toBe(1);
    expect(mockExecute.mock.calls[0][0]).toContain('JOIN user');
  });

  // ── 风控 ──

  it('countIPRegister24h 应查24h内同IP注册数', async () => {
    mockExecute.mockResolvedValue([[{ count: 3 }]]);
    expect(await dao.countIPRegister24h('1.2.3.4')).toBe(3);
  });

  it('countUserAction1m 应查1min内同用户同操作数', async () => {
    mockExecute.mockResolvedValue([[{ count: 5 }]]);
    expect(await dao.countUserAction1m(10, 'login')).toBe(5);
  });

  // ── 企业订单 ──

  it('listEnterpriseOrders 必须传tenantId', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    mockQuery.mockResolvedValueOnce([[{ total: 0 }]]);
    await dao.listEnterpriseOrders('t1', { page: 1, pageSize: 10 });
    expect(mockQuery.mock.calls[0][1][0]).toBe('t1');
  });

  it('getEnterpriseOrderById 双条件隔离', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, tenant_id: 't1' }]]);
    const order = await dao.getEnterpriseOrderById(1, 't1');
    expect(order.id).toBe(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([1, 't1']);
  });
});
