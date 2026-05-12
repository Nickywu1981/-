import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: {
    getCustomerList: vi.fn(), getCustomerDetail: vi.fn(), getCustomerStats: vi.fn(),
    createTag: vi.fn(), listTags: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn(), tagCustomer: vi.fn(),
  },
}));

vi.mock('../../services/customerService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d, m) => ({ code: 0, data: d, message: m }) }));

import * as ctrl from '../../controller/customerController.js';

describe('customerController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listCustomers returns paginated', async () => {
    mockSvc.getCustomerList.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const r = await ctrl.listCustomers({ tenantId: 1, query: {} });
    expect(r.data.list).toHaveLength(1);
  });

  it('getCustomerDetail returns customer', async () => {
    mockSvc.getCustomerDetail.mockResolvedValue({ id: 1, name: '张三' });
    const r = await ctrl.getCustomerDetail({ tenantId: 1, params: { id: '1' } });
    expect(r.data.name).toBe('张三');
  });

  it('getCustomerStats returns stats', async () => {
    mockSvc.getCustomerStats.mockResolvedValue({ total: 500, newThisWeek: 12 });
    const r = await ctrl.getCustomerStats({ tenantId: 1 });
    expect(r.data.total).toBe(500);
  });

  it('createTag returns data', async () => {
    mockSvc.createTag.mockResolvedValue({ id: 1, name: 'VIP' });
    const r = await ctrl.createTag({ tenantId: 1, body: { name: 'VIP' } });
    expect(r.data.name).toBe('VIP');
  });

  it('listTags returns tags', async () => {
    mockSvc.listTags.mockResolvedValue([{ id: 1, name: 'VIP' }]);
    const r = await ctrl.listTags({ tenantId: 1 });
    expect(r.data).toHaveLength(1);
  });

  it('updateTag succeeds', async () => {
    mockSvc.updateTag.mockResolvedValue({ id: 1, name: 'SVIP' });
    const r = await ctrl.updateTag({ tenantId: 1, params: { id: '1' }, body: { name: 'SVIP' } });
    expect(r.message).toBe('标签已更新');
  });

  it('deleteTag succeeds', async () => {
    mockSvc.deleteTag.mockResolvedValue();
    const r = await ctrl.deleteTag({ tenantId: 1, params: { id: '1' } });
    expect(r.message).toBe('标签已删除');
  });

  it('tagCustomer assigns tag', async () => {
    mockSvc.tagCustomer.mockResolvedValue();
    const r = await ctrl.tagCustomer({ tenantId: 1, params: { tagId: '2' }, body: { userId: 1 } });
    expect(r.message).toBe('已打标');
  });
});
