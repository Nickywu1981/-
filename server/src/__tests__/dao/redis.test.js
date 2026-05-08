import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockGet, mockSet, mockConnect, mockClient } = vi.hoisted(() => {
  const get = vi.fn();
  const set = vi.fn();
  const del = vi.fn();
  const connect = vi.fn();
  const client = { connect, get, set, del, on: vi.fn() };
  return { mockGet: get, mockSet: set, mockDel: del, mockConnect: connect, mockClient: client };
});

vi.mock('redis', () => ({ createClient: vi.fn(() => mockClient) }));
vi.mock('../../config/index.js', () => ({ redis: { host: 'localhost', port: 6379, password: '' } }));

import * as redisDao from '../../dao/redis.js';

describe('redis', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('cacheGet 命中返回解析 JSON', async () => {
    mockGet.mockResolvedValue('{"hello":"world"}');
    mockConnect.mockResolvedValue(undefined);
    const val = await redisDao.cacheGet('key1');
    expect(val).toEqual({ hello: 'world' });
  });

  it('cacheGet 未命中返回 null', async () => {
    mockGet.mockResolvedValue(null);
    mockConnect.mockResolvedValue(undefined);
    expect(await redisDao.cacheGet('miss')).toBeNull();
  });

  it('cacheSet 调用 SET EX', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockSet.mockResolvedValue('OK');
    await redisDao.cacheSet('k', { a: 1 }, 60);
    expect(mockSet).toHaveBeenCalledWith('k', '{"a":1}', { EX: 60 });
  });
});
