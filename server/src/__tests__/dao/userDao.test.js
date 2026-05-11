import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute, query: mockQuery } }));

import * as userDao from '../../dao/userDao.js';

describe('userDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('insertUser 返回 insertId', async () => {
    mockExecute.mockResolvedValue([{ insertId: 99 }]);
    const id = await userDao.insertUser({ username: 'u1', password: 'p1', nickname: 'n1' });
    expect(id).toBe(99);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user'),
      ['u1', 'p1', 'n1', 0],
    );
  });

  it('findByUsername 找到返回 user 行', async () => {
    mockExecute.mockResolvedValue([[{ id: 1, username: 'u1' }]]);
    const r = await userDao.findByUsername('u1');
    expect(r).toEqual({ id: 1, username: 'u1' });
  });

  it('findByUsername 未找到返回 null', async () => {
    mockExecute.mockResolvedValue([[]]);
    const r = await userDao.findByUsername('nobody');
    expect(r).toBeNull();
  });

  it('countUsers 无关键词', async () => {
    mockExecute.mockResolvedValue([[{ total: 42 }]]);
    expect(await userDao.countUsers()).toBe(42);
  });

  it('countUsers 带关键词', async () => {
    mockExecute.mockResolvedValue([[{ total: 3 }]]);
    expect(await userDao.countUsers('test')).toBe(3);
  });

  it('listUsers 带分页', async () => {
    mockExecute.mockResolvedValue([[{ id: 1 }, { id: 2 }]]);
    const rows = await userDao.listUsers({ page: 1, pageSize: 10, offset: 0, sort: 'id', order: 'DESC' });
    expect(rows).toHaveLength(2);
  });

  it('updateLastLogin 执行 SQL', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    const affected = await userDao.updateLastLogin(5);
    expect(affected).toBe(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user SET last_login_time'),
      [5],
    );
  });
});
