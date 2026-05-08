import { describe, it, expect } from 'vitest';

// ============================================================
// 从 formService.js 提取的纯逻辑函数（无需 mock）
// ============================================================

const VALIDATORS = {
  required: (v) => v !== undefined && v !== null && v !== '',
  regex: (v, { value, flags }) => new RegExp(value, flags || '').test(String(v)),
  min: (v, { value }) => (typeof v === 'number' ? v >= value : String(v).length >= value),
  max: (v, { value }) => (typeof v === 'number' ? v <= value : String(v).length <= value),
  minLength: (v, { value }) => String(v).length >= value,
  maxLength: (v, { value }) => String(v).length <= value,
  range: (v, { min, max }) => Number(v) >= min && Number(v) <= max,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^1[3-9]\d{9}$/.test(v),
  url: (v) => /^https?:\/\/.+/.test(v),
  number: (v) => !isNaN(Number(v)),
  integer: (v) => Number.isInteger(Number(v)),
  positive: (v) => Number(v) > 0,
  fileType: (v, { value }) => (Array.isArray(value) ? value : [value]).some(t => String(v).endsWith(t)),
};

function validateField(value, rules) {
  if (!rules || !Array.isArray(rules)) return null;
  for (const rule of rules) {
    const fn = VALIDATORS[rule.rule];
    if (!fn) continue;
    const valid = fn(value, rule);
    if (!valid) return rule.message || `字段校验失败: ${rule.rule}`;
  }
  return null;
}

function resolveLinkage(field, allValues) {
  const conditions = field.linkage_conditions;
  if (!conditions || !Array.isArray(conditions)) return true;
  return conditions.every(cond => {
    const targetValue = allValues[cond.targetField];
    switch (cond.operator) {
      case 'eq': return targetValue === cond.value;
      case 'neq': return targetValue !== cond.value;
      case 'gt': return Number(targetValue) > Number(cond.value);
      case 'lt': return Number(targetValue) < Number(cond.value);
      case 'gte': return Number(targetValue) >= Number(cond.value);
      case 'lte': return Number(targetValue) <= Number(cond.value);
      case 'in': return Array.isArray(cond.value) && cond.value.includes(targetValue);
      case 'contains': return String(targetValue).includes(String(cond.value));
      case 'notEmpty': return targetValue !== undefined && targetValue !== null && targetValue !== '';
      case 'isEmpty': return targetValue === undefined || targetValue === null || targetValue === '';
      default: return true;
    }
  });
}

function maskValue(value, rule, pattern) {
  if (value === undefined || value === null || value === '') return value;
  const s = String(value);
  switch (rule) {
    case 'phone': return s.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    case 'email': return s.replace(/(.{2}).*(@.*)/, '$1***$2');
    case 'idcard': return s.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
    case 'name': return s.length > 1 ? s[0] + '*'.repeat(s.length > 2 ? s.length - 2 : 1) + s[s.length - 1] : s + '*';
    case 'custom': return pattern ? s.replace(new RegExp(pattern), '***') : s;
    default: return s;
  }
}

