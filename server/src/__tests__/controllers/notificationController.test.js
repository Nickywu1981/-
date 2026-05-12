import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({ mockSvc: { getNotifications: vi.fn(), getUnreadCount: vi.fn(), markAsRead: vi.fn(), markAllAsRead: vi.fn(), sendToUser: vi.fn() } }));
vi.mock('../../services/notificationService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn(), listResult: vi.fn() }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: (q) => ({ page: +(q.page || 1), pageSize: +(q.pageSize || 20) }) }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(c, m) { super(m); } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: {} }));

import * as ctrl from '../../controller/notificationController.js';

describe('notificationController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listNotifications calls service', async () => {
    mockSvc.getNotifications.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    await ctrl.listNotifications({ query: {}, user: { id: 1 } }, {});
    expect(mockSvc.getNotifications).toHaveBeenCalledWith(1, { page: 1, pageSize: 20 });
  });

  it('getUnreadCount returns count', async () => {
    mockSvc.getUnreadCount.mockResolvedValue(5);
    await ctrl.getUnreadCount({ user: { id: 1 } }, {});
    expect(mockSvc.getUnreadCount).toHaveBeenCalledWith(1);
  });

  it('markOneRead marks single', async () => {
    mockSvc.markAsRead.mockResolvedValue();
    await ctrl.markOneRead({ params: { id: '10' }, user: { id: 1 } }, {});
    expect(mockSvc.markAsRead).toHaveBeenCalledWith('10', 1);
  });

  it('markAllRead marks all', async () => {
    mockSvc.markAllAsRead.mockResolvedValue();
    await ctrl.markAllRead({ user: { id: 1 } }, {});
    expect(mockSvc.markAllAsRead).toHaveBeenCalledWith(1);
  });

  it('sendNotification passes params', async () => {
    mockSvc.sendToUser.mockResolvedValue({ id: 10 });
    await ctrl.sendNotification({ body: { userId: 2, type: 'system', title: 'T', content: 'C' } }, {});
    expect(mockSvc.sendToUser).toHaveBeenCalledWith({ userId: 2, type: 'system', title: 'T', content: 'C' });
  });
});
