import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: {
    listChannels: vi.fn(), getChannelDetail: vi.fn(), applyChannel: vi.fn(),
    auditChannel: vi.fn(), getDownstreamAgents: vi.fn(),
    listPolicies: vi.fn(), createPolicy: vi.fn(),
  },
}));

vi.mock('../../services/channelService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(code, msg) { super(msg); } } }));

import * as ctrl from '../../controller/channelController.js';

describe('channelController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listChannels paginates', async () => {
    mockSvc.listChannels.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const r = await ctrl.listChannels({ query: { page: 1, pageSize: 10 }, tenantId: 1 });
    expect(r.list).toHaveLength(1);
  });

  it('getChannelDetail returns channel', async () => {
    mockSvc.getChannelDetail.mockResolvedValue({ id: 1, name: '渠道A' });
    const r = await ctrl.getChannelDetail({ params: { id: '1' }, tenantId: 1 });
    expect(r.name).toBe('渠道A');
  });

  it('applyChannel returns id', async () => {
    mockSvc.applyChannel.mockResolvedValue(3);
    const r = await ctrl.applyChannel({ body: { name: '新渠道' }, tenantId: 1 });
    expect(r.id).toBe(3);
  });

  it('auditChannel completes', async () => {
    mockSvc.auditChannel.mockResolvedValue();
    const r = await ctrl.auditChannel({ params: { id: '1' }, tenantId: 1, body: { status: 'approved' } });
    expect(r.message).toBe('审核完成');
  });

  it('getDownstreamAgents returns list', async () => {
    mockSvc.getDownstreamAgents.mockResolvedValue([{ id: 1 }]);
    const r = await ctrl.getDownstreamAgents({ tenantId: 1 });
    expect(r).toHaveLength(1);
  });

  it('listPolicies returns policies', async () => {
    mockSvc.listPolicies.mockResolvedValue([{ id: 1, rate: 0.3 }]);
    const r = await ctrl.listPolicies({ tenantId: 1 });
    expect(r[0].rate).toBe(0.3);
  });

  it('createPolicy returns id', async () => {
    mockSvc.createPolicy.mockResolvedValue(5);
    const r = await ctrl.createPolicy({ tenantId: 1, body: { name: '政策' } });
    expect(r.id).toBe(5);
  });
});
