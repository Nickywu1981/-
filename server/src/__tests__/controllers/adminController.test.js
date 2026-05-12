import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn(), getPool: vi.fn() } }));
vi.mock('../../services/commerceService.js');
vi.mock('../../services/creditService.js');
vi.mock('../../services/sensitiveWordService.js');
vi.mock('../../services/logService.js');
vi.mock('../../services/notificationService.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../config/index.js', () => ({
  jwtSecret: 'test-secret', jwtExpiresIn: '7d',
  jwtConfig: { secret: 'test-secret', accessExpiresIn: '15m', refreshExpiresIn: '7d' },
  jwtRefreshSecret: 'test-refresh-secret',
  isDevelopment: true, isProduction: false,
  logConfig: { level: 'info', sampleRate: 1.0, slowQueryMs: 1000 },
}));
vi.mock('../../utils/sqlGuard.js', () => ({ guardSQL: vi.fn((v) => v) }));

import * as commerce from '../../services/commerceService.js';
import * as credit from '../../services/creditService.js';
import * as sensitiveWord from '../../services/sensitiveWordService.js';
import * as logService from '../../services/logService.js';
import {
  updateUserStatus, batchUpdateUserStatus, listAllUsers, listAllTasks, listAllPlans, listAllOrders,
  checkContentRisk, addSensitiveWord, deleteSensitiveWord,
  retryTask, pauseTask, resumeTask, cancelTask, approveTask, rejectTask,
  refundCredit, listCreditRecords, listAiCallLogs, getAiCallStats,
  getDashboardStats, getOperationLogs, updatePlan, listSensitiveWords,
} from '../../controller/adminController.js';

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1, tenantId: 't1' }, path: '/api/admin/test', method: 'POST', ...overrides };
}
function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { this._jsonBody = body; return this; });
  res.status = vi.fn(function (code) { this.statusCode = code; return this; });
  res.setHeader = vi.fn();
  res.headersSent = false;
  return res;
}

describe('adminController — 用户管理', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updateUserStatus: status=0 成功', async () => {
    commerce.updateUserStatus.mockResolvedValue();
    const res = mockRes();
    await updateUserStatus(mockReq({ params: { userId: '1' }, body: { status: 0 } }), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.msg).toBe('用户状态已更新');
  });

  it('updateUserStatus: status=1 成功', async () => {
    commerce.updateUserStatus.mockResolvedValue();
    const res = mockRes();
    await updateUserStatus(mockReq({ params: { userId: '1' }, body: { status: 1 } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('batchUpdateUserStatus: ids 空数组报错', async () => {
    const res = mockRes();
    await batchUpdateUserStatus(mockReq({ body: { ids: [], status: 0 } }), res);
    expect(res._jsonBody.code).toBe(4202);
    expect(res._jsonBody.msg).toContain('ids');
  });

  it('batchUpdateUserStatus: 非法 status 报错', async () => {
    const res = mockRes();
    await batchUpdateUserStatus(mockReq({ body: { ids: [1], status: 99 } }), res);
    expect(res._jsonBody.code).toBe(4202);
    expect(res._jsonBody.msg).toContain('状态值无效');
  });

  it('batchUpdateUserStatus: 正常批量操作', async () => {
    commerce.batchUpdateUserStatus.mockResolvedValue({ affected: 3 });
    const res = mockRes();
    await batchUpdateUserStatus(mockReq({ body: { ids: [1, 2, 3], status: 1 } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('listAllUsers: 分页参数正常返回', async () => {
    commerce.listAllUsers.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const res = mockRes();
    await listAllUsers(mockReq({ query: { page: '2', pageSize: '20' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });
});

describe('adminController — 任务操作', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('retryTask 成功', async () => {
    commerce.retryTask.mockResolvedValue();
    const res = mockRes();
    await retryTask(mockReq({ params: { taskId: '42' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('pauseTask 成功', async () => {
    commerce.pauseTask.mockResolvedValue();
    const res = mockRes();
    await pauseTask(mockReq({ params: { taskId: '42' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('cancelTask 成功', async () => {
    commerce.cancelTask.mockResolvedValue();
    const res = mockRes();
    await cancelTask(mockReq({ params: { taskId: '42' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('approveTask 成功', async () => {
    commerce.approveTask.mockResolvedValue();
    const res = mockRes();
    await approveTask(mockReq({ params: { taskId: '42' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('rejectTask 成功', async () => {
    commerce.rejectTask.mockResolvedValue();
    const res = mockRes();
    await rejectTask(mockReq({ params: { taskId: '42' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });
});

describe('adminController — 风控', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('checkContentRisk: content 缺失报错', async () => {
    const res = mockRes();
    await checkContentRisk(mockReq({ body: { type: 'text' } }), res);
    expect(res._jsonBody.code).toBe(4201);
  });

  it('checkContentRisk: type 缺失报错', async () => {
    const res = mockRes();
    await checkContentRisk(mockReq({ body: { content: 'hello' } }), res);
    expect(res._jsonBody.code).toBe(4201);
  });

  it('checkContentRisk: 正常检测通过', async () => {
    commerce.containsBannedKeywords.mockReturnValue(false);
    const res = mockRes();
    await checkContentRisk(mockReq({ body: { content: 'hello', type: 'text' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('addSensitiveWord: word 缺失报错', async () => {
    const res = mockRes();
    await addSensitiveWord(mockReq({ body: {} }), res);
    expect(res._jsonBody.code).toBe(4201);
    expect(res._jsonBody.msg).toContain('敏感词');
  });

  it('listSensitiveWords: 正常返回', async () => {
    sensitiveWord.listSensitiveWords.mockResolvedValue([]);
    const res = mockRes();
    await listSensitiveWords(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
  });
});

describe('adminController — 积分与日志', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('refundCredit: recordId 缺失报错', async () => {
    const res = mockRes();
    await refundCredit(mockReq({ body: {} }), res);
    expect(res._jsonBody.code).toBe(4201);
    expect(res._jsonBody.msg).toContain('记录ID');
  });

  it('listAiCallLogs: 正常分页返回', async () => {
    logService.listAiCallLogs.mockResolvedValue({ list: [], total: 0 });
    const res = mockRes();
    await listAiCallLogs(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
  });
});

describe('adminController — 看板', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getDashboardStats: 正常返回', async () => {
    commerce.getDashboardStats.mockResolvedValue({ users: 100, orders: 50 });
    const res = mockRes();
    await getDashboardStats(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
  });
});
