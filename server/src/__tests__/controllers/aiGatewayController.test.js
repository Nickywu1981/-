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
vi.mock('../../gateway/aiGatewayHub.js');
vi.mock('../../constants/errorCode.js', () => ({
  ERROR_CODE: Object.freeze({ INTERNAL_ERROR: 500 }),
}));

import * as aiGatewayHub from '../../gateway/aiGatewayHub.js';
import { aiGatewayController } from '../../controller/aiGatewayController.js';

function mockReq(o) { return { body: {}, params: {}, query: {}, user: { id: 1, tenantId: 't1' }, headers: {}, path: '/test', method: 'POST', ...o }; }
function mockRes() {
  const r = {};
  r.json = vi.fn(function () { return this; });
  r.status = vi.fn(function () { return this; });
  r.setHeader = vi.fn();
  r.headersSent = false;
  return r;
}

describe('aiGatewayController', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('infer 返回完整推理结果', async () => {
    aiGatewayHub.gatewayInfer.mockResolvedValue({
      modelId: 'gpt-4', output: 'result', elapsed: 1200,
      tokensIn: 10, tokensOut: 20, cost: 0.003, correlationId: 'cid-1',
    });
    const result = await aiGatewayController.infer(
      mockReq({ body: { modelId: 'gpt-4', input: 'hello', taskType: 'chat' } }),
      mockRes(),
    );
    expect(result.code).toBe(200);
    expect(result.data.modelId).toBe('gpt-4');
    expect(result.data.output).toBe('result');
    expect(result.data.elapsed).toBe(1200);
    expect(result.data.cost).toBe(0.003);
  });

  it('infer 调用 gatewayInfer 传入上下文', async () => {
    aiGatewayHub.gatewayInfer.mockResolvedValue({});
    await aiGatewayController.infer(
      mockReq({ body: { modelId: 'gpt-4', input: 'hi', taskType: 'chat', source: 'api', skipCache: true, maxRetries: 2 }, headers: { 'x-correlation-id': 'x-123' } }),
      mockRes(),
    );
    expect(aiGatewayHub.gatewayInfer).toHaveBeenCalled();
    const opts = aiGatewayHub.gatewayInfer.mock.calls[0][2];
    expect(opts).toBeDefined();
    expect(opts.source).toBe('api');
    expect(opts.skipCache).toBe(true);
    expect(opts.maxRetries).toBe(2);
  });

  it('infer source 默认值', async () => {
    aiGatewayHub.gatewayInfer.mockResolvedValue({});
    await aiGatewayController.infer(mockReq({ body: { modelId: 'm1', input: 'x', taskType: 't' } }), mockRes());
    expect(aiGatewayHub.gatewayInfer.mock.calls[0][2].source).toBe('consumer');
  });

  it('dispatch 透传上下文', async () => {
    aiGatewayHub.gatewayDispatch.mockResolvedValue({ routed: true });
    const result = await aiGatewayController.dispatch(
      mockReq({ body: { mode: 'multi', taskType: 'image', input: {} }, headers: { 'x-correlation-id': 'cid-2' } }),
      mockRes(),
    );
    expect(result.code).toBe(200);
    expect(result.data.routed).toBe(true);
  });

  it('route 返回路由结果', async () => {
    aiGatewayHub.gatewayRoute.mockResolvedValue({ provider: 'openai', modelId: 'gpt-4' });
    const result = await aiGatewayController.route(mockReq({ body: { taskType: 'chat', input: 'hi' } }), mockRes());
    expect(result.data.provider).toBe('openai');
  });

  it('statsTokens 返回统计', async () => {
    aiGatewayHub.getGatewayStats.mockResolvedValue({ totalTokens: 10000, totalCost: 5.2 });
    const result = await aiGatewayController.statsTokens(mockReq(), mockRes());
    expect(result.data.totalTokens).toBe(10000);
  });

  it('pricing 有 category', async () => {
    aiGatewayHub.getGatewayPricing.mockResolvedValue([{ modelId: 'gpt-4', price: 0.03 }]);
    const result = await aiGatewayController.pricing(mockReq({ query: { category: 'text' } }), mockRes());
    expect(result.data[0].modelId).toBe('gpt-4');
  });

  it('pricing 无 category', async () => {
    aiGatewayHub.getGatewayPricing.mockResolvedValue([]);
    const result = await aiGatewayController.pricing(mockReq({ query: {} }), mockRes());
    expect(result.data).toEqual([]);
  });
});
