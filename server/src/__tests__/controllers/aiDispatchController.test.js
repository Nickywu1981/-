import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/response.js', () => ({
  success: (res, data, msg) => ({ code: 200, data, msg: msg || 'ok' }),
  fail: (res, code, msg) => ({ code, msg }),
  error: (res, code, msg) => ({ code: code || 500, msg }),
  listResult: (res, obj) => ({ code: 200, ...obj }),
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/modelDispatcher.js');
vi.mock('../../gateway/aiGatewayHub.js');
vi.mock('../../constants/errorCode.js', () => ({
  ERROR_CODE: Object.freeze({ INTERNAL_ERROR: 500 }),
}));

import * as modelDispatcher from '../../services/modelDispatcher.js';
import * as aiGatewayHub from '../../gateway/aiGatewayHub.js';
import { aiDispatchController } from '../../controller/aiDispatchController.js';

function mockReq(o) { return { body: {}, params: {}, query: {}, user: { id: 1, tenantId: 't1' }, headers: {}, path: '/test', method: 'POST', ...o }; }
function mockRes() {
  const r = {};
  r.json = vi.fn(function () { return this; });
  r.status = vi.fn(function () { return this; });
  r.setHeader = vi.fn();
  r.headersSent = false;
  return r;
}

describe('aiDispatchController', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('dispatch 正常派发', async () => {
    aiGatewayHub.gatewayDispatch.mockResolvedValue({ output: 'ok', modelId: 'gpt-4' });
    const result = await aiDispatchController.dispatch(
      mockReq({ body: { mode: 'single', taskType: 'chat', input: { prompt: 'hi' }, modelId: 'gpt-4' } }),
      mockRes(),
    );
    expect(result.code).toBe(200);
    expect(result.data.output).toBe('ok');
    expect(aiGatewayHub.gatewayDispatch).toHaveBeenCalledTimes(1);
  });

  it('dispatch 传递 skipCache + correlationId', async () => {
    aiGatewayHub.gatewayDispatch.mockResolvedValue({});
    await aiDispatchController.dispatch(
      mockReq({ body: { mode: 'single', taskType: 'chat', input: 'hi', skipCache: true }, headers: { 'x-correlation-id': 'cid-001' } }),
      mockRes(),
    );
    const opts = aiGatewayHub.gatewayDispatch.mock.calls[0][1];
    expect(opts.skipCache).toBe(true);
    expect(opts.correlationId).toBe('cid-001');
  });

  it('getCategories 返回分类列表', async () => {
    modelDispatcher.getCategories.mockReturnValue([{ id: 'text', name: '文本' }]);
    const result = await aiDispatchController.getCategories(mockReq(), mockRes());
    expect(result.data).toEqual([{ id: 'text', name: '文本' }]);
  });

  it('getModelsByCategory 返回模型列表', async () => {
    modelDispatcher.getModelsByCategory.mockReturnValue([{ id: 'gpt-4' }, { id: 'gpt-3.5' }]);
    const result = await aiDispatchController.getModelsByCategory(mockReq({ params: { category: 'text' } }), mockRes());
    expect(result.data.category).toBe('text');
    expect(result.data.models).toEqual(['gpt-4', 'gpt-3.5']);
  });

  it('health 返回健康检查', async () => {
    modelDispatcher.healthCheck.mockResolvedValue({ status: 'ok' });
    modelDispatcher.getUsageStats.mockReturnValue({ totalCalls: 100 });
    modelDispatcher.extensionHooks = { cache: () => {}, fallback: null };
    const result = await aiDispatchController.health(mockReq(), mockRes());
    expect(result.data.health.status).toBe('ok');
    expect(result.data.stats.totalCalls).toBe(100);
    expect(result.data.extensions.cache).toBe('registered');
  });

  it('stats 返回用量统计', async () => {
    modelDispatcher.getUsageStats.mockReturnValue({ totalTokens: 5000 });
    const result = await aiDispatchController.stats(mockReq(), mockRes());
    expect(result.data.totalTokens).toBe(5000);
  });

  it('clearCache 清空缓存', async () => {
    modelDispatcher.clearCache = vi.fn();
    const result = await aiDispatchController.clearCache(mockReq(), mockRes());
    expect(result.data).toEqual({});
  });
});
