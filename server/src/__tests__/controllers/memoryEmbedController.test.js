import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({
  success: (_res, data, msg) => ({ code: 200, data, message: msg }),
  listResult: (_res, list, total, page, pageSize) => ({ code: 200, data: { list, total, page, pageSize } }),
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/memoryEmbedService.js');

import * as svc from '../../services/memoryEmbedService.js';
import { embed, search, status } from '../../controller/memoryEmbedController.js';

beforeEach(() => { vi.clearAllMocks(); });

describe('memoryEmbedController', () => {
  it('embed returns vector', async () => {
    svc.embed.mockResolvedValue({ vector: [0.1, 0.2], tokens: 10 });
    const r = await embed({ body: { text: 'test' } }, {});
    expect(r.code).toBe(200);
  });

  it('search default topK=5', async () => {
    svc.semanticSearch.mockResolvedValue({ results: [] });
    await search({ body: { query: 'test' } }, {});
    expect(svc.semanticSearch).toHaveBeenCalledWith('test', 5);
  });

  it('search custom topK', async () => {
    svc.semanticSearch.mockResolvedValue({ results: [] });
    await search({ body: { query: 'test', topK: 3 } }, {});
    expect(svc.semanticSearch).toHaveBeenCalledWith('test', 3);
  });

  it('status returns memory info', async () => {
    svc.getMemoryStatus.mockResolvedValue({ totalVectors: 100 });
    const r = await status({}, {});
    expect(r.data.totalVectors).toBe(100);
  });
});
