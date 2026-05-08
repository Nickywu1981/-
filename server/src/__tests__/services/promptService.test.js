import { describe, it, expect } from 'vitest';
import {
  extractVariables, fillTemplate, buildVariableDefs,
} from '../../services/promptService.js';

// ============================================================
// extractVariables — 提取 {{变量名}}
// ============================================================
describe('extractVariables', () => {
  it('提取单个变量', () => {
    expect(extractVariables('你好 {{name}}')).toEqual(['name']);
  });

  it('提取多个去重变量', () => {
    const result = extractVariables('{{product}} is {{price}}, buy {{product}} now!');
    expect(result).toEqual(['product', 'price']);
  });

  it('无变量返回空数组', () => {
    expect(extractVariables('纯文本无变量')).toEqual([]);
  });

  it('空字符串返回空数组', () => {
    expect(extractVariables('')).toEqual([]);
  });

  it('中文变量名不匹配 \\w 仅支持英文/数字/下划线', () => {
    expect(extractVariables('{{商品名称}} 售价 {{价格}}')).toEqual([]);
  });

  it('下划线和数字变量名支持', () => {
    expect(extractVariables('{{user_id}} {{count2}}')).toEqual(['user_id', 'count2']);
  });

  it('部分花括号不误识', () => {
    expect(extractVariables('{not_var} {{real_var}}')).toEqual(['real_var']);
  });

  it('多行模板', () => {
    const tmpl = 'Title: {{title}}\nDesc: {{desc}}\nPrice: {{price}}\nBuy {{title}} today!';
    expect(extractVariables(tmpl)).toEqual(['title', 'desc', 'price']);
  });
});

// ============================================================
// fillTemplate — 用 values 填充 {{变量}}
// ============================================================
describe('fillTemplate', () => {
  it('替换所有变量', () => {
    const result = fillTemplate('{{name}} 购买了 {{product}}', { name: '张三', product: '蓝牙耳机' });
    expect(result).toBe('张三 购买了 蓝牙耳机');
  });

  it('缺失变量保留原占位符', () => {
    const result = fillTemplate('{{name}} 您好', {});
    expect(result).toBe('{{name}} 您好');
  });

  it('部分缺失仅替换已知', () => {
    const result = fillTemplate('{{a}} {{b}} {{c}}', { a: '1', c: '3' });
    expect(result).toBe('1 {{b}} 3');
  });

  it('values 为空对象不报错', () => {
    expect(fillTemplate('text', {})).toBe('text');
  });

  it('values 为 undefined 视为无值', () => {
    const result = fillTemplate('{{x}}', { x: undefined });
    expect(result).toBe('{{x}}');
  });

  it('values 为 0/false 正常替换', () => {
    const result = fillTemplate('price: {{price}}, sold: {{sold}}', { price: 0, sold: false });
    expect(result).toBe('price: 0, sold: false');
  });

  it('嵌套花括号不误匹配', () => {
    const result = fillTemplate('{\n  "key": "{{val}}"\n}', { val: 'hello' });
    expect(result).toBe('{\n  "key": "hello"\n}');
  });
});

// ============================================================
// buildVariableDefs — 从模板生成变量定义
// ============================================================
describe('buildVariableDefs', () => {
  it('为模板中的变量生成默认定义', () => {
    const defs = buildVariableDefs('{{name}} is {{age}}', []);
    expect(defs).toHaveLength(2);
    expect(defs[0]).toMatchObject({ name: 'name', label: 'name', type: 'text', required: true });
    expect(defs[0].placeholder).toContain('name');
    expect(defs[1]).toMatchObject({ name: 'age' });
  });

  it('已有变量定义不被覆盖', () => {
    const existing = [{ name: 'name', label: '姓名', type: 'text', required: true }];
    const defs = buildVariableDefs('{{name}} {{email}}', existing);
    expect(defs).toHaveLength(2);
    expect(defs[0]).toMatchObject({ label: '姓名' }); // 保留原有
    expect(defs[1]).toMatchObject({ name: 'email' });  // 新增
  });

  it('无变量返回空数组', () => {
    expect(buildVariableDefs('no vars here', [])).toEqual([]);
  });

  it('保留 existing 但 content 无新变量', () => {
    const existing = [{ name: 'x', label: 'X' }];
    const defs = buildVariableDefs('plain text', existing);
    expect(defs).toEqual(existing);
    expect(defs).not.toBe(existing); // 新数组
  });

  it('不传入 existingVars 时效果同空数组', () => {
    const defs = buildVariableDefs('{{a}}');
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('a');
  });

  it('变量去重', () => {
    const defs = buildVariableDefs('{{x}} {{x}} {{y}}', []);
    expect(defs).toHaveLength(2);
    expect(defs.map(d => d.name)).toEqual(['x', 'y']);
  });
});
