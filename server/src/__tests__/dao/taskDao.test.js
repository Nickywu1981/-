import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute } }));
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-123') }));

import * as taskDao from '../../dao/taskDao.js';

describe('taskDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('createTask 返回 UUID', async () => {
    mockExecute.mockResolvedValue([]);
    const id = await taskDao.createTask({ userId: 1, type: 'cutout', title: 'test', inputParams: {} });
    expect(id).toBe('mock-uuid-123');
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO task'),
      expect.arrayContaining(['mock-uuid-123', 1, 'cutout', 'test']),
    );
  });

  it('getTask 找到并解析 JSON 字段', async () => {
    mockExecute.mockResolvedValue([[{ id: 't1', input_params: '{"key":"val"}', output_result: '{"url":"x"}' }]]);
    const r = await taskDao.getTask('t1', 1);
    expect(r.input_params).toEqual({ key: 'val' });
    expect(r.output_result).toEqual({ url: 'x' });
  });

  it('getTask 未找到返回 null', async () => {
    mockExecute.mockResolvedValue([[]]);
    expect(await taskDao.getTask('bad', 1)).toBeNull();
  });

  it('listUserTasks 带筛选条件', async () => {
    mockExecute.mockResolvedValue([[{ id: 't1' }]]);
    const rows = await taskDao.listUserTasks(1, { status: 1, type: 'cutout', page: 1, pageSize: 20 });
    expect(rows).toHaveLength(1);
  });

  it('countUserTasks 返回总数', async () => {
    mockExecute.mockResolvedValue([[{ total: 15 }]]);
    expect(await taskDao.countUserTasks(1, { status: 0 })).toBe(15);
  });

  it('updateTaskStatus 动态构建 SQL', async () => {
    mockExecute.mockResolvedValue([]);
    await taskDao.updateTaskStatus('t1', 1, { status: 2, progress: 100, progressMsg: '完成', outputResult: { url: 'x' } });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE task'),
      expect.arrayContaining([2, 100, '完成', '{"url":"x"}', 't1', 1]),
    );
  });

  it('getPendingTasks 返回解析 JSON 的任务', async () => {
    mockExecute.mockResolvedValue([[{ id: 't1', input_params: '{"a":1}' }]]);
    const tasks = await taskDao.getPendingTasks(3);
    expect(tasks[0].input_params).toEqual({ a: 1 });
  });
});
