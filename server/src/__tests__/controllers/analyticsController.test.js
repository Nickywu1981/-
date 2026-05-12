import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({ mockSvc: { trackEvent: vi.fn(), getFunnelMetrics: vi.fn(), getActiveUsers: vi.fn(), getTopTools: vi.fn() } }));
vi.mock('../../services/analyticsService.js', () => ({ default: mockSvc }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn() }));

import * as ctrl from '../../controller/analyticsController.js';

describe('analyticsController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('track records event with user', async () => {
    mockSvc.trackEvent.mockResolvedValue();
    await ctrl.track({ body: { event: 'click', metadata: {} }, user: { id: 1 }, ip: '::1' }, {});
    expect(mockSvc.trackEvent).toHaveBeenCalledWith(1, 'click', expect.objectContaining({ ip: '::1' }));
  });

  it('track handles anonymous user', async () => {
    mockSvc.trackEvent.mockResolvedValue();
    await ctrl.track({ body: { event: 'pageview' }, user: null, ip: '::1' }, {});
    expect(mockSvc.trackEvent).toHaveBeenCalledWith(null, 'pageview', expect.any(Object));
  });

  it('funnel returns metrics', async () => {
    mockSvc.getFunnelMetrics.mockResolvedValue({ steps: [] });
    await ctrl.funnel({ query: { days: '7' } }, {});
    expect(mockSvc.getFunnelMetrics).toHaveBeenCalled();
  });

  it('active returns users', async () => {
    mockSvc.getActiveUsers.mockResolvedValue({ dau: 100 });
    await ctrl.active({}, {});
    expect(mockSvc.getActiveUsers).toHaveBeenCalled();
  });

  it('topTools returns ranking', async () => {
    mockSvc.getTopTools.mockResolvedValue([{ name: 'remove-bg', count: 50 }]);
    await ctrl.topTools({ query: { days: '7', limit: '5' } }, {});
    expect(mockSvc.getTopTools).toHaveBeenCalledWith(7, 5);
  });
});
