import { describe, it, expect, vi } from 'vitest';

const { mockDao } = vi.hoisted(() => ({
  mockDao: {
    listEnterpriseOrders: vi.fn(), getEnterpriseOrderById: vi.fn(), getEnterpriseOrderStats: vi.fn(),
  },
}));

vi.mock('../../dao/commerceDao.js', () => mockDao);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d) => ({ code: 0, data: d }) }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(code, msg) { super(msg); this.code = code; } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: { NOT_FOUND: 'NOT_FOUND' } }));

import * as ctrl from '../../controller/commerceController.js';

describe('commerceController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listOrders paginates', async () => {
    mockDao.listEnterpriseOrders.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const r = await ctrl.listOrders({ query: { page: '1', pageSize: '10' }, tenantId: 1 });
    expect(r.data.list).toHaveLength(1);
  });

  it('getOrderDetail returns order', async () => {
    mockDao.getEnterpriseOrderById.mockResolvedValue({ id: 1, amount: 99 });
    const r = await ctrl.getOrderDetail({ params: { id: '1' }, tenantId: 1 });
    expect(r.data.amount).toBe(99);
  });

  it('getOrderDetail throws on not found', async () => {
    mockDao.getEnterpriseOrderById.mockResolvedValue(null);
    await expect(ctrl.getOrderDetail({ params: { id: '999' }, tenantId: 1 })).rejects.toThrow('订单不存在');
  });

  it('getOrderStats returns stats', async () => {
    mockDao.getEnterpriseOrderStats.mockResolvedValue({ totalOrders: 100, revenue: 5000 });
    const r = await ctrl.getOrderStats({ tenantId: 1 });
    expect(r.data.totalOrders).toBe(100);
  });
});
