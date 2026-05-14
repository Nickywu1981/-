import { vi, describe, it, expect } from 'vitest';

vi.mock('../../dao/templateMarketDao.js');
vi.mock('../../utils/response.js', () => ({ success: (res, data) => ({ code: 0, data }) }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(c, m) { super(m); this.code = c; } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: { NOT_FOUND: 'NOT_FOUND', PAYMENT_REQUIRED: 'PAYMENT_REQUIRED' } }));

const dao = (await import('../../dao/templateMarketDao.js')).default;

import * as ctrl from '../../controller/templateMarketController.js';

describe('templateMarketController', () => {
  const res = {};

  it('search', async () => {
    dao.search = vi.fn().mockResolvedValue({ list: [], total: 0 });
    const r = await ctrl.search({ query: { category: '电商' } }, res);
    expect(r.code).toBe(0);
  });

  it('detail exists', async () => {
    dao.getById = vi.fn().mockResolvedValue({ id: 1, title: '模板1' });
    const r = await ctrl.detail({ params: { id: '1' } }, res);
    expect(r.code).toBe(0);
  });

  it('detail not found', async () => {
    dao.getById = vi.fn().mockResolvedValue(null);
    await expect(ctrl.detail({ params: { id: '999' } }, res)).rejects.toThrow();
  });

  it('download free template', async () => {
    dao.getById = vi.fn().mockResolvedValue({ id: 1, price: 0 });
    dao.recordDownload = vi.fn().mockResolvedValue(true);
    const r = await ctrl.download({ params: { id: '1' }, userId: 'u1' }, res);
    expect(r.code).toBe(0);
  });

  it('download paid template not purchased', async () => {
    dao.getById = vi.fn().mockResolvedValue({ id: 1, price: 99 });
    dao.hasPurchased = vi.fn().mockResolvedValue(false);
    await expect(ctrl.download({ params: { id: '1' }, userId: 'u1' }, res)).rejects.toThrow();
  });

  it('download paid template purchased', async () => {
    dao.getById = vi.fn().mockResolvedValue({ id: 1, price: 99 });
    dao.hasPurchased = vi.fn().mockResolvedValue(true);
    dao.recordDownload = vi.fn().mockResolvedValue(true);
    const r = await ctrl.download({ params: { id: '1' }, userId: 'u1' }, res);
    expect(r.code).toBe(0);
  });
});
