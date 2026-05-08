import { describe, it, expect } from 'vitest';
import { PLATFORM_PUBLISH_SPECS, getPublishPlatforms } from '../../services/publishService.js';

// ============================================================
// PLATFORM_PUBLISH_SPECS — 13 平台发布规格
// ============================================================
describe('PLATFORM_PUBLISH_SPECS', () => {
  it('包含 13 个支持平台', () => {
    expect(Object.keys(PLATFORM_PUBLISH_SPECS)).toHaveLength(13);
  });

  it('国内主流平台全部覆盖', () => {
    const keys = Object.keys(PLATFORM_PUBLISH_SPECS);
    ['taobao', 'tmall', 'jd', 'pdd', 'douyin', 'kuaishou', 'xiaohongshu', 'shipinhao', 'bilibili'].forEach(k => {
      expect(keys).toContain(k);
    });
  });

  it('跨境平台全部覆盖', () => {
    const keys = Object.keys(PLATFORM_PUBLISH_SPECS);
    ['shopee', 'lazada', 'amazon', 'tiktokshop'].forEach(k => {
      expect(keys).toContain(k);
    });
  });

  it('每个平台包含完整规格字段', () => {
    for (const [, spec] of Object.entries(PLATFORM_PUBLISH_SPECS)) {
      expect(spec).toHaveProperty('name');
      expect(spec).toHaveProperty('maxSizeMB');
      expect(spec).toHaveProperty('formats');
      expect(spec).toHaveProperty('maxWidth');
      expect(typeof spec.name).toBe('string');
      expect(typeof spec.maxSizeMB).toBe('number');
      expect(Array.isArray(spec.formats)).toBe(true);
      expect(typeof spec.maxWidth).toBe('number');
    }
  });

  it('图片平台只支持图片格式', () => {
    const imageOnly = ['taobao', 'tmall', 'jd', 'pdd', 'shopee', 'lazada'];
    for (const k of imageOnly) {
      const formats = PLATFORM_PUBLISH_SPECS[k].formats;
      expect(formats.every(f => ['jpg', 'png', 'gif', 'webp'].includes(f))).toBe(true);
      expect(formats.includes('mp4')).toBe(false);
    }
  });

  it('视频平台支持 mp4', () => {
    ['douyin', 'kuaishou', 'shipinhao', 'bilibili', 'tiktokshop'].forEach(k => {
      expect(PLATFORM_PUBLISH_SPECS[k].formats).toContain('mp4');
    });
  });

  it('国内平台 maxSizeMB <= 10', () => {
    const domestic = ['taobao', 'tmall', 'jd', 'pdd', 'douyin', 'kuaishou', 'xiaohongshu', 'bilibili'];
    for (const k of domestic) {
      expect(PLATFORM_PUBLISH_SPECS[k].maxSizeMB).toBeLessThanOrEqual(10);
    }
  });

  it('拼多多规格最严格 — maxSizeMB=2', () => {
    expect(PLATFORM_PUBLISH_SPECS.pdd.maxSizeMB).toBe(2);
  });

  it('B站支持最大宽度 1920', () => {
    expect(PLATFORM_PUBLISH_SPECS.bilibili.maxWidth).toBe(1920);
  });

  it('淘宝/Tmall/Shopee/Lazada 宽度 ≤ 800', () => {
    ['taobao', 'tmall', 'shopee', 'lazada'].forEach(k => {
      expect(PLATFORM_PUBLISH_SPECS[k].maxWidth).toBeLessThanOrEqual(800);
    });
  });
});

// ============================================================
// getPublishPlatforms — 平台列表格式化
// ============================================================
describe('getPublishPlatforms', () => {
  it('返回 13 个平台对象含 key', () => {
    const list = getPublishPlatforms();
    expect(list).toHaveLength(13);
    expect(list[0]).toHaveProperty('key');
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('maxSizeMB');
    expect(list[0]).toHaveProperty('formats');
    expect(list[0]).toHaveProperty('maxWidth');
  });

  it('每次调用返回新数组', () => {
    expect(getPublishPlatforms()).not.toBe(getPublishPlatforms());
  });

  it('key 与 PLATFORM_PUBLISH_SPECS key 一致', () => {
    const list = getPublishPlatforms();
    const keys = list.map(p => p.key);
    expect(keys.sort()).toEqual(Object.keys(PLATFORM_PUBLISH_SPECS).sort());
  });

  it('所有平台 name 非空', () => {
    for (const p of getPublishPlatforms()) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});
