import { describe, it, expect } from 'vitest';
import { PROMPT_STRATEGIES } from '../../services/prompt-enhance.service.js';

describe('PROMPT_STRATEGIES', () => {
  it('包含 5 种策略类型', () => {
    const keys = Object.keys(PROMPT_STRATEGIES);
    expect(keys).toHaveLength(5);
    expect(keys).toContain('image');
    expect(keys).toContain('video');
    expect(keys).toContain('detail');
    expect(keys).toContain('poster');
    expect(keys).toContain('social');
  });

  it('每个策略含 system prompt 和 max_tokens', () => {
    for (const [, strategy] of Object.entries(PROMPT_STRATEGIES)) {
      expect(strategy).toHaveProperty('system');
      expect(strategy).toHaveProperty('max_tokens');
      expect(typeof strategy.system).toBe('string');
      expect(strategy.system.length).toBeGreaterThan(50);
      expect(strategy.max_tokens).toBe(300);
    }
  });

  it('每个策略的 system prompt 包含专业角色定位', () => {
    const roles = {
      image: '视觉设计师',
      video: '短视频创作专家',
      detail: '详情页设计师',
      poster: '营销海报设计师',
      social: '社交媒体运营专家',
    };
    for (const [type, role] of Object.entries(roles)) {
      expect(PROMPT_STRATEGIES[type].system).toContain(role);
    }
  });

  it('所有策略都要求仅输出优化后提示词不加解释', () => {
    for (const strategy of Object.values(PROMPT_STRATEGIES)) {
      expect(strategy.system).toContain('仅输出优化后的提示词');
    }
  });
});
