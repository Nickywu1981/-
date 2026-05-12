import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({
  success: (_res, data, msg) => ({ code: 0, data, message: msg }),
  listResult: (_res, list, total, page, pageSize) => ({ code: 0, data: { list, total, page, pageSize } }),
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/advancedImageService.js');
vi.mock('../../constants/errorCode.js', () => ({
  ERROR_CODE: Object.freeze({ PARAM_MISSING: 1001, BAD_REQUEST: 400, NOT_FOUND: 404 }),
}));

import * as advService from '../../services/advancedImageService.js';
import {
  submitVirtualTryon, submitStyleTransfer, submitImageTranslate,
  submitOutpainting, submitGhostMannequin, getTaskResult, listMyTasks,
} from '../../controller/advancedImageController.js';

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1 }, ...overrides };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('advancedImageController', () => {
  it('submitVirtualTryon no image throws', async () => {
    await expect(submitVirtualTryon(mockReq({ body: {} }), {})).rejects.toThrow();
  });

  it('submitVirtualTryon success', async () => {
    advService.submitVirtualTryon.mockResolvedValue({ taskId: 't1' });
    const r = await submitVirtualTryon(mockReq({ body: { productImageUrl: 'url' } }), {});
    expect(r.code).toBe(0);
  });

  it('submitStyleTransfer missing targetStyle throws', async () => {
    await expect(submitStyleTransfer(mockReq({ body: { productImageUrl: 'url' } }), {})).rejects.toThrow();
  });

  it('submitImageTranslate missing targetLang throws', async () => {
    await expect(submitImageTranslate(mockReq({ body: { productImageUrl: 'url' } }), {})).rejects.toThrow();
  });

  it('getTaskResult returns task', async () => {
    advService.getTaskResult.mockResolvedValue({ taskId: 't1', status: 'done' });
    const r = await getTaskResult(mockReq({ params: { taskId: 't1' } }), {});
    expect(r.data.taskId).toBe('t1');
  });

  it('listMyTasks returns page', async () => {
    advService.listMyTasks.mockResolvedValue({ rows: [], total: 0 });
    const r = await listMyTasks(mockReq({ query: { page: '1', pageSize: '20' } }), {});
    expect(r.code).toBe(0);
  });

  it('submitOutpainting success', async () => {
    advService.submitOutpainting.mockResolvedValue({ taskId: 't5' });
    const r = await submitOutpainting(mockReq({ body: { productImageUrl: 'url' } }), {});
    expect(r.code).toBe(0);
  });

  it('submitGhostMannequin success', async () => {
    advService.submitGhostMannequin.mockResolvedValue({ taskId: 't6' });
    const r = await submitGhostMannequin(mockReq({ body: { productImageUrl: 'url' } }), {});
    expect(r.code).toBe(0);
  });
});
