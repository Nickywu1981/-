import { describe, it, expect } from 'vitest';
import { withTenant, insertWithTenant, mustTenant } from '../../utils/tenantFilter.js';

// ============================================================
// withTenant — 为 SQL 附加 tenant_id 过滤条件
// ============================================================
describe('withTenant', () => {
  it('已有 WHERE 追加 AND tenant_id = ?', () => {
    const result = withTenant('SELECT * FROM image WHERE status = 1', [1], 42);
    expect(result.sql).toBe('SELECT * FROM image WHERE status = 1 AND tenant_id = ?');
    expect(result.params).toEqual([1, 42]);
  });

  it('无条件时注入 WHERE tenant_id = ?', () => {
    const result = withTenant('SELECT * FROM image', [], 42);
    expect(result.sql).toBe('SELECT * FROM image WHERE tenant_id = ?');
    expect(result.params).toEqual([42]);
  });

  it('区分大小写 — where 小写也能识别', () => {
    const result = withTenant('select * from image where status = 1', [1], 99);
    expect(result.sql).toBe('select * from image where status = 1 AND tenant_id = ?');
  });

  it('WHERE 大写也可识别', () => {
    const result = withTenant('SELECT * FROM task WHERE priority > 0', [], 5);
    expect(result.sql).toContain('AND tenant_id = ?');
  });

  it('支持表别名前缀', () => {
    const result = withTenant('SELECT * FROM user u WHERE u.status = 1', [1], 7, 'u');
    expect(result.sql).toBe('SELECT * FROM user u WHERE u.status = 1 AND u.tenant_id = ?');
    expect(result.params).toEqual([1, 7]);
  });

  it('别名无 WHERE 时注入', () => {
    const result = withTenant('SELECT * FROM task t', [], 10, 't');
    expect(result.sql).toBe('SELECT * FROM task t WHERE t.tenant_id = ?');
  });

  it('params 为空数组不报错', () => {
    const result = withTenant('SELECT * FROM image', [], 1);
    expect(result.params).toEqual([1]);
  });

  it('baseSQL 中 WHERE 不在末尾也能匹配', () => {
    const result = withTenant(
      'SELECT * FROM image WHERE status = 1 ORDER BY created_at',
      [1], 3,
    );
    expect(result.sql).toContain('AND tenant_id = ?');
  });
});

// ============================================================
// insertWithTenant — 为 INSERT 附加 tenant_id 列
// ============================================================
describe('insertWithTenant', () => {
  it('标准 INSERT 追加列和占位符', () => {
    const result = insertWithTenant(
      'INSERT INTO image (user_id, url) VALUES (?, ?)',
      [1, 'https://a.jpg'], 42,
    );
    expect(result.sql).toBe('INSERT INTO image (user_id, url, tenant_id) VALUES (?, ?, ?)');
    expect(result.params).toEqual([1, 'https://a.jpg', 42]);
  });

  it('多列 INSERT', () => {
    const result = insertWithTenant(
      'INSERT INTO task (title, priority, status) VALUES (?, ?, ?)',
      ['Test', 2, 'todo'], 5,
    );
    expect(result.sql).toBe('INSERT INTO task (title, priority, status, tenant_id) VALUES (?, ?, ?, ?)');
    expect(result.params).toHaveLength(4);
    expect(result.params[3]).toBe(5);
  });

  it('无 VALUES 关键字保持不变', () => {
    const result = insertWithTenant(
      'INSERT INTO log SELECT * FROM log_backup',
      [], 10,
    );
    expect(result.sql).toBe('INSERT INTO log SELECT * FROM log_backup');
    expect(result.params).toEqual([]);
  });

  it('空 params 也能追加', () => {
    const result = insertWithTenant(
      'INSERT INTO user (name) VALUES (?)',
      [], 1,
    );
    expect(result.params).toEqual([1]);
  });

  it('params 为 undefined 视为空数组', () => {
    const result = insertWithTenant(
      'INSERT INTO user (name) VALUES (?)',
      undefined, 1,
    );
    expect(result.params).toEqual([1]);
  });
});

// ============================================================
// mustTenant — 校验 tenantId 合法性
// ============================================================
describe('mustTenant', () => {
  it('有效 tenantId 返回 null error', () => {
    expect(mustTenant(1)).toEqual({ error: null });
    expect(mustTenant(42)).toEqual({ error: null });
    expect(mustTenant(999999)).toEqual({ error: null });
  });

  it('tenantId 为 0 返回错误', () => {
    expect(mustTenant(0)).toEqual({ error: 'tenant_id is required' });
  });

  it('tenantId 为负数返回错误', () => {
    expect(mustTenant(-1)).toEqual({ error: 'tenant_id is required' });
  });

  it('tenantId 为 null 返回错误', () => {
    expect(mustTenant(null)).toEqual({ error: 'tenant_id is required' });
  });

  it('tenantId 为 undefined 返回错误', () => {
    expect(mustTenant(undefined)).toEqual({ error: 'tenant_id is required' });
  });

  it('tenantId 为 0 字符串也被拒绝', () => {
    expect(mustTenant('0')).toEqual({ error: 'tenant_id is required' });
  });
});
