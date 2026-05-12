import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({ mockSvc: { listCampaigns: vi.fn(), getCampaign: vi.fn(), createCampaign: vi.fn(), updateCampaign: vi.fn(), deleteCampaign: vi.fn() } }));
vi.mock('../../services/campaignService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn(), listResult: vi.fn() }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: (q) => ({ page: +(q.page || 1), pageSize: +(q.pageSize || 20) }) }));

import * as ctrl from '../../controller/campaignController.js';

describe('campaignController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listCampaigns passes filters', async () => {
    mockSvc.listCampaigns.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    await ctrl.listCampaigns({ query: { type: 'promo', status: '1' }, res: {} });
    expect(mockSvc.listCampaigns).toHaveBeenCalledWith(expect.objectContaining({ type: 'promo', status: 1 }));
  });

  it('getCampaign finds by id', async () => {
    mockSvc.getCampaign.mockResolvedValue({ id: 1, name: '促销' });
    await ctrl.getCampaign({ params: { id: '5' }, res: {} });
    expect(mockSvc.getCampaign).toHaveBeenCalledWith(5);
  });

  it('createCampaign assigns tenant', async () => {
    mockSvc.createCampaign.mockResolvedValue({ id: 3 });
    await ctrl.createCampaign({ body: { name: '活动' }, user: { entId: 5 } });
    expect(mockSvc.createCampaign).toHaveBeenCalledWith(expect.objectContaining({ name: '活动', tenant_id: 5 }));
  });

  it('updateCampaign passes id+body', async () => {
    mockSvc.updateCampaign.mockResolvedValue({ id: 1 });
    await ctrl.updateCampaign({ params: { id: '3' }, body: { name: '改' }, res: {} });
    expect(mockSvc.updateCampaign).toHaveBeenCalledWith(3, { name: '改' });
  });

  it('deleteCampaign passes id', async () => {
    mockSvc.deleteCampaign.mockResolvedValue();
    await ctrl.deleteCampaign({ params: { id: '3' }, res: {} });
    expect(mockSvc.deleteCampaign).toHaveBeenCalledWith(3);
  });
});
