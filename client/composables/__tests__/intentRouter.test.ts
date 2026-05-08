import { describe, it, expect } from 'vitest';
import { parseIntent, type IntentResult } from '../../composables/intentRouter';

describe('parseIntent', () => {
  it('returns empty result for empty input', () => {
    const r = parseIntent('');
    expect(r.matched).toBe(false);
    expect(r.tool).toBe('');
    expect(r.confidence).toBe(0);
    expect(r.suggestions).toHaveLength(0);
  });

  it('returns empty result for whitespace-only', () => {
    const r = parseIntent('   ');
    expect(r.matched).toBe(false);
  });

  it('matches "抠图" → remove-bg route', () => {
    const r = parseIntent('帮我抠图');
    expect(r.matched).toBe(true);
    expect(r.route).toBe('/work/remove-bg');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('matches "白底图" → white-bg route', () => {
    const r = parseIntent('做一个白底图');
    expect(r.route).toBe('/work/white-bg');
    expect(r.matched).toBe(true);
  });

  it('matches "视频" → video route', () => {
    const r = parseIntent('生成一个商品视频');
    expect(r.route).toBe('/work/video');
    expect(r.matched).toBe(true);
  });

  it('matches "批量" → batch route', () => {
    const r = parseIntent('批量处理这些图片');
    expect(r.route).toBe('/work/batch');
    expect(r.matched).toBe(true);
  });

  it('matches English keywords', () => {
    const r = parseIntent('remove background from image');
    expect(r.route).toBe('/work/remove-bg');
    expect(r.matched).toBe(true);
  });

  it('detects platform from input', () => {
    const r = parseIntent('tiktok视频生成');
    expect(r.detectedPlatform).toBe('TikTok');
  });

  it('detects Amazon platform', () => {
    const r = parseIntent('亚马逊主图制作');
    expect(r.detectedPlatform).toBe('Amazon');
    expect(r.route).toBe('/work/main-image');
  });

  it('detects action from input', () => {
    const r = parseIntent('去背景');
    expect(r.detectedAction).toBe('remove_bg');
  });

  it('detects "生成" as generate action', () => {
    const r = parseIntent('生成商品视频');
    expect(r.detectedAction).toBe('generate');
  });

  it('returns suggestions with top 5 matches', () => {
    const r = parseIntent('做一个白底图');
    expect(r.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(r.suggestions[0].tool).toBe('白底图');
    expect(r.suggestions[0].confidence).toBeGreaterThan(0);
  });

  it('longer keyword gives higher confidence', () => {
    // "场景图" (3 chars) vs "场景" (2 chars) — "场景图" matches more specifically
    const r1 = parseIntent('场景图');
    const r2 = parseIntent('场景');
    expect(r1.confidence).toBeGreaterThanOrEqual(r2.confidence);
  });

  it('no match returns empty result', () => {
    const r = parseIntent('今天天气真好');
    expect(r.matched).toBe(false);
    expect(r.suggestions).toHaveLength(0);
  });

  it('case insensitive matching', () => {
    const r = parseIntent('REMOVE BACKGROUND PLEASE');
    expect(r.route).toBe('/work/remove-bg');
    expect(r.matched).toBe(true);
  });
});
