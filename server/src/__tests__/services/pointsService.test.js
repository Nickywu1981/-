import { describe, it, expect } from 'vitest';
import { POINT_RULES } from '../../services/points.service.js';

describe('POINT_RULES', () => {
  it('注册奖励 100 积分', () => {
    expect(POINT_RULES.register).toBe(100);
  });

  it('每日签到 10 积分', () => {
    expect(POINT_RULES.daily_checkin).toBe(10);
  });

  it('连续签到额外 5 分', () => {
    expect(POINT_RULES.checkin_streak_bonus).toBe(5);
  });

  it('生图 2 分 / 生视频 5 分', () => {
    expect(POINT_RULES.image_gen).toBe(2);
    expect(POINT_RULES.video_gen).toBe(5);
  });

  it('动作迁移 10 分', () => {
    expect(POINT_RULES.action_migrate).toBe(10);
  });

  it('数字人 8 分 / 爆款复刻 8 分', () => {
    expect(POINT_RULES.digital_human).toBe(8);
    expect(POINT_RULES.viral_replicate).toBe(8);
  });

  it('分享 5 分 / 邀请注册 50 分 / 邀请首购 200 分', () => {
    expect(POINT_RULES.share_product).toBe(5);
    expect(POINT_RULES.invite_register).toBe(50);
    expect(POINT_RULES.invite_purchase).toBe(200);
  });

  it('积分兑换比率均为正数', () => {
    const rates = POINT_RULES.redeem_credits;
    expect(rates).toBeTypeOf('object');
    for (const [points, credits] of Object.entries(rates)) {
      expect(Number(points)).toBeGreaterThan(0);
      expect(credits).toBeGreaterThan(0);
    }
  });

  it('兑换比率点数越高越优惠（性价比递增）', () => {
    const rates = POINT_RULES.redeem_credits;
    const entries = Object.entries(rates).map(([k, v]) => [Number(k), v]);
    const ratios = entries.map(([p, c]) => c / p);
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
    }
  });
});
