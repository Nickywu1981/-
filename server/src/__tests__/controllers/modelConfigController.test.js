import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/modelConfigService.js');
vi.mock('../../services/model-router.service.js');

import * as modelConfigService from '../../services/modelConfigService.js';
import * as modelRouterService from '../../services/model-router.service.js';
import {
  list, getOne, create, update, remove, toggle,
  callLogs, callStats, getModelStatus, resetBreaker,
} from '../../controller/modelConfigController.js';

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { res._jsonBody = body; return res; });
  res.setHeader = vi.fn();
  res.status = vi.fn(function () { return res; });
  return res;
}
function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, validated: null, ...overrides };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('modelConfigController — CRUD', () => {
  it('list 默认不包含禁用', async () => {
    modelConfigService.list.mockResolvedValue([{ modelKey: 'gpt-4' }]);
    const res = mockRes();
    await list(mockReq(), res);
    expect(modelConfigService.list).toHaveBeenCalledWith(false);
  });

  it('list ?all=1 含禁用', async () => {
    modelConfigService.list.mockResolvedValue([]);
    const res = mockRes();
    await list(mockReq({ query: { all: '1' } }), res);
    expect(modelConfigService.list).toHaveBeenCalledWith(true);
  });

  it('getOne 按 modelKey 查询', async () => {
    modelConfigService.getByKey.mockResolvedValue({ modelKey: 'gpt-4' });
    const res = mockRes();
    await getOne(mockReq({ params: { modelKey: 'gpt-4' } }), res);
    expect(modelConfigService.getByKey).toHaveBeenCalledWith('gpt-4');
  });

  it('create 注册模型', async () => {
    modelConfigService.create.mockResolvedValue({ modelKey: 'gpt-4' });
    const res = mockRes();
    const req = mockReq({ validated: { modelKey: 'gpt-4', provider: 'openai' } });
    await create(req, res);
    expect(modelConfigService.create).toHaveBeenCalledWith(req.validated);
  });

  it('update 更新配置', async () => {
    modelConfigService.update.mockResolvedValue({ modelKey: 'gpt-4' });
    const res = mockRes();
    const req = mockReq({ params: { modelKey: 'gpt-4' }, validated: { maxTokens: 4096 } });
    await update(req, res);
    expect(modelConfigService.update).toHaveBeenCalledWith('gpt-4', req.validated);
  });

  it('remove 删除模型', async () => {
    modelConfigService.remove.mockResolvedValue();
    const res = mockRes();
    await remove(mockReq({ params: { modelKey: 'gpt-4' } }), res);
    expect(modelConfigService.remove).toHaveBeenCalledWith('gpt-4');
  });

  it('toggle 启用模型', async () => {
    modelConfigService.toggle.mockResolvedValue({ enabled: true });
    const res = mockRes();
    const req = mockReq({ params: { modelKey: 'gpt-4' }, validated: { enabled: true } });
    await toggle(req, res);
    expect(modelConfigService.toggle).toHaveBeenCalledWith('gpt-4', true);
  });
});

describe('modelConfigController — 日志/状态', () => {
  it('callLogs 默认7天', async () => {
    modelConfigService.getCallLogs.mockResolvedValue({ rows: [] });
    const res = mockRes();
    await callLogs(mockReq(), res);
    const call = modelConfigService.getCallLogs.mock.calls[0][0];
    expect(call.days).toBe(7);
    expect(call.limit).toBe(50);
  });

  it('callLogs 自定义过滤', async () => {
    modelConfigService.getCallLogs.mockResolvedValue({ rows: [] });
    const res = mockRes();
    await callLogs(mockReq({ query: { modelKey: 'gpt-4', days: '30' } }), res);
    const call = modelConfigService.getCallLogs.mock.calls[0][0];
    expect(call.modelKey).toBe('gpt-4');
    expect(call.days).toBe(30);
  });

  it('callStats 单模型统计', async () => {
    modelConfigService.getCallStats.mockResolvedValue({ total: 100 });
    const res = mockRes();
    await callStats(mockReq({ params: { modelKey: 'gpt-4' }, query: { days: '14' } }), res);
    expect(modelConfigService.getCallStats).toHaveBeenCalledWith('gpt-4', 14);
  });

  it('getModelStatus 返回路由状态', async () => {
    modelRouterService.getModelStatus.mockResolvedValue([{ model: 'gpt-4', healthy: true }]);
    const res = mockRes();
    await getModelStatus(mockReq(), res);
    expect(res._jsonBody.data).toHaveLength(1);
  });

  it('resetBreaker 重置熔断器', async () => {
    modelRouterService.resetBreaker.mockReturnValue({ reset: true });
    const res = mockRes();
    await resetBreaker(mockReq({ validated: { model_id: 'gpt-4' } }), res);
    expect(modelRouterService.resetBreaker).toHaveBeenCalledWith('gpt-4');
  });
});
