import { describe, it, expect } from 'vitest';

// ============================================================
// 从 middleware/paramFilter.js 提取的纯函数
// ============================================================

const INJECTION_PATTERNS = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /drop\s+table/i,
  /alter\s+table/i,
  /exec(\s|\+)+(s|x)p\w+/i,
];

function sanitize(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) cleaned[k] = sanitize(v);
    return cleaned;
  }
  return value;
}

function containsInjection(value) {
  if (typeof value !== 'string') return false;
  return INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

function scanForInjection(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && containsInjection(v)) return true;
    if (v && typeof v === 'object' && scanForInjection(v)) return true;
  }
  return false;
}

// ============================================================
// INJECTION_PATTERNS — 注入检测正则
// ============================================================
describe('INJECTION_PATTERNS', () => {
  it('共 8 条规则', () => {
    expect(INJECTION_PATTERNS).toHaveLength(8);
  });

  it('<script> 标签检测', () => {
    expect(INJECTION_PATTERNS[0].test('<script>alert(1)</script>')).toBe(true);
    expect(INJECTION_PATTERNS[0].test('<SCRIPT SRC="x">')).toBe(true);
    expect(INJECTION_PATTERNS[0].test('normal text')).toBe(false);
  });

  it('</script> 闭合标签检测', () => {
    expect(INJECTION_PATTERNS[1].test('</script>')).toBe(true);
    expect(INJECTION_PATTERNS[1].test('hello')).toBe(false);
  });

  it('javascript: 伪协议检测', () => {
    expect(INJECTION_PATTERNS[2].test('javascript:alert(1)')).toBe(true);
    expect(INJECTION_PATTERNS[2].test('https://example.com')).toBe(false);
  });

  it('onXxx= 事件属性检测', () => {
    expect(INJECTION_PATTERNS[3].test('onclick=')).toBe(true);
    expect(INJECTION_PATTERNS[3].test('onerror =')).toBe(true);
    expect(INJECTION_PATTERNS[3].test('online=')).toBe(true);
    expect(INJECTION_PATTERNS[3].test('component')).toBe(false);
  });

  it('SQL UNION SELECT 检测', () => {
    expect(INJECTION_PATTERNS[4].test('union select')).toBe(true);
    expect(INJECTION_PATTERNS[4].test('UNION   SELECT')).toBe(true);
  });

  it('DROP TABLE 检测', () => {
    expect(INJECTION_PATTERNS[5].test('drop table users')).toBe(true);
    expect(INJECTION_PATTERNS[5].test('DROP  TABLE')).toBe(true);
  });

  it('ALTER TABLE 检测', () => {
    expect(INJECTION_PATTERNS[6].test('alter table users')).toBe(true);
  });

  it('exec xp_/sp_ 检测', () => {
    expect(INJECTION_PATTERNS[7].test('exec xp_cmdshell')).toBe(true);
    expect(INJECTION_PATTERNS[7].test('exec sp_helptext')).toBe(true);
  });
});

// ============================================================
// sanitize — 递归 Trim 字符串
// ============================================================
describe('sanitize', () => {
  it('trim 前后空白', () => {
    expect(sanitize('  hello  ')).toBe('hello');
    expect(sanitize('\t\n world \r')).toBe('world');
  });

  it('无空白原样返回', () => {
    expect(sanitize('hello')).toBe('hello');
  });

  it('数字不处理', () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize(0)).toBe(0);
    expect(sanitize(-1)).toBe(-1);
  });

  it('null/undefined 原样返回', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
  });

  it('布尔值原样返回', () => {
    expect(sanitize(true)).toBe(true);
    expect(sanitize(false)).toBe(false);
  });

  it('递归清理数组', () => {
    const result = sanitize(['  a ', ' b ', ['  c  ']]);
    expect(result).toEqual(['a', 'b', ['c']]);
  });

  it('递归清理嵌套对象', () => {
    const result = sanitize({ name: '  Alice ', meta: { city: '  NYC ' } });
    expect(result).toEqual({ name: 'Alice', meta: { city: 'NYC' } });
  });

  it('深层混合对象', () => {
    const result = sanitize({
      title: '  Product  ',
      tags: ['  sale  ', '  new  '],
      detail: { desc: '  Great  ' },
      count: 10,
      active: true,
    });
    expect(result).toEqual({
      title: 'Product',
      tags: ['sale', 'new'],
      detail: { desc: 'Great' },
      count: 10,
      active: true,
    });
  });

  it('空字符串 trim 后为空', () => {
    expect(sanitize('   ')).toBe('');
  });
});

// ============================================================
// containsInjection — 单值注入检测
// ============================================================
describe('containsInjection', () => {
  it('检测到 script 标签返回 true', () => {
    expect(containsInjection('<script>alert(1)</script>')).toBe(true);
  });

  it('检测到 SQL DROP TABLE 返回 true', () => {
    expect(containsInjection("'; DROP TABLE users; --")).toBe(true);
  });

  it('正常文本返回 false', () => {
    expect(containsInjection('hello world')).toBe(false);
    expect(containsInjection('产品名称')).toBe(false);
  });

  it('非字符串返回 false', () => {
    expect(containsInjection(123)).toBe(false);
    expect(containsInjection(null)).toBe(false);
    expect(containsInjection(undefined)).toBe(false);
    expect(containsInjection(true)).toBe(false);
  });

  it('含特殊字符但不匹配注入规则返回 false', () => {
    expect(containsInjection('<div>hello</div>')).toBe(false);
  });
});

// ============================================================
// scanForInjection — 递归扫描对象
// ============================================================
describe('scanForInjection', () => {
  it('干净对象返回 false', () => {
    expect(scanForInjection({ name: 'Alice', age: 30 })).toBe(false);
  });

  it('顶层有注入返回 true', () => {
    expect(scanForInjection({ name: '<script>xss</script>' })).toBe(true);
  });

  it('嵌套对象有注入返回 true', () => {
    expect(scanForInjection({
      user: { name: 'Bob', bio: 'nice' },
      comment: { text: "'; DROP TABLE users; --" },
    })).toBe(true);
  });

  it('数组中检测注入', () => {
    expect(scanForInjection({ tags: ['safe', '<script>'] })).toBe(true);
  });

  it('深层嵌套检测', () => {
    expect(scanForInjection({
      level1: { level2: { level3: { value: 'javascript:void(0)' } } },
    })).toBe(true);
  });

  it('空对象返回 false', () => {
    expect(scanForInjection({})).toBe(false);
  });

  it('null/undefined 返回 false', () => {
    expect(scanForInjection(null)).toBe(false);
    expect(scanForInjection(undefined)).toBe(false);
  });

  it('非对象返回 false', () => {
    expect(scanForInjection('string')).toBe(false);
    expect(scanForInjection(123)).toBe(false);
  });
});

