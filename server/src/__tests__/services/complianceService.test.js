import { describe, it, expect } from 'vitest';
import {
  getPlatformCompliance,
  getRegionCompliance,
  checkCompliance,
  listComplianceTargets,
} from '../../services/complianceService.js';

describe('getPlatformCompliance', () => {
  it('returns Amazon rules for "amazon"', () => {
    const r = getPlatformCompliance('amazon');
    expect(r).not.toBeNull();
    expect(r.name).toBe('Amazon');
    expect(r.imageRules.length).toBeGreaterThan(0);
    expect(r.textRules.length).toBeGreaterThan(0);
  });

  it('returns Temu rules', () => {
    const r = getPlatformCompliance('temu');
    expect(r).toBeTruthy();
    expect(r.name).toBe('Temu');
  });

  it('returns TikTok Shop rules', () => {
    const r = getPlatformCompliance('tiktok');
    expect(r).toBeTruthy();
    expect(r.name).toBe('TikTok Shop');
  });

  it('returns Shein rules', () => {
    const r = getPlatformCompliance('shein');
    expect(r).toBeTruthy();
    expect(r.name).toBe('Shein');
  });

  it('returns null for unsupported platform', () => {
    expect(getPlatformCompliance('unknown_platform')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getPlatformCompliance('')).toBeNull();
  });
});

describe('getRegionCompliance', () => {
  it('returns EU rules', () => {
    const r = getRegionCompliance('eu');
    expect(r).toBeTruthy();
    expect(r.name).toBe('欧盟 (EU)');
  });

  it('returns US rules', () => {
    const r = getRegionCompliance('us');
    expect(r).toBeTruthy();
    expect(r.name).toBe('美国 (US)');
  });

  it('returns Japan rules', () => {
    const r = getRegionCompliance('jp');
    expect(r).toBeTruthy();
    expect(r.name).toBe('日本');
  });

  it('returns null for unsupported region', () => {
    expect(getRegionCompliance('cn')).toBeNull();
  });
});

describe('checkCompliance', () => {
  it('checks Amazon platform only', () => {
    const result = checkCompliance({ platform: 'amazon', region: null });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].source).toBe('Amazon');
    expect(result.totalRules).toBeGreaterThan(0);
  });

  it('checks platform + region combined', () => {
    const result = checkCompliance({ platform: 'amazon', region: 'eu' });
    expect(result.results).toHaveLength(2);
    expect(result.results[0].source).toBe('Amazon');
    expect(result.results[1].source).toBe('欧盟 (EU)');
  });

  it('deduplicates when platform and region are the same code', () => {
    const result = checkCompliance({ platform: 'eu', region: 'eu' });
    expect(result.results).toHaveLength(1);
  });

  it('returns compliant=true when no critical rules', () => {
    const result = checkCompliance({ platform: 'shein', region: null });
    expect(result.isCompliant).toBe(true);
    expect(result.criticalCount).toBe(0);
  });

  it('returns compliant=false when critical rules exist', () => {
    const result = checkCompliance({ platform: 'amazon', region: null });
    expect(result.isCompliant).toBe(false);
    expect(result.criticalCount).toBeGreaterThan(0);
  });

  it('handles unsupported platform gracefully', () => {
    const result = checkCompliance({ platform: 'noplatform', region: null });
    expect(result.results).toHaveLength(0);
    expect(result.totalRules).toBe(0);
    expect(result.isCompliant).toBe(true);
  });

  it('counts critical rules across platform + region', () => {
    const result = checkCompliance({ platform: 'amazon', region: 'us' });
    const amazon = getPlatformCompliance('amazon');
    const us = getRegionCompliance('us');
    const amazonCrit = amazon.imageRules.filter(
      (r) => r.severity === 'critical',
    ).length + amazon.textRules.filter(
      (r) => r.severity === 'critical',
    ).length;
    const usCrit = us.imageRules.filter(
      (r) => r.severity === 'critical',
    ).length + us.textRules.filter(
      (r) => r.severity === 'critical',
    ).length;
    expect(result.criticalCount).toBe(amazonCrit + usCrit);
  });
});

describe('listComplianceTargets', () => {
  it('returns all 7 compliance targets', () => {
    const targets = listComplianceTargets();
    expect(targets.length).toBe(7);
  });

  it('each target has code, name, and rule counts', () => {
    const targets = listComplianceTargets();
    for (const t of targets) {
      expect(t).toHaveProperty('code');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('imageRuleCount');
      expect(t).toHaveProperty('textRuleCount');
      expect(typeof t.imageRuleCount).toBe('number');
      expect(typeof t.textRuleCount).toBe('number');
    }
  });

  it('includes all expected codes', () => {
    const targets = listComplianceTargets();
    const codes = targets.map((t) => t.code);
    expect(codes).toEqual(
      expect.arrayContaining(['amazon', 'temu', 'tiktok', 'shein', 'eu', 'us', 'jp']),
    );
  });
});
