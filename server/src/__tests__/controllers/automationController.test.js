import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: {
    listTasks: vi.fn(), createTask: vi.fn(), cancelTask: vi.fn(), executeTask: vi.fn(),
    listAccounts: vi.fn(), createAccount: vi.fn(), deleteAccount: vi.fn(),
  },
}));

vi.mock('../../services/automationService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d, m) => ({ code: 200, data: d, message: m }) }));

import * as ctrl from '../../controller/automationController.js';

describe('automationController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listTasks returns paginated', async () => {
    mockSvc.listTasks.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    await ctrl.listTasks({ query: {}, user: { id: 1 }, tenantId: 1 });
    expect(mockSvc.listTasks).toHaveBeenCalledWith(1, 1, { page: 1, pageSize: 20 });
  });

  it('createTask succeeds', async () => {
    mockSvc.createTask.mockResolvedValue({ id: 3 });
    await ctrl.createTask({ user: { id: 1 }, tenantId: 1, body: { name: '定时任务' } });
    expect(mockSvc.createTask).toHaveBeenCalled();
  });

  it('cancelTask succeeds', async () => {
    mockSvc.cancelTask.mockResolvedValue();
    await ctrl.cancelTask({ params: { id: '5' }, user: { id: 1, tenantId: 1 } });
    expect(mockSvc.cancelTask).toHaveBeenCalledWith('5', 1, 1);
  });

  it('executeTask triggers execution', async () => {
    mockSvc.executeTask.mockResolvedValue({ status: 'running' });
    await ctrl.executeTask({ params: { taskId: '3' }, user: { id: 1, tenantId: 1 } });
    expect(mockSvc.executeTask).toHaveBeenCalledWith('3', 1, 1);
  });

  it('listAccounts returns list', async () => {
    mockSvc.listAccounts.mockResolvedValue([{ id: 1, platform: 'tiktok' }]);
    await ctrl.listAccounts({ query: {}, user: { id: 1 }, tenantId: 1 });
    expect(mockSvc.listAccounts).toHaveBeenCalled();
  });

  it('createAccount succeeds', async () => {
    mockSvc.createAccount.mockResolvedValue({ id: 7 });
    await ctrl.createAccount({ user: { id: 1 }, tenantId: 1, body: { platform: 'tiktok' } });
    expect(mockSvc.createAccount).toHaveBeenCalled();
  });

  it('deleteAccount succeeds', async () => {
    mockSvc.deleteAccount.mockResolvedValue();
    await ctrl.deleteAccount({ params: { id: '2' }, user: { id: 1, tenantId: 1 } });
    expect(mockSvc.deleteAccount).toHaveBeenCalledWith('2', 1, 1);
  });
});
