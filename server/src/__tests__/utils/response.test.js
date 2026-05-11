import { describe, it, expect, vi } from 'vitest';
import { success, listResult, error } from '../../utils/response.js';


function mockRes() {
  return { json: vi.fn(), status: vi.fn(), setHeader: vi.fn() };
}

describe('success', () => {
  it('默认 msg', () => {
    const res = mockRes();
    success(res, { id: 1 });
    expect(res.json).toHaveBeenCalledWith({ code: 200, msg: 'success', data: { id: 1 } });
  });

  it('自定义 msg', () => {
    const res = mockRes();
    success(res, { id: 2 }, '操作成功');
    expect(res.json).toHaveBeenCalledWith({ code: 200, msg: '操作成功', data: { id: 2 } });
  });
});

describe('listResult', () => {
  it('封装分页数据结构', () => {
    const res = mockRes();
    const data = { list: [{ a: 1 }], total: 100, page: 2, pageSize: 20 };
    listResult(res, data);
    expect(res.json).toHaveBeenCalledWith({ code: 200, msg: 'success', data });
  });
});

describe('error', () => {
  it('返回错误结构', () => {
    const res = mockRes();
    error(res, 400, '参数错误', null);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ code: 400, msg: '参数错误', data: null });
  });
});
