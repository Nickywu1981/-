import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/publishService.js');

import * as publishService from '../../services/publishService.js';
import {
  getPublishPlatforms, submitPublish, getPublishBatch,
  retryPublish, listPublishHistory, getPublishStats,
} from '../../controller/v4PublishController.js';

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { res._jsonBody = body; return res; });
  res.setHeader = vi.fn();
  res.status = vi.fn(function () { return res; });
  return res;
}
function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1 }, validated: null, ...overrides };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('v4PublishController', () => {
  it('getPublishPlatforms 返回平台列表', async () => {
    publishService.getPublishPlatforms.mockReturnValue([{ id: 'taobao', name: '淘宝' }]);
    const res = mockRes();
    await getPublishPlatforms(mockReq(), res);
    expect(res._jsonBody.data).toHaveLength(1);
  });

  it('submitPublish 提交分发任务', async () => {
    publishService.submitPublish.mockResolvedValue({ batchId: 'b1' });
    const res = mockRes();
    const req = mockReq({
      validated: { workId: 'w1', platforms: ['taobao'], title: '商品', description: '', tags: [], scheduleAt: null },
    });
    await submitPublish(req, res);
    expect(publishService.submitPublish).toHaveBeenCalledWith(1, 'w1', ['taobao'], expect.any(Object));
  });

  it('getPublishBatch 查询批次', async () => {
    publishService.getPublishBatch.mockResolvedValue({ batchId: 'b1', status: 'done' });
    const res = mockRes();
    await getPublishBatch(mockReq({ params: { id: 'b1' } }), res);
    expect(publishService.getPublishBatch).toHaveBeenCalledWith('b1', 1);
  });

  it('retryPublish 重试分发', async () => {
    publishService.retryPublish.mockResolvedValue({ batchId: 'b1', status: 'retrying' });
    const res = mockRes();
    await retryPublish(mockReq({ params: { id: 'b1' } }), res);
    expect(publishService.retryPublish).toHaveBeenCalledWith('b1', 1);
  });

  it('listPublishHistory 分页查询', async () => {
    publishService.listPublishHistory.mockResolvedValue({ rows: [], total: 0 });
    const res = mockRes();
    const req = mockReq({ validated: { page: 1, pageSize: 20, status: 'done', platform: 'taobao' } });
    await listPublishHistory(req, res);
    expect(publishService.listPublishHistory).toHaveBeenCalledWith(1, { page: 1, pageSize: 20, status: 'done', platform: 'taobao' });
  });

  it('getPublishStats 统计数据', async () => {
    publishService.getPublishStats.mockResolvedValue({ totalBatches: 10, successRate: 0.9 });
    const res = mockRes();
    await getPublishStats(mockReq(), res);
    expect(res._jsonBody.data.successRate).toBe(0.9);
  });
});
