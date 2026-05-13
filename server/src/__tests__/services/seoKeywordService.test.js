import { describe, it, expect } from 'vitest';

const {
  embedSEOKeywords,
  getPlatformKeywords,
  listSEOPlatforms,
  PLATFORM_KEYWORDS,
  PLATFORM_SEO_TRAITS,
} = await import('../../services/seoKeywordService.js');

describe('seoKeywordService', () => {
  describe('PLATFORM_KEYWORDS', () => {
    it('should have 13 platforms', () => {
      expect(Object.keys(PLATFORM_KEYWORDS)).toHaveLength(13);
    });

    it('each platform should have highVolume and longTail', () => {
      for (const [code, p] of Object.entries(PLATFORM_KEYWORDS)) {
        expect(Array.isArray(p.highVolume), `${code}.highVolume`).toBe(true);
        expect(Array.isArray(p.longTail), `${code}.longTail`).toBe(true);
        expect(p.highVolume.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PLATFORM_SEO_TRAITS', () => {
    it('should have traits for all 13 platforms', () => {
      expect(Object.keys(PLATFORM_SEO_TRAITS)).toHaveLength(13);
    });

    it('each trait should have minKeywords >= 2', () => {
      for (const [, t] of Object.entries(PLATFORM_SEO_TRAITS)) {
        expect(t.minKeywords).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('listSEOPlatforms()', () => {
    it('should return 13 platforms with name and code', () => {
      const list = listSEOPlatforms();
      expect(list).toHaveLength(13);
      expect(list.find(p => p.code === 'taobao').name).toBe('淘宝');
      expect(list.find(p => p.code === 'amazon').name).toBe('Amazon');
    });
  });

  describe('getPlatformKeywords()', () => {
    it('should return keywords for valid platform', () => {
      const kw = getPlatformKeywords('taobao');
      expect(kw.platform).toBe('淘宝');
      expect(kw.highVolume).toContain('2025新款');
      expect(kw.longTail).toContain('显瘦遮肉');
    });

    it('should throw for invalid platform', () => {
      expect(() => getPlatformKeywords('nonexistent')).toThrow('Unsupported platform: nonexistent');
    });
  });

  describe('embedSEOKeywords()', () => {
    it('should generate titles for taobao platform', async () => {
      const result = await embedSEOKeywords({
        productName: '蓝牙耳机',
        platformCode: 'taobao',
        category: '数码',
        count: 5,
      });
      expect(result.titles).toHaveLength(5);
      expect(result.platform).toBe('淘宝');
      expect(result.density).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
      // Each title must contain the product name
      for (const t of result.titles) {
        expect(t).toContain('蓝牙耳机');
      }
    });

    it('should generate titles for amazon platform', async () => {
      const result = await embedSEOKeywords({
        productName: 'Bluetooth Speaker',
        platformCode: 'amazon',
        category: 'electronics',
        count: 3,
      });
      expect(result.titles).toHaveLength(3);
      expect(result.platform).toBe('Amazon');
    });

    it('should throw for unsupported platform', async () => {
      await expect(embedSEOKeywords({
        productName: 'test',
        platformCode: 'unsupported',
      })).rejects.toMatchObject({ status: 4202 });
    });

    it('should respect keyword density requirements for pinduoduo (very_high)', async () => {
      const result = await embedSEOKeywords({
        productName: '收纳盒',
        platformCode: 'pinduoduo',
        count: 3,
      });
      // pinduoduo requires 5+ keywords
      expect(result.minRequired).toBe(5);
      expect(result.keywords.length).toBeGreaterThanOrEqual(5);
    });
  });
});
