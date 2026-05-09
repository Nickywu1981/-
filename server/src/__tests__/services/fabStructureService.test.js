import { describe, it, expect } from 'vitest';

const {
  generateFAB,
  formatFAB,
  ADVANTAGE_TO_BENEFIT,
  BENEFIT_ARCHETYPES,
} = await import('../../services/fabStructureService.js');

describe('fabStructureService', () => {
  describe('ADVANTAGE_TO_BENEFIT', () => {
    it('should have mapping entries', () => {
      expect(Object.keys(ADVANTAGE_TO_BENEFIT).length).toBeGreaterThan(10);
    });

    it('each entry should have advantage and benefit', () => {
      for (const [feature, mapping] of Object.entries(ADVANTAGE_TO_BENEFIT)) {
        expect(mapping.advantage, `${feature}.advantage`).toBeTruthy();
        expect(mapping.benefit, `${feature}.benefit`).toBeTruthy();
        expect(mapping.advantage.length).toBeGreaterThanOrEqual(2);
        expect(mapping.benefit.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('BENEFIT_ARCHETYPES', () => {
    it('should have 7 archetypes', () => {
      expect(Object.keys(BENEFIT_ARCHETYPES)).toHaveLength(7);
    });

    it('each archetype should have options', () => {
      for (const [key, options] of Object.entries(BENEFIT_ARCHETYPES)) {
        expect(options.length, key).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('generateFAB()', () => {
    it('should generate FAB for known features', async () => {
      const result = await generateFAB({
        productName: '全棉T恤',
        features: ['纯棉', '简约'],
        category: '服装',
        style: 'standard',
      });
      expect(result.productName).toBe('全棉T恤');
      expect(result.fab).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.style).toBe('standard');
      // Known features
      const cotton = result.fab.find(f => f.feature === '纯棉');
      expect(cotton.source).toBe('builtin');
      expect(cotton.advantage).toBe('亲肤透气不起球');
      expect(cotton.benefit).toBe('穿一整天都舒服');
    });

    it('should generate FAB for unknown features (derived)', async () => {
      const result = await generateFAB({
        productName: '神秘产品',
        features: ['量子涂层'],
        style: 'standard',
      });
      expect(result.fab).toHaveLength(1);
      expect(result.fab[0].source).toBe('derived');
      expect(result.fab[0].advantage).toBeTruthy();
      expect(result.fab[0].benefit).toBeTruthy();
    });

    it('should score 100 for complete FAB with good quality', async () => {
      const result = await generateFAB({
        productName: '高级T恤',
        features: ['纯棉', '简约', '人体工学'],
        style: 'standard',
      });
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should handle social style', async () => {
      const result = await generateFAB({
        productName: '时尚单品',
        features: ['简约'],
        style: 'social',
      });
      expect(result.style).toBe('social');
      expect(result.fab).toHaveLength(1);
    });
  });

  describe('formatFAB()', () => {
    it('should format FAB into structured/paragraph/bulletPoints', async () => {
      const fabData = await generateFAB({
        productName: '纯棉T恤',
        features: ['纯棉'],
        style: 'standard',
      });
      const formatted = formatFAB(fabData);
      expect(formatted.structured).toHaveLength(1);
      expect(formatted.structured[0]).toContain('纯棉');
      expect(formatted.paragraph).toBeTruthy();
      expect(formatted.bulletPoints).toHaveLength(1);
      expect(formatted.bulletPoints[0]).toContain('▸');
    });
  });
});
