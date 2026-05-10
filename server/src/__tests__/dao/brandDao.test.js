import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute, query: mockQuery } }));

import * as brandDao from '../../dao/brandDao.js';

describe('brandDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getBrand 返回品牌设置', async () => {
    mockExecute.mockResolvedValue([[{ id: 1, logo_url: '/logo.png', brand_name: 'MyBrand' }]]);
    const r = await brandDao.getBrand(1);
    expect(r.brand_name).toBe('MyBrand');
  });

  it('getBrand 不存在返回 null', async () => {
    mockExecute.mockResolvedValue([[]]);
    expect(await brandDao.getBrand(99)).toBeNull();
  });

  it('upsertBrand 新品牌走 INSERT', async () => {
    // new code uses INSERT...ON DUPLICATE KEY UPDATE (1 call) + getBrand (1 call)
    mockExecute
      .mockResolvedValueOnce([])                              // INSERT...ON DUPLICATE KEY UPDATE
      .mockResolvedValueOnce([[{ id: 1, brand_name: 'New' }]]); // getBrand (after upsert)

    const r = await brandDao.upsertBrand(1, { brand_name: 'New', logo_url: '/a.png' });
    expect(r.brand_name).toBe('New');
  });

  it('upsertBrand 已有品牌走 UPDATE', async () => {
    mockExecute
      .mockResolvedValueOnce([])                                 // INSERT...ON DUPLICATE KEY UPDATE
      .mockResolvedValueOnce([[{ id: 1, brand_name: 'Updated' }]]); // getBrand (after upsert)

    const r = await brandDao.upsertBrand(1, { brand_name: 'Updated' });
    expect(r.brand_name).toBe('Updated');
  });
});
