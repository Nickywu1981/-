import { describe, it, expect } from 'vitest';
import {
  PLATFORM_RULES, getPlatforms, getLanguages,
} from '../../services/copywritingService.js';

// ============================================================
// 从 copywritingService.js 提取的纯函数
// ============================================================

function platformRulesToString(platform) {
  const rule = PLATFORM_RULES[platform] || PLATFORM_RULES.taobao;
  return `Platform requirements: max ${rule.maxTitleLen} chars, ${rule.minKeywords}-${rule.maxKeywords} keywords, use "${rule.keywordSep}" as separator`;
}

function parseTitleList(text) {
  const lines = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+[\.\)、]\s*/, '').trim());
  return lines.length ? lines : [text];
}

// ============================================================
// PLATFORM_RULES — 9 大电商平台规则
// ============================================================
describe('PLATFORM_RULES', () => {
  it('包含 9 个平台', () => {
    const keys = Object.keys(PLATFORM_RULES);
    expect(keys).toHaveLength(9);
    expect(keys).toContain('taobao');
    expect(keys).toContain('jd');
    expect(keys).toContain('douyin');
    expect(keys).toContain('amazon');
  });

  it('每个平台包含 name/maxTitleLen/keywordSep/minKeywords/maxKeywords', () => {
    for (const [key, rule] of Object.entries(PLATFORM_RULES)) {
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('maxTitleLen');
      expect(rule).toHaveProperty('keywordSep');
      expect(rule).toHaveProperty('minKeywords');
      expect(rule).toHaveProperty('maxKeywords');
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.maxTitleLen).toBe('number');
    }
  });

  it('中国平台标题长度限制比国际平台短', () => {
    expect(PLATFORM_RULES.taobao.maxTitleLen).toBe(60);
    expect(PLATFORM_RULES.douyin.maxTitleLen).toBe(30);
    expect(PLATFORM_RULES.amazon.maxTitleLen).toBe(200);
    expect(PLATFORM_RULES.shopee.maxTitleLen).toBe(120);
  });

  it('抖音使用 # 分隔关键字', () => {
    expect(PLATFORM_RULES.douyin.keywordSep).toBe('#');
    expect(PLATFORM_RULES.taobao.keywordSep).toBe(' ');
  });

  it('拼多多关键字要求最高（5-15）', () => {
    expect(PLATFORM_RULES.pinduoduo.minKeywords).toBe(5);
    expect(PLATFORM_RULES.pinduoduo.maxKeywords).toBe(15);
  });
});

// ============================================================
// platformRulesToString — 平台规则格式化
// ============================================================
describe('platformRulesToString', () => {
  it('淘宝规则字符串', () => {
    const result = platformRulesToString('taobao');
    expect(result).toContain('max 60 chars');
    expect(result).toContain('3-10 keywords');
    expect(result).toContain('" "');
  });

  it('抖音规则字符串', () => {
    const result = platformRulesToString('douyin');
    expect(result).toContain('max 30 chars');
    expect(result).toContain('2-6 keywords');
    expect(result).toContain('"#"');
  });

  it('未知平台回退淘宝规则', () => {
    const result = platformRulesToString('unknown');
    expect(result).toContain('max 60 chars');
    expect(result).toContain('3-10 keywords');
  });
});

// ============================================================
// parseTitleList — 解析 AI 返回的标题列表
// ============================================================
describe('parseTitleList', () => {
  it('解析数字编号列表', () => {
    const text = '1. 夏季连衣裙新款\n2. 韩版修身显瘦连衣裙\n3. 小清新碎花裙夏装';
    const result = parseTitleList(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('夏季连衣裙新款');
    expect(result[2]).toBe('小清新碎花裙夏装');
  });

  it('解析顿号编号', () => {
    const text = '1、高品质蓝牙耳机\n2、降噪运动耳机\n3、长续航无线耳机';
    const result = parseTitleList(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('高品质蓝牙耳机');
  });

  it('解析括号编号', () => {
    const text = '1) Product Title A\n2) Product Title B';
    const result = parseTitleList(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Product Title A');
    expect(result[1]).toBe('Product Title B');
  });

  it('无编号纯文本返回单元素数组', () => {
    const result = parseTitleList('这是一条纯文本标题');
    expect(result).toEqual(['这是一条纯文本标题']);
  });

  it('过滤空行', () => {
    const text = '1. 标题一\n\n\n2. 标题二\n';
    const result = parseTitleList(text);
    expect(result).toHaveLength(2);
    expect(result).toEqual(['标题一', '标题二']);
  });

  it('空文本返回单元素（原文本）', () => {
    expect(parseTitleList('')).toEqual(['']);
  });
});

// ============================================================
// getPlatforms / getLanguages — 简单 getter
// ============================================================
describe('getPlatforms', () => {
  it('返回 PLATFORM_RULES 引用', () => {
    expect(getPlatforms()).toBe(PLATFORM_RULES);
  });

  it('PLATFORM_RULES 不为空', () => {
    expect(Object.keys(getPlatforms()).length).toBeGreaterThan(0);
  });
});

describe('getLanguages', () => {
  it('返回 9 种语言映射', () => {
    const langs = getLanguages();
    expect(Object.keys(langs)).toHaveLength(9);
  });

  it('包含中英日韩西法德泰', () => {
    const langs = getLanguages();
    expect(langs['zh-CN']).toBe('简体中文');
    expect(langs['en']).toBe('English');
    expect(langs['ja']).toBe('日本語');
    expect(langs['ko']).toBe('한국어');
    expect(langs['es']).toBe('Español');
    expect(langs['fr']).toBe('Français');
    expect(langs['de']).toBe('Deutsch');
    expect(langs['th']).toBe('ไทย');
    expect(langs['zh-TW']).toBe('繁体中文');
  });
});
