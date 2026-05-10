import { describe, it, expect, vi } from 'vitest';
import { guardSQL, sqlGuardMiddleware } from '../../utils/sqlGuard.js';

describe('guardSQL', () => {
  it('null/undefined 透露', () => {
    expect(guardSQL(null)).toBeNull();
    expect(guardSQL(undefined)).toBeUndefined();
  });

  it('数字直通', () => {
    expect(guardSQL(42)).toBe(42);
    expect(guardSQL(0)).toBe(0);
  });

  it('正常字符串不拦截', () => {
    expect(guardSQL('hello world')).toBe('hello world');
    expect(guardSQL('test@example.com')).toBe('test@example.com');
  });

  it('拦截 UNION SELECT', () => {
    expect(() => guardSQL("1' UNION SELECT * FROM user")).toThrow();
  });

  it('拦截 OR 注入', () => {
    expect(() => guardSQL("' OR '1'='1")).toThrow();
  });

  it('拦截 SQL 注释', () => {
    expect(() => guardSQL("admin'--")).toThrow();
  });
});

describe('sqlGuardMiddleware', () => {
  it('正常请求通过', () => {
    const req = { query: { page: '1' }, body: { name: 'test' } };
    const next = vi.fn();
    sqlGuardMiddleware(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('恶意 query 参数被拦截返回 400', () => {
    const json = vi.fn();
    const status = vi.fn();
    const res = { json, status, setHeader: vi.fn() };
    const req = { query: { q: "1' UNION SELECT" }, body: {} };
    const next = vi.fn();
    sqlGuardMiddleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 400 }));
    expect(next).not.toHaveBeenCalled();
  });
});
