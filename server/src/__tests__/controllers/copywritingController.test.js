import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/copywritingService.js');

import * as copywritingService from '../../services/copywritingService.js';
import {
  generateTitles, generateDescription, translateProduct, generateScript,
  listPlatforms, listLanguages, listHistory, deleteHistory,
} from '../../controller/copywritingController.js';

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { res._jsonBody = body; return res; });
  res.setHeader = vi.fn();
  res.status = vi.fn(function () { return res; });
  return res;
}
function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1 }, ...overrides };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('copywritingController', () => {
  it('generateTitles returns result', async () => {
    copywritingService.generateTitles.mockResolvedValue({ titles: ['A', 'B'] });
    const res = mockRes();
    await generateTitles(mockReq({ body: { productName: 'T恤' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('generateDescription returns result', async () => {
    copywritingService.generateDescription.mockResolvedValue({ description: 'ok' });
    const res = mockRes();
    await generateDescription(mockReq({ body: { productName: 'T恤' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('translateProduct returns result', async () => {
    copywritingService.translateProduct.mockResolvedValue({ translations: {} });
    const res = mockRes();
    await translateProduct(mockReq({ body: { text: 'T恤', targetLang: 'en' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('generateScript returns result', async () => {
    copywritingService.generateScript.mockResolvedValue({ script: '...' });
    const res = mockRes();
    await generateScript(mockReq({ body: { productName: 'T恤' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('listPlatforms returns list', async () => {
    copywritingService.getPlatforms.mockReturnValue([{ id: 1, name: '淘宝' }]);
    const res = mockRes();
    await listPlatforms(mockReq(), res);
    expect(res._jsonBody.data).toHaveLength(1);
  });

  it('listLanguages returns list', async () => {
    copywritingService.getLanguages.mockReturnValue([{ code: 'en', name: 'English' }]);
    const res = mockRes();
    await listLanguages(mockReq(), res);
    expect(res._jsonBody.data).toHaveLength(1);
  });

  it('listHistory returns page', async () => {
    copywritingService.getHistory.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });
    const res = mockRes();
    await listHistory(mockReq({ query: { page: '1', pageSize: '10' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('deleteHistory deletes record', async () => {
    copywritingService.deleteRecord.mockResolvedValue();
    const res = mockRes();
    await deleteHistory(mockReq({ params: { id: '1' } }), res);
    expect(copywritingService.deleteRecord).toHaveBeenCalledWith(1, 1);
    expect(res._jsonBody.code).toBe(200);
  });
});
