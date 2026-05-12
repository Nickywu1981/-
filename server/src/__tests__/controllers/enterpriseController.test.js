import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../utils/jwtToken.js');
vi.mock('../../services/enterpriseService.js');
vi.mock('../../dao/auditLogDao.js', () => ({ insert: vi.fn(() => Promise.resolve()) }));
vi.mock('../../constants/errorCode.js', () => ({
  ERROR_CODE: Object.freeze({ BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404, INTERNAL_ERROR: 500 }),
}));

import * as enterpriseService from '../../services/enterpriseService.js';
import { revokeAllUserTokens } from '../../utils/jwtToken.js';
import {
  registerEnterprise, loginEnterprise, logoutEnterprise,
  getProfile, updateProfile,
  listUsers, addUser, updateUser, removeUser,
  getDashboard, getUsage,
  getWhiteLabel, updateWhiteLabel,
  listPlans,
} from '../../controller/enterpriseController.js';

// mockRes: res.json / res.status store the body so tests can inspect
function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { res._jsonBody = body; return res; });
  res.status = vi.fn(function (code) { return res; });
  res.setHeader = vi.fn();
  res.cookie = vi.fn(function () { return res; });
  res.clearCookie = vi.fn(function () { return res; });
  return res;
}
function mockReq(overrides = {}) {
  return {
    body: {}, params: {}, query: {}, ip: '127.0.0.1',
    user: { id: 1, userId: 1, tenantId: 't1' },
    tenantId: 't1',
    validated: null,
    path: '/api/enterprise/test', method: 'POST',
    ...overrides,
  };
}

describe('enterpriseController', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('注册企业', async () => {
    enterpriseService.registerEnterprise.mockResolvedValue({ tenantId: 10, name: 'TestCo' });
    const res = mockRes();
    await registerEnterprise(mockReq({ body: { name: 'TestCo', phone: '13800138000', password: '123456' } }), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.msg).toBe('企业入驻成功');
    expect(res._jsonBody.data.tenantId).toBe(10);
  });

  it('登录成功设置 cookie', async () => {
    enterpriseService.loginEnterprise.mockResolvedValue({ tenantId: 10, accessToken: 'at', refreshToken: 'rt' });
    const res = mockRes();
    await loginEnterprise(mockReq({ body: { account: '13800138000', password: '123456' } }), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('退出登录清除 cookie', async () => {
    revokeAllUserTokens.mockResolvedValue();
    const res = mockRes();
    await logoutEnterprise(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  it('获取企业信息', async () => {
    enterpriseService.getEnterpriseProfile.mockResolvedValue({ name: 'TestCo', id: 10 });
    const res = mockRes();
    await getProfile(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.data.name).toBe('TestCo');
  });

  it('缺少 tenantId 时 403', async () => {
    const res = mockRes();
    await getProfile(mockReq({ tenantId: null, user: {} }), res);
    expect(res._jsonBody.code).toBe(403);
  });

  it('更新企业信息', async () => {
    enterpriseService.updateEnterpriseProfile.mockResolvedValue({ name: 'Updated' });
    const res = mockRes();
    await updateProfile(mockReq({ body: { name: 'Updated' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('分页查询子账号', async () => {
    enterpriseService.listEnterpriseUsers.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 });
    const res = mockRes();
    await listUsers(mockReq({ query: { page: '1', pageSize: '10' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('pageSize 上限 100', async () => {
    enterpriseService.listEnterpriseUsers.mockResolvedValue({ list: [], total: 0 });
    const res = mockRes();
    await listUsers(mockReq({ query: { pageSize: '999' } }), res);
    expect(enterpriseService.listEnterpriseUsers.mock.calls[0][1].pageSize).toBe(100);
  });

  it('创建子账号', async () => {
    enterpriseService.addEnterpriseUser.mockResolvedValue(42);
    const res = mockRes();
    await addUser(mockReq({ body: { phone: '13900001111', password: 'pwd', role: 'editor' } }), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.data.id).toBe(42);
  });

  it('更新子账号', async () => {
    enterpriseService.updateEnterpriseUser.mockResolvedValue();
    const res = mockRes();
    await updateUser(mockReq({ params: { id: '5' }, body: { role: 'admin' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('无效 ID 时 400', async () => {
    const res = mockRes();
    await updateUser(mockReq({ params: { id: '-1' } }), res);
    expect(res._jsonBody.code).toBe(400);
  });

  it('移除子账号', async () => {
    enterpriseService.removeEnterpriseUser.mockResolvedValue();
    const res = mockRes();
    await removeUser(mockReq({ params: { id: '3' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('仪表盘数据', async () => {
    enterpriseService.getEnterpriseDashboard.mockResolvedValue({ users: 10, revenue: 5000 });
    const res = mockRes();
    await getDashboard(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.data.users).toBe(10);
  });

  it('用量明细', async () => {
    enterpriseService.getEnterpriseUsageDetail.mockResolvedValue({ list: [], total: 0 });
    const res = mockRes();
    await getUsage(mockReq({ query: { startDate: '2026-01-01' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('白标配置', async () => {
    enterpriseService.getWhiteLabel.mockResolvedValue({ logo: 'url', primaryColor: '#333' });
    const res = mockRes();
    await getWhiteLabel(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.data.primaryColor).toBe('#333');
  });

  it('更新白标', async () => {
    enterpriseService.updateWhiteLabel.mockResolvedValue({ logo: 'new-url' });
    const res = mockRes();
    await updateWhiteLabel(mockReq({ body: { logo: 'new-url' } }), res);
    expect(res._jsonBody.code).toBe(200);
  });

  it('套餐列表', async () => {
    enterpriseService.listEnterprisePlans.mockReturnValue([{ id: 1, name: 'Basic' }]);
    const res = mockRes();
    await listPlans(mockReq(), res);
    expect(res._jsonBody.code).toBe(200);
    expect(res._jsonBody.data).toEqual([{ id: 1, name: 'Basic' }]);
  });
});
