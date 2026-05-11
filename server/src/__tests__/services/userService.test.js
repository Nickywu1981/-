import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/userDao.js');
vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn().mockResolvedValue(true) } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn().mockReturnValue('fake-token'), verify: vi.fn() } }));
vi.mock('../../config/index.js', () => ({ jwtSecret: 'test-secret', jwtExpiresIn: '7d', jwtConfig: { secret: 'test-secret' } }));
vi.mock('../../utils/sqlGuard.js', () => ({ guardSQL: vi.fn() }));

import * as userService from '../../services/userService.js';
import * as userDao from '../../dao/userDao.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('userService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('register', () => {
    it('用户名已存在抛出错误', async () => {
      userDao.findByUsername.mockResolvedValue({ id: 1, username: 'u1' });
      await expect(userService.register({ username: 'u1', password: 'p1', nickname: 'n1' }))
        .rejects.toThrow('用户名已存在');
    });

    it('成功注册返回用户信息', async () => {
      userDao.findByUsername.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_pw');
      userDao.insertUser.mockResolvedValue(5);
      const r = await userService.register({ username: 'u1', password: 'p1', nickname: 'n1' });
      expect(r.id).toBe(5);
      expect(r.username).toBe('u1');
    });
  });

  describe('login', () => {
    it('用户不存在抛出错误', async () => {
      userDao.findByUsername.mockResolvedValue(null);
      await expect(userService.login({ username: 'u1', password: 'p1' }))
        .rejects.toThrow('用户名或密码错误');
    });

    it('账号被禁用抛出错误', async () => {
      userDao.findByUsername.mockResolvedValue({ id: 1, username: 'u1', password: 'hash', status: 0 });
      bcrypt.compare.mockResolvedValue(true);
      await expect(userService.login({ username: 'u1', password: 'p1' }))
        .rejects.toThrow('账号已被禁用');
    });

    it('密码错误抛出错误', async () => {
      userDao.findByUsername.mockResolvedValue({ id: 1, username: 'u1', password: 'hash', status: 1 });
      bcrypt.compare.mockResolvedValue(false);
      await expect(userService.login({ username: 'u1', password: 'wrong' }))
        .rejects.toThrow('用户名或密码错误');
    });

    it('登录成功返回 token 和用户', async () => {
      userDao.findByUsername.mockResolvedValue({ id: 1, username: 'u1', password: 'hash', status: 1, nickname: 'n1', phone: null, email: null, avatar: null, role: 'user', tenant_id: 0 });
      bcrypt.compare.mockResolvedValue(true);
      userDao.updateLastLogin.mockResolvedValue(undefined);
      jwt.sign.mockReturnValue('fake-token');
      const r = await userService.login({ username: 'u1', password: 'p1' });
      expect(r.accessToken).toBe('fake-token');
      expect(r.user.username).toBe('u1');
      expect(userDao.updateLastLogin).toHaveBeenCalledWith(1);
    });
  });

  describe('getProfile', () => {
    it('用户不存在抛出 404', async () => {
      userDao.findById.mockResolvedValue(null);
      await expect(userService.getProfile(99)).rejects.toThrow('用户不存在');
    });

    it('返回用户信息', async () => {
      userDao.findById.mockResolvedValue({ id: 1, username: 'u1' });
      const r = await userService.getProfile(1);
      expect(r.username).toBe('u1');
    });
  });
});
