import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());
const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { query: mockQuery, execute: mockExecute } }));

const mockConnQuery = vi.hoisted(() => vi.fn());
const mockWithTransaction = vi.hoisted(() => vi.fn((fn) => fn({ query: mockConnQuery })));

vi.mock('../../dao/transaction.js', () => ({ withTransaction: mockWithTransaction }));

const mockGetRedis = vi.hoisted(() => vi.fn());

vi.mock('../../dao/redis.js', () => ({ getRedis: mockGetRedis }));

import * as dao from '../../dao/diyDao.js';

describe('diyDao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRedis.mockResolvedValue(null); // 默认无Redis
  });

  // ── 页面列表 ──

  it('listPages 默认查询不含 status=3', async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([[]]);
    const r = await dao.listPages('t1', {});
    expect(r.total).toBe(0);
    expect(r.list).toEqual([]);
    expect(mockQuery.mock.calls[0][0]).toContain('AND status != 3');
  });

  it('listPages status=3 应包含已删除', async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);
    const r = await dao.listPages('t1', { status: 3 });
    // status=3 不应排除 status!=3 的过滤
    expect(r.total).toBe(2);
    expect(mockQuery.mock.calls[0][0]).not.toContain('AND status != 3');
  });

  it('listPages 多条件筛选应追加 AND', async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([[]]);
    await dao.listPages('t1', { pageType: 'mobile', accessType: 'public', keyword: '促销' });
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('page_type = ?');
    expect(sql).toContain('access_type = ?');
    expect(sql).toContain('title LIKE ?');
  });

  // ── 页面详情 ──

  it('getPageById 带tenant隔离查询', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 10, tenant_id: 't1', title: 'Test',
      mobile_config: JSON.stringify({ sections: [] }),
      pc_config: null, meta_json: null,
    }]]);
    const page = await dao.getPageById(10, 't1');
    expect(page.id).toBe(10);
    expect(page.mobile_config).toEqual({ sections: [] });
    expect(page.pc_config).toEqual({});
    expect(mockQuery.mock.calls[0][1]).toEqual([10, 't1']);
  });

  it('getPageById 不存在返回null', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    expect(await dao.getPageById(999, 't1')).toBeNull();
  });

  it('getPagesByIds 空数组返回空', async () => {
    expect(await dao.getPagesByIds([], 't1')).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('getPagesByIds 应展开IN子句', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, mobile_config: '{}', pc_config: '{}', meta_json: null },
      { id: 2, mobile_config: '{}', pc_config: '{}', meta_json: null },
    ]]);
    const pages = await dao.getPagesByIds([1, 2], 't1');
    expect(pages).toHaveLength(2);
    expect(mockQuery.mock.calls[0][0]).toContain('id IN (?,?)');
  });

  // ── 创建页面 ──

  it('createPage 返回insertId', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 42 }]);
    const id = await dao.createPage({
      tenantId: 't1', ownerId: 100, title: '新页面', slug: 'new-page',
      pageType: 'mobile', accessType: 'public',
    });
    expect(id).toBe(42);
    expect(mockQuery.mock.calls[0][1][0]).toBe('t1');
  });

  // ── 更新页面 ──

  it('updatePage 仅更新allowed字段', async () => {
    // 无 slug 变更 → 不需要 getSlugById
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const r = await dao.updatePage(10, 't1', { title: 'New Title', _hack: true });
    expect(r).toBe(1);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('title = ?');
    expect(sql).not.toContain('_hack');
  });

  it('updatePage 状态=1应自动设publish_time', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await dao.updatePage(10, 't1', { status: 1 });
    expect(mockQuery.mock.calls[0][0]).toContain('publish_time = NOW()');
  });

  it('updatePage 空fields返回0', async () => {
    expect(await dao.updatePage(10, 't1', {})).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // ── 状态机 ──

  it('softDeletePage 设status=3', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const r = await dao.softDeletePage(10, 't1');
    expect(r).toBe(1);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('status = 3');
    expect(mockQuery.mock.calls[0][1]).toEqual([10, 't1']);
  });

  it('restorePage 仅恢复status=3的页面', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await dao.restorePage(10, 't1');
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('status = 0');
    expect(sql).toContain('status = 3');
  });

  it('hardDeletePage 应在事务中删除版本+页面', async () => {
    mockQuery.mockResolvedValueOnce([[{ slug: 'test' }]]); // _getSlugById
    await dao.hardDeletePage(10, 't1');
    expect(mockWithTransaction).toHaveBeenCalled();
    expect(mockConnQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM diy_page_version'),
      [10],
    );
    expect(mockConnQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM diy_page'),
      [10, 't1'],
    );
  });

  it('unpublishPage 设status=2', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await dao.unpublishPage(10, 't1');
    expect(mockQuery.mock.calls[0][0]).toContain('status = 2');
  });

  it('republishPage 设status=1 仅status=2时可操作', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await dao.republishPage(10, 't1');
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('status = 1');
    expect(sql).toContain('status = 2');
  });

  // ── 版本管理 ──

  it('saveVersion 应使用FOR UPDATE防并发', async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ v: 5 }]])  // MAX(version)
      .mockResolvedValueOnce([{}]);          // INSERT
    const v = await dao.saveVersion(10, { sections: [] }, { sections: [] }, { remark: 'v5' });
    expect(v).toBe(5);
    expect(mockConnQuery.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('saveVersion auto_save=true应清理旧自动保存', async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ v: 3 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]); // cleanup
    await dao.saveVersion(10, { sections: [] }, { sections: [] }, { autoSave: true });
    expect(mockConnQuery.mock.calls[2][0]).toContain('DELETE FROM diy_page_version');
  });

  it('listVersions 默认排除auto_save', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    await dao.listVersions(10);
    expect(mockQuery.mock.calls[0][0]).toContain('auto_save = 0');
  });

  it('listVersions includeAuto=true 包含自动保存', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    await dao.listVersions(10, { includeAuto: true });
    expect(mockQuery.mock.calls[0][0]).not.toContain('auto_save = 0');
  });

  it('getVersion 不存在返回null', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    expect(await dao.getVersion(10, 99)).toBeNull();
  });

  it('getVersion 应parseJson返回结构化config', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, page_id: 10, version: 2, mobile_config: '{"a":1}', pc_config: '{}', remark: 'v2' },
    ]]);
    const v = await dao.getVersion(10, 2);
    expect(v.mobile_config).toEqual({ a: 1 });
    expect(v.pc_config).toEqual({});
  });

  // ── 组件库 ──

  it('listComponents 应包含租户组件+内置组件', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, is_builtin: 1 }, { id: 2, is_builtin: 0 },
    ]]);
    const list = await dao.listComponents('t1');
    expect(list).toHaveLength(2);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('is_builtin = 1');
  });

  it('createComponent 返回insertId', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 99 }]);
    const id = await dao.createComponent({
      tenantId: 't1', name: 'Button', componentCode: 'btn-01', category: 'basic',
    });
    expect(id).toBe(99);
  });

  // ── 批量操作 ──

  it('batchUpdateStatus 空数组返回空结果', async () => {
    expect(await dao.batchUpdateStatus([], 't1', 1)).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('batchUpdateStatus 应执行UPDATE', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 2 }]);
    const r = await dao.batchUpdateStatus([1, 2], 't1', 1);
    expect(r).toBe(2);
  });

  it('batchPublishWithVersions 应在事务中批量操作', async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]])  // SELECT pages
      .mockResolvedValueOnce([[{ id: 1, v: 3 }, { id: 2, v: 5 }]]) // MAX version
      .mockResolvedValueOnce([{}])  // INSERT versions
      .mockResolvedValueOnce([{}]); // UPDATE latest_published_version
    const results = await dao.batchPublishWithVersions([1, 2], 't1');
    expect(results.every(r => r.success)).toBe(true);
    expect(mockWithTransaction).toHaveBeenCalled();
  });

  // ── 事务方法 ──

  it('createPageWithVersion 应在事务中创建页面+初始版本', async () => {
    mockConnQuery
      .mockResolvedValueOnce([{ insertId: 100 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id: 100, title: '测试' }]]);
    const page = await dao.createPageWithVersion({
      tenantId: 't1', ownerId: 1, title: '测试', slug: 'test',
    });
    expect(page.id).toBe(100);
    expect(mockWithTransaction).toHaveBeenCalled();
  });

  it('publishWithVersion 应FOR UPDATE防并发', async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ v: 3 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);
    const v = await dao.publishWithVersion(10, 't1', {}, {}, 'test-slug');
    expect(v).toBe(3);
    expect(mockConnQuery.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('cloneWithVersion 应生成唯一slug', async () => {
    mockConnQuery
      .mockResolvedValueOnce([{ insertId: 200 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id: 200, title: '测试（克隆版）' }]]);
    const page = await dao.cloneWithVersion(
      { id: 10, owner_id: 1, title: '测试', slug: 'test', page_type: 'mobile', access_type: 'public', mobile_config: {}, pc_config: {}, meta_json: null },
      't1',
    );
    expect(page.title).toContain('克隆版');
    expect(mockConnQuery.mock.calls[0][1][3]).toContain('clone');
  });
});
