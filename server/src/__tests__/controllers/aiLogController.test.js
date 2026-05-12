import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({ mockSvc: { listAiLogs: vi.fn(), getStats: vi.fn() } }));
vi.mock('../../services/aiLogService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn(), listResult: vi.fn() }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: (q) => ({ page: +(q.page || 1), pageSize: +(q.pageSize || 20) }) }));

import * as ctrl from '../../controller/aiLogController.js';

describe('aiLogController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listAiLogs passes filters', async () => {
    mockSvc.listAiLogs.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    await ctrl.listAiLogs({ query: { page: '1', type: 'image' } }, {});
    expect(mockSvc.listAiLogs).toHaveBeenCalledWith({ page: 1, pageSize: 20, type: 'image', status: undefined });
  });

  it('getAiLogStats returns stats', async () => {
    mockSvc.getStats.mockResolvedValue({ totalCalls: 100 });
    await ctrl.getAiLogStats({}, {});
    expect(mockSvc.getStats).toHaveBeenCalled();
  });
});
