import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({ mockSvc: { listBadges: vi.fn(), getBadgeById: vi.fn(), createBadge: vi.fn(), updateBadge: vi.fn(), deleteBadge: vi.fn() } }));
vi.mock('../../services/badgeService.js', () => ({ default: mockSvc }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn() }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(c, m) { super(m); this.code = c; } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: { NOT_FOUND: 'NOT_FOUND' } }));

import * as ctrl from '../../controller/badgeController.js';

describe('badgeController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listBadges filters by category', async () => {
    mockSvc.listBadges.mockResolvedValue([{ id: 1 }]);
    await ctrl.listBadges({ query: { category: 'vip' } }, {});
    expect(mockSvc.listBadges).toHaveBeenCalledWith({ category: 'vip', status: 1 });
  });

  it('getBadge finds by id', async () => {
    mockSvc.getBadgeById.mockResolvedValue({ id: 1, name: 'VIP' });
    await ctrl.getBadge({ params: { id: '1' } }, {});
    expect(mockSvc.getBadgeById).toHaveBeenCalledWith('1');
  });

  it('getBadge throws on not found', async () => {
    mockSvc.getBadgeById.mockResolvedValue(null);
    await expect(ctrl.getBadge({ params: { id: '999' } }, {})).rejects.toThrow('标签不存在');
  });

  it('listAllBadges shows all', async () => {
    mockSvc.listBadges.mockResolvedValue([{ id: 1 }]);
    await ctrl.listAllBadges({ query: {} }, {});
    expect(mockSvc.listBadges).toHaveBeenCalledWith({ category: undefined, status: undefined });
  });

  it('createBadge passes body', async () => {
    mockSvc.createBadge.mockResolvedValue(5);
    await ctrl.createBadge({ body: { name: '新徽章' } }, {});
    expect(mockSvc.createBadge).toHaveBeenCalledWith({ name: '新徽章' });
  });

  it('updateBadge passes id+body', async () => {
    mockSvc.updateBadge.mockResolvedValue(true);
    await ctrl.updateBadge({ params: { id: '1' }, body: { name: '改名' } }, {});
    expect(mockSvc.updateBadge).toHaveBeenCalledWith('1', { name: '改名' });
  });

  it('deleteBadge passes id', async () => {
    mockSvc.deleteBadge.mockResolvedValue(true);
    await ctrl.deleteBadge({ params: { id: '1' } }, {});
    expect(mockSvc.deleteBadge).toHaveBeenCalledWith('1');
  });
});
