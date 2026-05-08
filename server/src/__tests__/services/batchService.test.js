import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/taskDao.js');
vi.mock('../../dao/batchTemplateDao.js');
vi.mock('../../service/creditService.js');

import * as batchService from '../../services/batchService.js';
import * as taskDao from '../../dao/taskDao.js';
import * as batchTemplateDao from '../../dao/batchTemplateDao.js';
import * as creditService from '../../service/creditService.js';

describe('batchService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('submitBatchTask', () => {
    it('空图片列表抛出 400', async () => {
      await expect(batchService.submitBatchTask(1, { imageUrls: [], operation: 'cutout' }))
        .rejects.toThrow('请上传至少一张图片');
    });

    it('普通模式扣除点数并创建任务', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('batch-1');
      const r = await batchService.submitBatchTask(1, { imageUrls: ['/a.png', '/b.png'], operation: 'cutout', platform: '淘宝' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'cutout', 2);
      expect(r.taskId).toBe('batch-1');
      expect(r.batchSize).toBe(2);
    });

    it('夜间模式不立即扣费', async () => {
      taskDao.createTask.mockResolvedValue('night-1');
      const r = await batchService.submitBatchTask(1, { imageUrls: ['/a.png'], operation: 'cutout', nightMode: true });
      expect(creditService.consumeCredit).not.toHaveBeenCalled();
      expect(r.nightMode).toBe(true);
    });
  });

  describe('saveBatchTemplate', () => {
    it('保存模板', async () => {
      batchTemplateDao.insertTemplate.mockResolvedValue(3);
      const r = await batchService.saveBatchTemplate(1, { name: 'B1', operation: 'cutout', platform: '淘宝', style: '简约', nightMode: false, imageCount: 10 });
      expect(r).toBe(3);
    });
  });

  describe('deleteBatchTemplate', () => {
    it('模板不存在抛出 404', async () => {
      batchTemplateDao.getTemplate.mockResolvedValue(null);
      await expect(batchService.deleteBatchTemplate(1, 99)).rejects.toThrow('模板不存在');
    });

    it('成功删除', async () => {
      batchTemplateDao.getTemplate.mockResolvedValue({ id: 1, name: 'B1' });
      batchTemplateDao.deleteTemplate.mockResolvedValue(undefined);
      await expect(batchService.deleteBatchTemplate(1, 1)).resolves.toBeUndefined();
    });
  });

  describe('listBatchTemplates', () => {
    it('返回模板列表', async () => {
      batchTemplateDao.listTemplates.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      expect(await batchService.listBatchTemplates(1)).toHaveLength(2);
    });
  });

  describe('getTaskResult', () => {
    it('委托 DAO', async () => {
      taskDao.getTask.mockResolvedValue({ id: 't1' });
      expect(await batchService.getTaskResult('t1', 1)).toEqual({ id: 't1' });
    });
  });

  describe('listBatchHistory', () => {
    it('返回分页历史', async () => {
      taskDao.listUserTasks.mockResolvedValue([{ id: 'b1' }]);
      taskDao.countUserTasks.mockResolvedValue(10);
      const r = await batchService.listBatchHistory(1, { page: 1, pageSize: 20 });
      expect(r.list).toHaveLength(1);
    });
  });
});
