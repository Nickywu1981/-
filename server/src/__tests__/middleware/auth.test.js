import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken', () => ({ default: { verify: vi.fn(), sign: vi.fn() } }));
vi.mock('../../config/index.js', () => ({
  jwtSecret: 'test-secret',
  jwtConfig: { secret: 'test-secret' },
  jwtRefreshSecret: 'test-refresh-secret',
  isDevelopment: true,
  isProduction: false,
}));
vi.mock('../../utils/jwtToken.js', () => ({
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  generateTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeAccessToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
}));
vi.mock('../../utils/response.js', () => ({
  error: vi.fn((res, code, msg) => {
    res.status(code);
    return res.json({ code, msg, data: null });
  }),
}));
vi.mock('../../constants/errorCode.js', () => ({
  ERROR_CODE: {
    UNAUTHORIZED: 401,
    EC_AUTH_002: 4007,
    EC_AUTH_003: 4010,
    EC_AUTH_004: 4011,
    EC_AUTH_005: 4012,
    EC_AUTH_006: 4013,
    EC_AUTH_007: 4014,
    EC_AUTH_008: 4015,
    EC_AUTH_009: 4016,
    EC_AUTH_010: 4017,
    FORBIDDEN: 403,
  },
}));
vi.mock('../../utils/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { authMiddleware, optionalAuth } from '../../middleware/auth.js';

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, path: '/api/some-protected-route' };
    res = mockRes();
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('无 header 返回 EC_AUTH_009', async () => {
    await authMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 4016 }));
  });

  it('非 Bearer header 返回 EC_AUTH_009', async () => {
    req.headers.authorization = 'Basic xxx';
    await authMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 4016 }));
  });

  it('有效 token 设置 req.user', async () => {
    req.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ userId: 1, username: 'test' });
    await authMiddleware(req, res, next);
    expect(req.user).toMatchObject({ id: 1 });
    expect(req.user.role).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('过期/无效 token 返回 EC_AUTH_009', async () => {
    req.headers.authorization = 'Bearer bad_token';
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
    await authMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 4016 }));
  });
});

// 公开路径 — 直接放行
describe('authMiddleware — public paths', () => {
  let req, res, next;

  beforeEach(() => {
    res = mockRes();
    next = vi.fn();
  });

  it('/api/auth/login 跳过认证', async () => {
    req = { headers: {}, path: '/api/auth/login' };
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('optionalAuth', () => {
  let req, next;

  beforeEach(() => {
    req = { headers: {} };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('无 header 继续执行不设 user', async () => {
    await optionalAuth(req, undefined, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('有效 token 附加 user', async () => {
    req.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ userId: 2 });
    await optionalAuth(req, undefined, next);
    expect(req.user).toEqual({ userId: 2 });
    expect(next).toHaveBeenCalled();
  });

  it('无效 token 不阻塞', async () => {
    req.headers.authorization = 'Bearer bad';
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    await optionalAuth(req, undefined, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
