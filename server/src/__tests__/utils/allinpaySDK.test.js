import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/allinpay.js', () => ({
  default: { isSandbox: true, cusid: '', privateKeyPath: '', publicKeyPath: '', appid: '', baseUrl: '', returnUrl: '', notifyUrl: '', signType: 'RSA-SHA1' },
}));
vi.mock('../../utils/logger.js', () => ({ default: { info: () => {}, warn: () => {}, error: () => {} } }));

import { buildSignString } from '../../utils/allinpaySDK.js';

describe('buildSignString', () => {
  it('空对象返回空字符串', () => {
    expect(buildSignString({})).toBe('');
  });

  it('单键值对正常拼接', () => {
    expect(buildSignString({ cusid: 'TEST001' })).toBe('cusid=TEST001');
  });

  it('多键按 ASCII 排序', () => {
    const result = buildSignString({ trxamt: '100', cusid: 'TEST001', appid: 'APP01' });
    expect(result).toBe('appid=APP01&cusid=TEST001&trxamt=100');
  });

  it('过滤 sign 字段', () => {
    const result = buildSignString({ cusid: 'TEST001', sign: 'xxxxx', trxamt: '100' });
    expect(result).toBe('cusid=TEST001&trxamt=100');
  });

  it('过滤空字符串', () => {
    const result = buildSignString({ cusid: 'TEST001', remark: '', trxamt: '100' });
    expect(result).toBe('cusid=TEST001&trxamt=100');
  });

  it('过滤 null 和 undefined', () => {
    const result = buildSignString({ cusid: 'TEST001', remark: null, body: undefined, trxamt: '100' });
    expect(result).toBe('cusid=TEST001&trxamt=100');
  });

  it('仅含 sign 和空值返回空字符串', () => {
    expect(buildSignString({ sign: 'xxx', remark: '', body: null })).toBe('');
  });

  it('中文值正常拼接', () => {
    expect(buildSignString({ body: '会员充值', cusid: 'TEST' })).toBe('body=会员充值&cusid=TEST');
  });

  it('数字 0 值视为有效值保留', () => {
    expect(buildSignString({ trxamt: 0, cusid: 'TEST' })).toBe('cusid=TEST&trxamt=0');
  });
});
