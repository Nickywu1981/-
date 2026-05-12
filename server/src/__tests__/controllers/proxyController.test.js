import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({ mockSvc: { listConfigs: vi.fn(), getConfig: vi.fn(), createConfig: vi.fn(), updateConfig: vi.fn(), deleteConfig: vi.fn() } }));
vi.mock('../../services/proxyService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn() }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: (q) => ({ page: +(q.page || 1), pageSize: +(q.pageSize || 20) }) }));

import * as ctrl from '../../controller/proxyController.js';

describe('proxyController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listConfigs passes pagination', async () => {
    mockSvc.listConfigs.mockResolvedValue([{ id: 1 }]);
    await ctrl.listConfigs({ query: { status: 'active' }, tenantId: 1 }, {});
    expect(mockSvc.listConfigs).toHaveBeenCalledWith(1, { page: 1, pageSize: 20, status: 'active' });
  });

  it('getConfig finds by id', async () => {
    mockSvc.getConfig.mockResolvedValue({ id: 1, host: 'api.example.com' });
    await ctrl.getConfig({ params: { id: '1' }, tenantId: 1 }, {});
    expect(mockSvc.getConfig).toHaveBeenCalledWith('1', 1);
  });

  it('createConfig passes body', async () => {
    mockSvc.createConfig.mockResolvedValue({ id: 3 });
    await ctrl.createConfig({ tenantId: 1, body: { host: 'new.example.com' } }, {});
    expect(mockSvc.createConfig).toHaveBeenCalledWith(1, { host: 'new.example.com' });
  });

  it('updateConfig passes id+body', async () => {
    mockSvc.updateConfig.mockResolvedValue({ id: 1 });
    await ctrl.updateConfig({ params: { id: '1' }, tenantId: 1, body: { host: 'updated' } }, {});
    expect(mockSvc.updateConfig).toHaveBeenCalledWith('1', 1, { host: 'updated' });
  });

  it('deleteConfig passes id', async () => {
    mockSvc.deleteConfig.mockResolvedValue();
    await ctrl.deleteConfig({ params: { id: '1' }, tenantId: 1 }, {});
    expect(mockSvc.deleteConfig).toHaveBeenCalledWith('1', 1);
  });
});
