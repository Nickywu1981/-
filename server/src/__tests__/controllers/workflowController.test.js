import { describe, it, expect, vi } from 'vitest';

const { mockDao } = vi.hoisted(() => ({
  mockDao: {
    listTemplates: vi.fn(), getTemplate: vi.fn(), createTemplate: vi.fn(),
    updateTemplate: vi.fn(), deleteTemplate: vi.fn(),
    createJob: vi.fn(), updateJobStatus: vi.fn(), getJob: vi.fn(),
    listJobsByUser: vi.fn(), cancelJob: vi.fn(),
  },
}));

vi.mock('../../dao/workflowDao.js', () => mockDao);
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({
  success: (res, data, msg) => ({ code: 200, data, message: msg }),
  listResult: (res, result) => ({ code: 200, data: { list: result.list, total: result.total, page: result.page, pageSize: result.pageSize } }),
}));

import * as ctrl from '../../controller/workflowController.js';

function mockRes() { return {}; }

describe('workflowController', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listTemplates returns list', async () => {
    mockDao.listTemplates.mockResolvedValue([{ id: 1, name: 'A', steps: '[]' }]);
    const result = await ctrl.listTemplates({ query: {} }, mockRes());
    expect(result.code).toBe(200);
    expect(result.data).toHaveLength(1);
  });

  it('getTemplate returns 404 when missing', async () => {
    mockDao.getTemplate.mockResolvedValue(null);
    const result = await ctrl.getTemplate({ params: { id: '999' } }, mockRes());
    expect(result.data).toBeNull();
  });

  it('getTemplate returns template', async () => {
    mockDao.getTemplate.mockResolvedValue({ id: 1, name: '电商', steps: '[]' });
    const result = await ctrl.getTemplate({ params: { id: '1' } }, mockRes());
    expect(result.data.name).toBe('电商');
  });

  it('createTemplate returns id', async () => {
    mockDao.createTemplate.mockResolvedValue(3);
    const result = await ctrl.createTemplate({ body: { name: '新', steps: [] }, user: { id: 1 } }, mockRes());
    expect(result.data.id).toBe(3);
  });

  it('updateTemplate fails gracefully', async () => {
    mockDao.updateTemplate.mockResolvedValue(false);
    const result = await ctrl.updateTemplate({ params: { id: '999' }, body: {} }, mockRes());
    expect(result.data).toBeNull();
  });

  it('updateTemplate succeeds', async () => {
    mockDao.updateTemplate.mockResolvedValue(true);
    const result = await ctrl.updateTemplate({ params: { id: '1' }, body: { name: '改名' } }, mockRes());
    expect(result.message).toBe('模板已更新');
  });

  it('deleteTemplate succeeds', async () => {
    mockDao.deleteTemplate.mockResolvedValue(true);
    const result = await ctrl.deleteTemplate({ params: { id: '1' } }, mockRes());
    expect(result.message).toBe('模板已删除');
  });

  it('execute starts workflow', async () => {
    mockDao.getTemplate.mockResolvedValue({ id: 1, name: '电商', steps: [], status: 'published' });
    mockDao.createJob.mockResolvedValue(7);
    const result = await ctrl.execute({ body: { templateId: 1, inputData: {} }, user: { id: 1 } }, mockRes());
    expect(result.data.jobId).toBe(7);
  });

  it('getJob returns job', async () => {
    mockDao.getJob.mockResolvedValue({ id: 7, status: 'running', step_results: null, input_data: null, output_data: null });
    const result = await ctrl.getJob({ params: { id: '7' } }, mockRes());
    expect(result.data.status).toBe('running');
  });

  it('getJob returns null for missing job', async () => {
    mockDao.getJob.mockResolvedValue(null);
    const result = await ctrl.getJob({ params: { id: '999' } }, mockRes());
    expect(result.data).toBeNull();
  });

  it('listMyJobs paginates', async () => {
    mockDao.listJobsByUser.mockResolvedValue({ list: [{ id: 1 }], total: 1, page: 1, pageSize: 20 });
    const result = await ctrl.listMyJobs({ query: { page: '1', pageSize: '20' }, user: { id: 1 } }, mockRes());
    expect(result.data.list).toHaveLength(1);
    expect(result.data.total).toBe(1);
  });

  it('cancelJob succeeds', async () => {
    mockDao.getJob.mockResolvedValue({ id: 7, status: 'running' });
    mockDao.cancelJob.mockResolvedValue(true);
    const result = await ctrl.cancelJob({ params: { id: '7' } }, mockRes());
    expect(result.message).toBe('作业已取消');
  });

  it('cancelJob rejects completed job', async () => {
    mockDao.getJob.mockResolvedValue({ id: 7, status: 'completed' });
    await expect(ctrl.cancelJob({ params: { id: '7' } }, mockRes())).rejects.toThrow();
  });
});
