import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedQuery, paginationSQL } from '../../utils/pagination.js';

describe('parsePagination', () => {
  it('默认值', () => {
    const r = parsePagination({});
    expect(r).toEqual({ page: 1, pageSize: 20, offset: 0, sort: 'id', order: 'DESC' });
  });

  it('解析自定义 page/pageSize', () => {
    const r = parsePagination({ page: '3', pageSize: '10' });
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(10);
    expect(r.offset).toBe(20);
  });

  it('pageSize 超过最大值时回退默认值', () => {
    const r = parsePagination({ pageSize: '500' });
    expect(r.pageSize).toBe(20);
  });

  it('非正数回退默认值', () => {
    const r = parsePagination({ page: '-1', pageSize: '0' });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
  });

  it('自定义默认值', () => {
    const r = parsePagination({}, { defaultPageSize: 50, maxPageSize: 100, defaultSort: 'create_time' });
    expect(r.pageSize).toBe(50);
    expect(r.sort).toBe('create_time');
  });

  it('sort 白名单过滤非法字段', () => {
    const r = parsePagination({ sort: 'username' }, { allowedSortFields: ['id', 'create_time'] });
    expect(r.sort).toBe('id');
  });

  it('非法 order 回退默认值', () => {
    const r = parsePagination({ order: 'INVALID' });
    expect(r.order).toBe('DESC');
  });

  it('解析合法 ASC order', () => {
    const r = parsePagination({ order: 'asc' });
    expect(r.order).toBe('ASC');
  });
});

describe('paginatedQuery', () => {
  it('同时调用 countFn 和 listFn 并合并结果', async () => {
    const countFn = async () => 42;
    const listFn = async () => [{ id: 1 }, { id: 2 }];
    const r = await paginatedQuery({ query: { page: '2', pageSize: '10' } }, countFn, listFn);
    expect(r).toEqual({ list: [{ id: 1 }, { id: 2 }], total: 42, page: 2, pageSize: 10 });
  });
});

describe('paginationSQL', () => {
  it('生成标准分页 SQL 后缀及参数', () => {
    const { sql, params } = paginationSQL({ page: 1, pageSize: 20, offset: 0, sort: 'create_time', order: 'DESC' }, ['create_time', 'id', 'updated_at']);
    expect(sql).toBe('ORDER BY create_time DESC LIMIT ? OFFSET ?');
    expect(params).toEqual([20, 0]);
  });
});
