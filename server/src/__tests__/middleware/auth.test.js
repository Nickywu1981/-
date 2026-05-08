import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken', () => ({ default: { verify: vi.fn(), sign: vi.fn() } }));
vi.mock('../../config/index.js', () => ({ jwtSecret: 'test-secret' }));

import { authMiddleware, optionalAuth } from '../../middleware/auth.js';

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = mockRes();
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('无 header 返回 401', () => {
    authMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
  });

  it('非 Bearer header 返回 401', () => {
    req.headers.authorization = 'Basic xxx';
    authMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
  });

  it('有效 token 设置 req.user', () => {
    req.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ userId: 1, username: 'test' });
    authMiddleware(req, res, next);
    expect(req.user).toEqual({ userId: 1, username: 'test' });
    expect(next).toHaveBeenCalled();
  });

  it('过期/无效 token 返回 401', () => {
    req.headers.authorization = 'Bearer bad_token';
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
    authMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
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

  it('无 header 继续执行不设 user', () => {
    optionalAuth(req, undefined, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('有效 token 附加 user', () => {
    req.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ userId: 2 });
    optionalAuth(req, undefined, next);
    expect(req.user).toEqual({ userId: 2 });
    expect(next).toHaveBeenCalled();
  });

  it('无效 token 不阻塞', () => {
    req.headers.authorization = 'Bearer bad';
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    optionalAuth(req, undefined, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