// ============================================================
// VALIDATORS — 12 条校验规则
// ============================================================
describe('VALIDATORS', () => {
  describe('required', () => {
    it('通过：非空字符串', () => expect(VALIDATORS.required('hello')).toBe(true));
    it('通过：数字 0', () => expect(VALIDATORS.required(0)).toBe(true));
    it('通过：false', () => expect(VALIDATORS.required(false)).toBe(true));
    it('拒绝：空字符串', () => expect(VALIDATORS.required('')).toBe(false));
    it('拒绝：undefined', () => expect(VALIDATORS.required(undefined)).toBe(false));
    it('拒绝：null', () => expect(VALIDATORS.required(null)).toBe(false));
  });

  describe('email', () => {
    it('通过合法邮箱', () => expect(VALIDATORS.email('test@example.com')).toBe(true));
    it('拒绝非法邮箱', () => expect(VALIDATORS.email('notanemail')).toBe(false));
    it('拒绝空字符串', () => expect(VALIDATORS.email('')).toBe(false));
  });

  describe('phone', () => {
    it('通过合法手机号', () => expect(VALIDATORS.phone('13800138000')).toBe(true));
    it('拒绝 12 位手机号', () => expect(VALIDATORS.phone('12000000000')).toBe(false));
    it('拒绝非数字', () => expect(VALIDATORS.phone('abcdefghijk')).toBe(false));
  });

  describe('min/max/range', () => {
    it('min 数字比较', () => expect(VALIDATORS.min(5, { value: 3 })).toBe(true));
    it('min 拒绝小于阈值', () => expect(VALIDATORS.min(2, { value: 5 })).toBe(false));
    it('min 字符串长度', () => expect(VALIDATORS.min('ab', { value: 2 })).toBe(true));
    it('max 数字比较', () => expect(VALIDATORS.max(3, { value: 5 })).toBe(true));
    it('max 拒绝超出阈值', () => expect(VALIDATORS.max(10, { value: 5 })).toBe(false));
    it('range 在范围内', () => expect(VALIDATORS.range(5, { min: 1, max: 10 })).toBe(true));
    it('range 拒绝超出', () => expect(VALIDATORS.range(15, { min: 1, max: 10 })).toBe(false));
  });

  describe('regex', () => {
    it('匹配正则', () => expect(VALIDATORS.regex('ABC123', { value: '^[A-Z]+\\d+$' })).toBe(true));
    it('不匹配正则', () => expect(VALIDATORS.regex('abc', { value: '^\\d+$' })).toBe(false));
  });

  describe('url', () => {
    it('通过 https URL', () => expect(VALIDATORS.url('https://example.com')).toBe(true));
    it('通过 http URL', () => expect(VALIDATORS.url('http://example.com')).toBe(true));
    it('拒绝无协议', () => expect(VALIDATORS.url('example.com')).toBe(false));
  });

  describe('number/integer/positive', () => {
    it('number 识别数字', () => expect(VALIDATORS.number('123')).toBe(true));
    it('number 拒绝非数字', () => expect(VALIDATORS.number('abc')).toBe(false));
    it('integer 通过整数', () => expect(VALIDATORS.integer('10')).toBe(true));
    it('integer 拒绝小数', () => expect(VALIDATORS.integer('3.14')).toBe(false));
    it('positive 通过正数', () => expect(VALIDATORS.positive('5')).toBe(true));
    it('positive 拒绝负数', () => expect(VALIDATORS.positive('-1')).toBe(false));
  });

  describe('fileType', () => {
    it('单类型匹配', () => expect(VALIDATORS.fileType('image.png', { value: '.png' })).toBe(true));
    it('多类型匹配', () => expect(VALIDATORS.fileType('doc.pdf', { value: ['.jpg', '.png', '.pdf'] })).toBe(true));
    it('类型不匹配', () => expect(VALIDATORS.fileType('doc.pdf', { value: '.jpg' })).toBe(false));
  });
});

// ============================================================
// validateField — 组合校验
// ============================================================
describe('validateField', () => {
  it('无规则返回 null', () => {
    expect(validateField('any', null)).toBeNull();
  });
  it('非数组规则返回 null', () => {
    expect(validateField('any', 'not-array')).toBeNull();
  });
  it('空规则数组返回 null', () => {
    expect(validateField('any', [])).toBeNull();
  });
  it('全部通过返回 null', () => {
    expect(validateField('test@x.com', [{ rule: 'required' }, { rule: 'email' }])).toBeNull();
  });
  it('首个失败返回错误消息', () => {
    expect(validateField('', [{ rule: 'required', message: '请填写' }, { rule: 'email' }])).toBe('请填写');
  });
  it('无自定义消息使用默认', () => {
    expect(validateField('', [{ rule: 'required' }])).toBe('字段校验失败: required');
  });
  it('未知规则跳过', () => {
    expect(validateField('ok', [{ rule: 'unknown_rule' }])).toBeNull();
  });
});

