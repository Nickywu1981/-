import { describe, it, expect } from 'vitest';
import { getTierLimits } from '../../services/tierService.js';

// for comparison, use getTierLimits('free') as reference
const freeLimits = getTierLimits('free');

describe('getTierLimits', () => {
  it('returns free tier limits by default', () => {
    const limits = getTierLimits('free');
    expect(limits.dailyImages).toBe(5);
    expect(limits.dailyVideos).toBe(2);
    expect(limits.maxBatch).toBe(10);
    expect(limits.watermark).toBe(true);
    expect(limits.exportHd).toBe(false);
  });

  it('returns vip tier limits', () => {
    const limits = getTierLimits('vip');
    expect(limits.dailyImages).toBe(100);
    expect(limits.dailyVideos).toBe(30);
    expect(limits.maxBatch).toBe(50);
    expect(limits.watermark).toBe(false);
    expect(limits.exportHd).toBe(true);
  });

  it('returns admin tier with Infinity', () => {
    const limits = getTierLimits('admin');
    expect(limits.dailyImages).toBe(Infinity);
    expect(limits.dailyVideos).toBe(Infinity);
    expect(limits.maxBatch).toBe(100);
    expect(limits.watermark).toBe(false);
    expect(limits.exportHd).toBe(true);
  });

  it('returns free tier for unknown tier', () => {
    const limits = getTierLimits('unknown_tier');
    expect(limits).toEqual(freeLimits);
  });

  it('returns free tier for empty string', () => {
    const limits = getTierLimits('');
    expect(limits).toEqual(freeLimits);
  });

  it('returns free tier for undefined', () => {
    const limits = getTierLimits(undefined);
    expect(limits).toEqual(freeLimits);
  });

  it('all 3 tiers define same shape', () => {
    const keys = ['dailyImages', 'dailyVideos', 'maxBatch', 'watermark', 'exportHd'];
    for (const tier of ['free', 'vip', 'admin']) {
      const limits = getTierLimits(tier);
      for (const key of keys) {
        expect(limits).toHaveProperty(key);
      }
    }
  });
});
