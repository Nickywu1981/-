import { describe, it, expect } from 'vitest';
import {
  getLanguages, getScriptTypes, getLanguage, buildMultilingualPrompt,
} from '../../services/multilingualService.js';

// ============================================================
// getLanguages
// ============================================================
describe('getLanguages', () => {
  it('返回 9 种语言', () => {
    const langs = getLanguages();
    expect(langs).toHaveLength(9);
  });

  it('每种语言包含 code/name/flag/tone', () => {
    for (const lang of getLanguages()) {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('name');
      expect(lang).toHaveProperty('flag');
      expect(lang).toHaveProperty('tone');
      expect(typeof lang.code).toBe('string');
      expect(lang.code.length).toBe(2);
    }
  });

  it('包含中英西葡俄日韩泰阿', () => {
    const codes = getLanguages().map(l => l.code);
    ['zh', 'en', 'es', 'pt', 'ru', 'ja', 'ko', 'th', 'ar'].forEach(c => {
      expect(codes).toContain(c);
    });
  });

  it('每次调用返回新数组', () => {
    const a = getLanguages();
    const b = getLanguages();
    expect(a).not.toBe(b);
  });
});

// ============================================================
// getScriptTypes
// ============================================================
describe('getScriptTypes', () => {
  it('返回 3 种脚本类型', () => {
    const types = getScriptTypes();
    expect(types).toHaveLength(3);
  });

  it('包含 live_stream/short_video/product_desc', () => {
    const codes = getScriptTypes().map(t => t.code);
    expect(codes).toContain('live_stream');
    expect(codes).toContain('short_video');
    expect(codes).toContain('product_desc');
  });

  it('每种类型含 name/icon/template/desc', () => {
    for (const t of getScriptTypes()) {
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('icon');
      expect(t).toHaveProperty('template');
      expect(t).toHaveProperty('desc');
    }
  });
});

// ============================================================
// getLanguage
// ============================================================
describe('getLanguage', () => {
  it('返回有效语言配置', () => {
    const zh = getLanguage('zh');
    expect(zh).toMatchObject({ name: '中文', flag: '🇨🇳' });
  });

  it('code 不存在返回 null', () => {
    expect(getLanguage('xx')).toBeNull();
  });

  it('空字符串返回 null', () => {
    expect(getLanguage('')).toBeNull();
  });
});

// ============================================================
// buildMultilingualPrompt
// ============================================================
describe('buildMultilingualPrompt', () => {
  const product = '蓝牙耳机';
  const baseOpts = { product, language: 'zh', scriptType: 'short_video', platform: 'TikTok' };

  it('直播脚本包含时间戳格式', () => {
    const result = buildMultilingualPrompt({ ...baseOpts, scriptType: 'live_stream' });
    expect(result.language).toBe('中文');
    expect(result.scriptType).toBe('直播脚本');
    expect(result.prompt).toContain('livestream');
    expect(result.prompt).toContain('TikTok');
    expect(result.prompt).toContain('蓝牙耳机');
    expect(result.prompt).toContain('[0:00]');
  });

  it('短视频脚本包含 Hook/Problem/Solution 结构', () => {
    const result = buildMultilingualPrompt(baseOpts);
    expect(result.prompt).toContain('short video');
    expect(result.prompt).toContain('Hook 0-3s');
    expect(result.prompt).toContain('Problem 3-10s');
    expect(result.prompt).toContain('Solution 10-20s');
    expect(result.prompt).toContain('CTA 30-40s');
  });

  it('产品描述包含 SEO 关键词', () => {
    const result = buildMultilingualPrompt({ ...baseOpts, scriptType: 'product_desc' });
    expect(result.prompt).toContain('product description');
    expect(result.prompt).toContain('SEO');
    expect(result.prompt).toContain('bullet points');
  });

  it('未知 scriptType 回退到 short_video', () => {
    const result = buildMultilingualPrompt({ ...baseOpts, scriptType: 'unknown' });
    expect(result.prompt).toContain('short video');
  });

  it('未知 language 回退到 English', () => {
    const result = buildMultilingualPrompt({ ...baseOpts, language: 'xx' });
    expect(result.language).toBe('English');
  });

  it('自定义 tone 覆盖语言默认 tone', () => {
    const result = buildMultilingualPrompt({ ...baseOpts, tone: 'Funny & casual' });
    expect(result.prompt).toContain('Funny & casual');
  });

  it('不传 platform 时有默认值', () => {
    const result = buildMultilingualPrompt({ product, language: 'en', scriptType: 'live_stream' });
    expect(result.prompt).toContain('e-commerce platform');
  });

  it('多语言产品描述支持', () => {
    const result = buildMultilingualPrompt({ product, language: 'ja', scriptType: 'product_desc', platform: 'Rakuten' });
    expect(result.language).toBe('日本語');
    expect(result.prompt).toContain('Rakuten');
    expect(result.prompt).toContain('product description');
  });
});
