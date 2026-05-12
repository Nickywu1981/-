import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('jsonwebtoken', () => ({ default: { decode: vi.fn(() => ({ exp: Math.floor(Date.now()/1000) + 3600 })) } }));
vi.mock('../../middleware/auth.js', () => ({ generateRefreshToken: vi.fn(() => 'mock-refresh-token') }));
vi.mock('../../utils/jwtToken.js', () => ({ revokeAccessToken: vi.fn(), revokeRefreshToken: vi.fn() }));
vi.mock('../../services/auth.service.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../config/index.js', () => ({
  default: { jwt: {}, mysql: {}, redis: {} },
  isProduction: false, isDevelopment: true,
  jwtConfig: { secret: 'test', accessExpiresIn: '15m', refreshExpiresIn: '7d' },
  jwtRefreshSecret: 'test-refresh',
  db: { host: 'localhost', database: 'test', user: 'root' },
  redisConfig: { host: 'localhost', port: 6379 },
  logConfig: { level: 'info', sampleRate: 1.0, slowQueryMs: 1000 },
  corsOrigin: '*', mockEnabled: true,
  worker: {}, upload: {}, security: {}, bull: {}, appUrl: 'http://localhost:3000',
}));

import * as authService from '../../services/auth.service.js';
import {
  register, login, loginByCode, resetPassword, logout,
} from '../../controller/v4AuthController.js';

function mockRes() {
  const res = {
    _cookies: {},
    _clearedCookies: [],
    _headersSent: false,
    cookie(name, value, opts) { this._cookies[name] = { value, opts }; return this; },
    clearCookie(name, opts) { this._clearedCookies.push({ name, opts }); delete this._cookies[name]; return this; },
    setHeader: vi.fn(),
    json(d) { this._headersSent = true; return d; },
    status: vi.fn().mockReturnThis(),
    get headersSent() { return this._headersSent; },
  };
  return res;
}

describe('v4AuthController', () => {
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    res = mockRes();
  });

  describe('register', () => {
    it('注册成功返回用户信息 + set cookie', async () => {
      authService.register.mockResolvedValue({ user: { id: 1, phone: '13800138000' }, token: 't1', token_expires_in: 3600 });
      const req = { validated: { phone: '13800138000', password: 'Abc123456', invite_code: null } };
      const result = await register(req, res);
      expect(result.code).toBe(200);
      expect(result.msg).toBe('注册成功');
      expect(res._cookies.token).toBeTruthy();
      expect(res._cookies.refreshToken).toBeTruthy();
    });

    it('注册失败返回错误响应', async () => {
      authService.register.mockRejectedValue(new Error('手机号已注册'));
      const req = { validated: { phone: '13800138000', password: 'Abc123456', invite_code: null } };
      const result = await register(req, res);
      expect(result.code).toBe(500);
    });
  });

  describe('login', () => {
    it('登录成功', async () => {
      authService.login.mockResolvedValue({ user: { id: 1, phone: '13800138000' }, token: 't1', token_expires_in: 3600 });
      const result = await login({ validated: { username: 'user1', password: 'Abc123456' } }, res);
      expect(result.code).toBe(200);
      expect(result.msg).toBe('登录成功');
    });

    it('account 别名映射到 username', async () => {
      authService.login.mockResolvedValue({ user: { id: 1 }, token: 't1', token_expires_in: 3600 });
      await login({ validated: { account: 'user1', password: 'Abc123456' } }, res);
      expect(authService.login).toHaveBeenCalledWith(expect.objectContaining({ username: 'user1' }));
    });
  });

  describe('loginByCode', () => {
    it('验证码登录成功', async () => {
      authService.loginByCode.mockResolvedValue({ user: { id: 1 }, token: 't1', token_expires_in: 3600 });
      const result = await loginByCode({ validated: { phone: '13800138000', code: '123456' } }, res);
      expect(result.code).toBe(200);
    });

    it('未提供任何身份标识返回 BusinessError', async () => {
      const req = { validated: { code: '123456' } };
      const result = await loginByCode(req, res);
      expect(result.code).toBeGreaterThan(100);
    });
  });

  describe('resetPassword', () => {
    it('重置密码成功', async () => {
      authService.resetPassword.mockResolvedValue({ affected: 1 });
      const result = await resetPassword({ validated: { phone: '13800138000', new_password: 'NewAbc123', code: '123456' } }, res);
      expect(result.code).toBe(200);
    });

    it('重置失败返回错误响应', async () => {
      authService.resetPassword.mockRejectedValue(new Error('验证码错误'));
      const result = await resetPassword({ validated: { phone: '13800138000', new_password: 'NewAbc123', code: '111111' } }, res);
      expect(result.code).toBe(500);
    });
  });

  describe('logout', () => {
    it('退出成功清除 cookies', async () => {
      const req = { headers: { authorization: 'Bearer stale-token' }, cookies: { refreshToken: 'rt1' } };
      const result = await logout(req, res);
      expect(result.code).toBe(200);
      expect(res._clearedCookies.length).toBeGreaterThan(0);
    });

    it('无 token 时也能正常退出', async () => {
      const result = await logout({ headers: {}, cookies: {} }, res);
      expect(result.code).toBe(200);
    });
  });
});
