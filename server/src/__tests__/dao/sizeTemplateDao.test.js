import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute } }));

import * as sizeTemplateDao from '../../dao/sizeTemplateDao.js';

describe('sizeTemplateDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listPlatformSizes 全部平台', async () => {
    mockExecute.mockResolvedValue([[{ id: 1, platform: '淘宝' }, { id: 2, platform: '抖音' }]]);
    const rows = await sizeTemplateDao.listPlatformSizes();
    expect(rows).toHaveLength(2);
  });

  it('listPlatformSizes 按平台过滤', async () => {
    mockExecute.mockResolvedValue([[{ id: 1, platform: '淘宝' }]]);
    const rows = await sizeTemplateDao.listPlatformSizes('淘宝');
    expect(rows[0].platform).toBe('淘宝');
  });

  it('getPlatformById', async () => {
    mockExecute.mockResolvedValue([[{ id: 10, label: '主图' }]]);
    expect((await sizeTemplateDao.getPlatformById(10)).label).toBe('主图');
  });

  it('listPlatforms 返回平台名数组', async () => {
    mockExecute.mockResolvedValue([[{ platform: '淘宝' }, { platform: '抖音' }]]);
    expect(await sizeTemplateDao.listPlatforms()).toEqual(['淘宝', '抖音']);
  });

  it('insertUserTemplate', async () => {
    mockExecute.mockResolvedValue([{ insertId: 5 }]);
    expect(await sizeTemplateDao.insertUserTemplate({ userId: 1, name: '自定义', width: 800, height: 800 })).toBe(5);
  });

  it('updateUserTemplate 成功返回 true', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    expect(await sizeTemplateDao.updateUserTemplate(1, 1, { name: 'u', width: 100, height: 200, platform: '淘宝' })).toBe(true);
  });

  it('deleteUserTemplate 软删除', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    expect(await sizeTemplateDao.deleteUserTemplate(1, 1)).toBe(true);
  });

  it('listUserTemplates', async () => {
    mockExecute.mockResolvedValue([[{ id: 1 }, { id: 2 }]]);
    expect(await sizeTemplateDao.listUserTemplates(1)).toHaveLength(2);
  });

  it('countUserTemplates', async () => {
    mockExecute.mockResolvedValue([[{ total: 3 }]]);
    expect(await sizeTemplateDao.countUserTemplates(1)).toBe(3);
  });
});
