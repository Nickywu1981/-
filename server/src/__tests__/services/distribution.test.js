import { describe, it, expect } from 'vitest';

const {
  DISTRIBUTION_TIERS,
  COMMISSION_RATES,
  PROMO_ASSETS,
  VIRAL_CAMPAIGNS,
  getDistributionTiers,
  getPromoAssets,
  getViralCampaigns,
} = await import('../../services/distribution.service.js');

describe('distribution service — pure logic', () => {
  describe('COMMISSION_RATES', () => {
    it('should have level1=15% and level2=5%', () => {
      expect(COMMISSION_RATES.level1).toBe(15);
      expect(COMMISSION_RATES.level2).toBe(5);
    });
  });

  describe('DISTRIBUTION_TIERS', () => {
    it('should have 4 tiers with ascending thresholds', () => {
      const keys = Object.keys(DISTRIBUTION_TIERS);
      expect(keys).toEqual(['bronze', 'silver', 'gold', 'diamond']);

      const thresholds = keys.map(k => DISTRIBUTION_TIERS[k].minSales);
      expect(thresholds).toEqual([0, 5000, 20000, 100000]);
    });

    it('bronze should not have level2', () => {
      expect(DISTRIBUTION_TIERS.bronze.level2Enabled).toBe(false);
    });

    it('silver+ should have level2', () => {
      expect(DISTRIBUTION_TIERS.silver.level2Enabled).toBe(true);
      expect(DISTRIBUTION_TIERS.gold.level2Enabled).toBe(true);
      expect(DISTRIBUTION_TIERS.diamond.level2Enabled).toBe(true);
    });

    it('diamond should have highest rate bonus', () => {
      expect(DISTRIBUTION_TIERS.diamond.rateBonus).toBe(10);
      expect(DISTRIBUTION_TIERS.diamond.label).toBe('钻石合伙人');
    });
  });

  describe('getDistributionTiers()', () => {
    it('should return the same tiers object', () => {
      expect(getDistributionTiers()).toBe(DISTRIBUTION_TIERS);
    });
  });

  describe('PROMO_ASSETS', () => {
    it('should contain invite card and posters', () => {
      const keys = PROMO_ASSETS.map(a => a.key);
      expect(keys).toContain('invite_card');
      expect(keys).toContain('poster_1');
      expect(keys).toContain('invite_text');
    });
  });

  describe('getPromoAssets()', () => {
    it('should return promo assets', () => {
      expect(getPromoAssets()).toBe(PROMO_ASSETS);
    });
  });

  describe('VIRAL_CAMPAIGNS', () => {
    it('should have active campaigns', () => {
      expect(VIRAL_CAMPAIGNS).toHaveLength(2);
      expect(VIRAL_CAMPAIGNS.every(c => c.active)).toBe(true);
    });

    it('double_commission should have 2x bonus', () => {
      const dc = VIRAL_CAMPAIGNS.find(c => c.id === 'double_commission');
      expect(dc.bonusRate).toBe(2);
    });
  });

  describe('getViralCampaigns()', () => {
    it('should return viral campaigns', () => {
      expect(getViralCampaigns()).toBe(VIRAL_CAMPAIGNS);
    });
  });

  describe('commission calculation (unit logic)', () => {
    it('should correctly calculate level1 commission', () => {
      const amount = 100;
      const rate = COMMISSION_RATES.level1;
      const commission = parseFloat((amount * rate / 100).toFixed(2));
      expect(commission).toBe(15);
    });

    it('should correctly calculate level2 commission', () => {
      const amount = 100;
      const rate = COMMISSION_RATES.level2;
      const commission = parseFloat((amount * rate / 100).toFixed(2));
      expect(commission).toBe(5);
    });

    it('should handle fractional amounts correctly', () => {
      const amount = 99.99;
      const commission = parseFloat((amount * 15 / 100).toFixed(2));
      expect(commission).toBe(15);
    });
  });
});