// ============================================================
// resolveLinkage — 联动条件引擎
// ============================================================
describe('resolveLinkage', () => {
  it('无条件返回 true', () => {
    expect(resolveLinkage({}, {})).toBe(true);
    expect(resolveLinkage({ linkage_conditions: null }, {})).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [] }, {})).toBe(true);
  });

  it('eq — 值相等', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'type', operator: 'eq', value: 'image' }] }, { type: 'image' })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'type', operator: 'eq', value: 'image' }] }, { type: 'video' })).toBe(false);
  });
  it('neq — 值不等', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'type', operator: 'neq', value: 'video' }] }, { type: 'image' })).toBe(true);
  });
  it('gt — 大于', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'count', operator: 'gt', value: 5 }] }, { count: 10 })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'count', operator: 'gt', value: 10 }] }, { count: 5 })).toBe(false);
  });
  it('lt — 小于', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'price', operator: 'lt', value: 100 }] }, { price: 50 })).toBe(true);
  });
  it('gte/lte — 大于等于/小于等于', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'score', operator: 'gte', value: 60 }] }, { score: 60 })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'score', operator: 'lte', value: 100 }] }, { score: 100 })).toBe(true);
  });
  it('in — 值在数组中', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'color', operator: 'in', value: ['red', 'blue'] }] }, { color: 'red' })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'color', operator: 'in', value: ['red', 'blue'] }] }, { color: 'green' })).toBe(false);
  });
  it('contains — 包含子串', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'desc', operator: 'contains', value: 'VIP' }] }, { desc: 'VIP会员' })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'desc', operator: 'contains', value: 'VIP' }] }, { desc: '普通用户' })).toBe(false);
  });
  it('notEmpty — 非空', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'name', operator: 'notEmpty' }] }, { name: 'John' })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'name', operator: 'notEmpty' }] }, { name: '' })).toBe(false);
  });
  it('isEmpty — 为空', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'remark', operator: 'isEmpty' }] }, { remark: '' })).toBe(true);
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'remark', operator: 'isEmpty' }] }, { remark: 'hello' })).toBe(false);
  });
  it('多条件 AND 全满足才为 true', () => {
    const field = { linkage_conditions: [
      { targetField: 'type', operator: 'eq', value: 'image' },
      { targetField: 'count', operator: 'gt', value: 0 },
    ]};
    expect(resolveLinkage(field, { type: 'image', count: 5 })).toBe(true);
    expect(resolveLinkage(field, { type: 'image', count: 0 })).toBe(false);
  });
  it('未知 operator 返回 true', () => {
    expect(resolveLinkage({ linkage_conditions: [{ targetField: 'x', operator: 'unknown' }] }, { x: 1 })).toBe(true);
  });
});

// ============================================================
// maskValue — 数据脱敏
// ============================================================
describe('maskValue', () => {
  it('空值不处理', () => {
    expect(maskValue(null, 'phone')).toBeNull();
    expect(maskValue(undefined, 'phone')).toBeUndefined();
    expect(maskValue('', 'phone')).toBe('');
  });
  it('手机号脱敏', () => {
    expect(maskValue('13800138000', 'phone')).toBe('138****8000');
  });
  it('邮箱脱敏', () => {
    expect(maskValue('john@example.com', 'email')).toBe('jo***@example.com');
  });
  it('身份证脱敏', () => {
    expect(maskValue('110101199001011234', 'idcard')).toBe('1101**********1234');
  });
  it('姓名脱敏 — 3 字', () => {
    expect(maskValue('张三丰', 'name')).toBe('张*丰');
  });
  it('姓名脱敏 — 2 字', () => {
    expect(maskValue('张三', 'name')).toBe('张*三');
  });
  it('姓名脱敏 — 单字', () => {
    expect(maskValue('张', 'name')).toBe('张*');
  });
  it('自定义脱敏', () => {
    expect(maskValue('MySecretKey123', 'custom', 'Secret')).toBe('My***Key123');
  });
  it('自定义无 pattern 返回原值', () => {
    expect(maskValue('hello', 'custom')).toBe('hello');
  });
  it('未知规则返回原值', () => {
    expect(maskValue('hello', 'unknown_rule')).toBe('hello');
  });
});
