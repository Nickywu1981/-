import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: { submitBatchTask: vi.fn(), redoBatchTask: vi.fn(), listBatchHistory: vi.fn(), getBatchZipUrl: vi.fn() },
}));

vi.mock('../../services/batchService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d, m) => ({ code: 0, data: d, message: m }), listResult: (r, d) => ({ code: 0, data: d }) }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(code, msg) { super(msg); this.code = code; } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: { PARAM_MISSING: 'PARAM_MISSING', NOT_FOUND: 'NOT_FOUND' } }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: (q, opts) => ({ page: +(q.page || 1), pageSize: +(q.pageSize || opts.defaultPageSize) }) }));

import * as ctrl from '../../controller/batchController.js';

describe('batchController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submitBatchTask rejects empty imageUrls', async () => {
    await expect(ctrl.submitBatchTask({ body: { imageUrls: [] }, user: { id: 1 } })).rejects.toThrow();
  });

  it('submitBatchTask rejects missing operation', async () => {
    await expect(ctrl.submitBatchTask({ body: { imageUrls: ['a.jpg'] }, user: { id: 1 } })).rejects.toThrow();
  });

  it('submitBatchTask succeeds', async () => {
    mockSvc.submitBatchTask.mockResolvedValue({ taskId: 'xyz' });
    const r = await ctrl.submitBatchTask({ body: { imageUrls: ['a.jpg'], operation: 'resize' }, user: { id: 1 } });
    expect(r.data.taskId).toBe('xyz');
  });

  it('redoBatchTask rejects missing taskId', async () => {
    await expect(ctrl.redoBatchTask({ body: {}, user: { id: 1 } })).rejects.toThrow();
  });

  it('redoBatchTask succeeds', async () => {
    mockSvc.redoBatchTask.mockResolvedValue({ taskId: 'copy' });
    const r = await ctrl.redoBatchTask({ body: { taskId: 'old' }, user: { id: 1 } });
    expect(r.data.taskId).toBe('copy');
  });

  it('listBatchHistory paginates', async () => {
    mockSvc.listBatchHistory.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const r = await ctrl.listBatchHistory({ query: { page: '1' }, user: { id: 1 } });
    expect(r.data.list).toHaveLength(1);
  });

  it('getBatchZipUrl returns url', async () => {
    mockSvc.getBatchZipUrl.mockResolvedValue({ zipUrl: '/zip/test.zip' });
    const r = await ctrl.getBatchZipUrl({ params: { taskId: 'xyz' }, user: { id: 1 } });
    expect(r.data.zipUrl).toBe('/zip/test.zip');
  });
});
