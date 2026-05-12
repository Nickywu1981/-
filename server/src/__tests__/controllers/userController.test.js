import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn(), getPool: vi.fn() } }));
vi.mock('../../services/userService.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../config/index.js', () => ({
  jwtSecret: 'test-secret', jwtExpiresIn: '7d',
  jwtConfig: { secret: 'test-secret', accessExpiresIn: '15m', refreshExpiresIn: '7d' },
  jwtRefreshSecret: 'test-refresh-secret',
  isDevelopment: true, isProduction: false,
  logConfig: { level: 'info', sampleRate: 1.0, slowQueryMs: 1000 },
}));
vi.mock('../../utils/sqlGuard.js', () => ({ guardSQL: vi.fn((v) => v) }));

import * as userService from '../../services/userService.js';
import { register, login, profile, updateProfile, changePassword, forgotPassword, logout, refreshToken, logoutAll } from '../../controller/userController.js';

function mockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 1, username: 'u1', role: 'user' },
    headers: {},
    path: '/api/test',
    method: 'POST',
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.json = vi.fn(function (body) { this._jsonBody = body; return this; });
  res.status = vi.fn(function (code) { this.statusCode = code; return this; });
  res.setHeader = vi.fn();
  return res;
}

describe('userController (Auth)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── register ───
  describe('register', () => {
    it('缺少 username 抛参数错误', async () => {
      const req = mockReq({ body: { password: '123456' } });
      const res = mockRes();
      await register(req, res);
      expect(res._jsonBody.code).toBe(400);
      expect(res._jsonBody.msg).toMatch(/用户名/);
    });

    it('密码不足 6 位抛错误', async () => {
      const req = mockReq({ body: { username: 'u1', password: '123' } });
      const res = mockRes();
      await register(req, res);
      expect(res._jsonBody.code).toBe(400);
      expect(res._jsonBody.msg).toMatch(/6/);
    });

    it('注册成功返回 200 + 用户信息', async () => {
      userService.register.mockResolvedValue({ id: 5, username: 'u1', nickname: 'n1' });
      const req = mockReq({ body: { username: 'u1', password: '123456', nickname: 'n1' } });
      const res = mockRes();
      await register(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.msg).toMatch(/注册/);
      expect(res._jsonBody.data.id).toBe(5);
    });
  });

  // ─── login ───
  describe('login', () => {
    it('缺少账号抛参数错误', async () => {
      const req = mockReq({ body: { password: '123456' } });
      const res = mockRes();
      await login(req, res);
      expect(res._jsonBody.code).toBe(400);
    });

    it('登录成功返回 token', async () => {
      userService.login.mockResolvedValue({ token: 'jwt-token', refreshToken: 'rt', user: { id: 1, username: 'u1' } });
      const req = mockReq({ body: { username: 'u1', password: '123456' } });
      const res = mockRes();
      await login(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.token).toBe('jwt-token');
    });
  });

  // ─── profile ───
  describe('profile', () => {
    it('返回当前用户信息', async () => {
      userService.getProfile.mockResolvedValue({ id: 1, username: 'u1', nickname: 'n1' });
      const req = mockReq();
      const res = mockRes();
      await profile(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.username).toBe('u1');
    });
  });

  // ─── updateProfile ───
  describe('updateProfile', () => {
    it('修改昵称成功', async () => {
      userService.updateProfile.mockResolvedValue({ id: 1, nickname: 'new' });
      const req = mockReq({ body: { nickname: 'new' } });
      const res = mockRes();
      await updateProfile(req, res);
      expect(userService.updateProfile).toHaveBeenCalledWith(1, { nickname: 'new', phone: undefined, email: undefined, avatar: undefined });
      expect(res._jsonBody.msg).toMatch(/修改/);
    });
  });

  // ─── changePassword ───
  describe('changePassword', () => {
    it('修改密码成功', async () => {
      userService.changePassword.mockResolvedValue(undefined);
      const req = mockReq({ body: { oldPassword: 'old', newPassword: 'new123456' } });
      const res = mockRes();
      await changePassword(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── forgotPassword ───
  describe('forgotPassword', () => {
    it('缺少用户名抛参数错误', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      await forgotPassword(req, res);
      expect(res._jsonBody.code).toBe(400);
    });

    it('发送重置邮件/短信', async () => {
      userService.forgotPassword.mockResolvedValue({ message: '已发送' });
      const req = mockReq({ body: { username: 'u1' } });
      const res = mockRes();
      await forgotPassword(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── logout ───
  describe('logout', () => {
    it('无 token 直接返回成功', async () => {
      const req = mockReq({ headers: {}, cookies: {} });
      const res = mockRes();
      await logout(req, res);
      expect(res._jsonBody.code).toBe(200);
    });

    it('有 Bearer token 调用撤销', async () => {
      userService.revokeAccessToken.mockResolvedValue(undefined);
      userService.revokeRefreshToken.mockResolvedValue(undefined);
      const req = mockReq({
        headers: { authorization: 'Bearer test-token' },
        cookies: { refreshToken: 'rt' },
      });
      const res = mockRes();
      res.clearCookie = vi.fn();
      await logout(req, res);
      expect(userService.revokeAccessToken).toHaveBeenCalledWith('test-token');
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── refreshToken ───
  describe('refreshToken', () => {
    it('缺少 refreshToken 抛参数错误', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      await refreshToken(req, res);
      expect(res._jsonBody.code).toBe(400);
    });

    it('刷新 token 成功', async () => {
      userService.refreshAccessToken.mockResolvedValue({ token: 'new-token', refreshToken: 'new-rt' });
      const req = mockReq({ body: { refreshToken: 'old-rt' } });
      const res = mockRes();
      await refreshToken(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.token).toBe('new-token');
    });
  });

  // ─── logoutAll ───
  describe('logoutAll', () => {
    it('全部设备下线', async () => {
      userService.revokeAllUserTokens.mockResolvedValue(undefined);
      const req = mockReq();
      const res = mockRes();
      await logoutAll(req, res);
      expect(userService.revokeAllUserTokens).toHaveBeenCalledWith(1);
      expect(res._jsonBody.code).toBe(200);
    });
  });
});
