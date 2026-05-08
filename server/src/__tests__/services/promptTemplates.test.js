import { describe, it, expect } from 'vitest';
import { fillPrompt, getTemplateNames } from '../../services/prompts/index.js';

describe('fillPrompt', () => {
  it('替换单个占位符', () => {
    expect(fillPrompt('Hello {name}', { name: 'World' })).toBe('Hello World');
  });

  it('替换多个占位符', () => {
    const result = fillPrompt('{greeting} {name}, your {item} is ready', {
      greeting: 'Hi', name: 'John', item: 'order',
    });
    expect(result).toBe('Hi John, your order is ready');
  });

  it('未提供的占位符保留原样', () => {
    expect(fillPrompt('Hello {name}', {})).toBe('Hello {name}');
  });

  it('null/undefined 值替换为空字符串', () => {
    expect(fillPrompt('Hi {name}', { name: null })).toBe('Hi ');
    expect(fillPrompt('Hi {name}', { name: undefined })).toBe('Hi ');
  });

  it('数字值正常转换为字符串', () => {
    expect(fillPrompt('Price: {price}', { price: 99 })).toBe('Price: 99');
  });

  it('与中文模板配合', () => {
    const tpl = '请为商品"{product}"生成{count}条{platform}风格的标题';
    expect(fillPrompt(tpl, { product: '蓝牙耳机', count: 5, platform: '淘宝' }))
      .toBe('请为商品"蓝牙耳机"生成5条淘宝风格的标题');
  });

  it('占位符出现多次全部替换', () => {
    expect(fillPrompt('{x} + {x} = {y}', { x: 'a', y: 'b' })).toBe('a + a = b');
  });

  it('空模板返回空字符串', () => {
    expect(fillPrompt('', { key: 'val' })).toBe('');
  });

  it('空参数对象原样返回模板', () => {
    expect(fillPrompt('unchanged', {})).toBe('unchanged');
  });
});

describe('getTemplateNames', () => {
  it('提取模块中含 template 属性的 key', () => {
    const mod = {
      sceneGen: { template: '{scene}', description: '...' },
      colorSwap: { template: '{from}→{to}' },
      notATemplate: { foo: 1 },
    };
    expect(getTemplateNames(mod)).toEqual(['sceneGen', 'colorSwap']);
  });

  it('空模块返回空数组', () => {
    expect(getTemplateNames({})).toEqual([]);
  });

  it('全是非 template 属性时返回空数组', () => {
    expect(getTemplateNames({ a: 1, b: { x: 2 } })).toEqual([]);
  });
});
