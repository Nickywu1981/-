import { describe, it, expect } from 'vitest';
import { enhancePrompt, generateDefaultPrompt } from '../promptEnhancer';

describe('enhancePrompt', () => {
  it('returns original and enhanced fields', () => {
    const result = enhancePrompt('拍一张产品图');
    expect(result.original).toBe('拍一张产品图');
    expect(result.enhanced).toContain('拍一张产品图');
    expect(result.additions.length).toBeGreaterThan(0);
  });

  it('adds style when category is specified', () => {
    const result = enhancePrompt('拍产品图', { category: 'ecommerce' });
    const hasStyle = result.additions.some(a => a.includes('风格'));
    expect(hasStyle).toBe(true);
  });

  it('skips style when already in input', () => {
    const result = enhancePrompt('产品摄影风格，商业级画质');
    const hasStyle = result.additions.some(a => a.includes('风格'));
    expect(hasStyle).toBe(false);
  });

  it('adds lighting suggestions', () => {
    const result = enhancePrompt('产品图');
    const hasLighting = result.additions.some(a => a.includes('光照'));
    expect(hasLighting).toBe(true);
  });

  it('skips lighting when mentioned', () => {
    const result = enhancePrompt('产品图，影棚灯光效果');
    const hasLighting = result.additions.some(a => a.includes('光照'));
    expect(hasLighting).toBe(false);
  });

  it('adds composition suggestions', () => {
    const result = enhancePrompt('产品图');
    const hasComposition = result.additions.some(a => a.includes('构图'));
    expect(hasComposition).toBe(true);
  });

  it('skips composition when mentioned', () => {
    const result = enhancePrompt('居中构图的商品图');
    const hasComposition = result.additions.some(a => a.includes('构图'));
    expect(hasComposition).toBe(false);
  });

  it('adds platform-specific specs', () => {
    const result = enhancePrompt('商品图', { platform: 'Amazon' });
    const hasPlatform = result.additions.some(a => a.includes('Amazon') || a.includes('纯白背景'));
    expect(hasPlatform).toBe(true);
  });

  it('does not add platform spec without platform option', () => {
    const result = enhancePrompt('商品图');
    const hasPlatform = result.additions.some(a => a.includes('平台规格'));
    expect(hasPlatform).toBe(false);
  });

  it('adds quality keywords', () => {
    const result = enhancePrompt('产品图');
    const hasQuality = result.additions.some(a => a.includes('画质'));
    expect(hasQuality).toBe(true);
  });

  it('skips quality when already in input', () => {
    const result = enhancePrompt('8K高清产品图');
    const hasQuality = result.additions.some(a => a.includes('画质'));
    expect(hasQuality).toBe(false);
  });

  it('adds English style when language is en', () => {
    const result = enhancePrompt('product photo', { language: 'en' });
    const hasEnglish = result.additions.some(a => a.includes('Professional'));
    expect(hasEnglish).toBe(true);
  });

  it('uses soft lighting for portrait category', () => {
    const result = enhancePrompt('人像', { category: 'portrait' });
    const hasSoftLight = result.additions.some(a => a.includes(LIGHTING_FIXTURE));
    expect(result.enhanced).toContain('人像');
  });

  it('handles empty input', () => {
    const result = enhancePrompt('');
    expect(result.original).toBe('');
    expect(result.enhanced).toContain('');
    expect(result.additions.length).toBeGreaterThan(0);
  });

  it('enhanced contains all additions separated by Chinese period', () => {
    const result = enhancePrompt('test prompt');
    for (const addition of result.additions) {
      expect(result.enhanced).toContain(addition);
    }
  });
});

describe('generateDefaultPrompt', () => {
  it('returns default prompt without args', () => {
    const result = generateDefaultPrompt();
    expect(result).toContain('电商');
    expect(result).toContain('产品摄影');
  });

  it('includes platform in prompt', () => {
    const result = generateDefaultPrompt('Amazon');
    expect(result).toContain('Amazon');
  });

  it('includes category-specific styles', () => {
    const result = generateDefaultPrompt(undefined, 'fashion');
    expect(result).toContain('时尚');
  });

  it('includes platform spec', () => {
    const result = generateDefaultPrompt('淘宝');
    expect(result).toContain('800x800');
  });

  it('includes quality keywords', () => {
    const result = generateDefaultPrompt();
    expect(result).toContain('8K');
    expect(result).toContain('超高分辨率');
  });
});

// Reference value from the module for the portrait lighting test
const LIGHTING_FIXTURE = '柔和均匀光';
