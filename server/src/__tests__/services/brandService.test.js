import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockGetBrand, mockUpsertBrand } = vi.hoisted(() => ({
  mockGetBrand: vi.fn(),
  mockUpsertBrand: vi.fn(),
}));
vi.mock('../../dao/brandDao.js', () => ({
  getBrand: mockGetBrand,
  upsertBrand: mockUpsertBrand,
}));

import * as brandService from '../../services/brandService.js';

describe('brandService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getBrandSettings', () => {
    it('有品牌设置时返回', async () => {
      mockGetBrand.mockResolvedValue({ brand_name: 'MyBrand', logo_url: '/a.png' });
      const r = await brandService.getBrandSettings(1);
      expect(r.brand_name).toBe('MyBrand');
    });

    it('无品牌设置返回默认值', async () => {
      mockGetBrand.mockResolvedValue(null);
      const r = await brandService.getBrandSettings(1);
      expect(r.brand_name).toBe('');
      expect(r.primary_color).toBe('#FF4400');
      expect(r.watermark_enabled).toBe(false);
    });
  });

  describe('saveBrandSettings', () => {
    it('无有效字段抛出错误', async () => {
      await expect(brandService.saveBrandSettings(1, { invalid: 1 })).rejects.toMatchObject({ status: 4201 });
    });

    it('过滤非法字段并调用 upsert', async () => {
      mockUpsertBrand.mockResolvedValue({ brand_name: 'New' });
      const r = await brandService.saveBrandSettings(1, { brand_name: 'New', invalid: 'x', logo_url: '/l.png' });
      expect(r.brand_name).toBe('New');
      expect(mockUpsertBrand).toHaveBeenCalledWith(1, { brand_name: 'New', logo_url: '/l.png' });
    });
  });
});
