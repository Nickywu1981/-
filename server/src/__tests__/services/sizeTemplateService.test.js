import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/sizeTemplateDao.js');

import * as sizeTemplateService from '../../services/sizeTemplateService.js';
import * as sizeTemplateDao from '../../dao/sizeTemplateDao.js';

describe('sizeTemplateService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getAllPlatformSizes', () => {
    it('按平台分组', async () => {
      sizeTemplateDao.listPlatformSizes.mockResolvedValue([
        { platform: '淘宝', id: 1, label: '主图' },
        { platform: '淘宝', id: 2, label: '详情' },
        { platform: '抖音', id: 3, label: '封面' },
      ]);
      const r = await sizeTemplateService.getAllPlatformSizes();
      expect(r['淘宝']).toHaveLength(2);
      expect(r['抖音']).toHaveLength(1);
    });
  });

  describe('getPlatformList', () => {
    it('委托 DAO', async () => {
      sizeTemplateDao.listPlatforms.mockResolvedValue(['淘宝', '抖音']);
      expect(await sizeTemplateService.getPlatformList()).toEqual(['淘宝', '抖音']);
    });
  });

  describe('getSizesByPlatform', () => {
    it('委托 DAO', async () => {
      sizeTemplateDao.listPlatformSizes.mockResolvedValue([{ id: 1 }]);
      expect(await sizeTemplateService.getSizesByPlatform('淘宝')).toHaveLength(1);
    });
  });

  describe('createUserTemplate', () => {
    it('缺少必填字段抛出 400', async () => {
      await expect(sizeTemplateService.createUserTemplate(1, { name: '', width: 0, height: 0 }))
        .rejects.toThrow();
    });

    it('非法尺寸抛出错误', async () => {
      await expect(sizeTemplateService.createUserTemplate(1, { name: 't', width: -1, height: 100 }))
        .rejects.toThrow();
    });

    it('成功创建返回模板信息', async () => {
      sizeTemplateDao.insertUserTemplate.mockResolvedValue(10);
      const r = await sizeTemplateService.createUserTemplate(1, { name: '自定义', width: 800, height: 800 });
      expect(r.id).toBe(10);
    });
  });

  describe('deleteUserTemplate', () => {
    it('模板不存在抛出 404', async () => {
      sizeTemplateDao.getUserTemplateById.mockResolvedValue(null);
      await expect(sizeTemplateService.deleteUserTemplate(1, 99)).rejects.toThrow();
    });
  });

  describe('listUserTemplates', () => {
    it('返回列表和总数', async () => {
      sizeTemplateDao.listUserTemplates.mockResolvedValue([{ id: 1 }]);
      sizeTemplateDao.countUserTemplates.mockResolvedValue(1);
      const r = await sizeTemplateService.listUserTemplates(1);
      expect(r.list).toHaveLength(1);
      expect(r.total).toBe(1);
    });
  });
});
