import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/taskDao.js');
vi.mock('../../services/creditService.js');

import * as imageService from '../../services/imageService.js';
import * as taskDao from '../../dao/taskDao.js';
import * as creditService from '../../services/creditService.js';

describe('imageService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('submitMainImage', () => {
    it('扣除点数、创建任务、返回 taskId', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('mock-task-001');
      const r = await imageService.submitMainImage(1, { imageUrl: '/a.png', platform: '淘宝', style: 'simple' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'enhance');
      expect(taskDao.createTask).toHaveBeenCalledWith(expect.objectContaining({ type: 'main_image' }));
      expect(r.taskId).toBe('mock-task-001');
      expect(r.estimatedSeconds).toBeGreaterThan(0);
    });
  });

  describe('submitSceneImage', () => {
    it('扣除 scene 点数并创建任务', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('task-scene');
      const r = await imageService.submitSceneImage(1, { imageUrl: '/a.png', sceneCategory: '室内' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'scene');
      expect(r.taskId).toBe('task-scene');
    });
  });

  describe('submitDetailH5', () => {
    it('扣除详情点数并创建任务', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('task-detail');
      const r = await imageService.submitDetailH5(1, { imageUrl: '/a.png', category: '服装' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'detail_h5');
      expect(r.taskId).toBe('task-detail');
    });
  });

  describe('getTaskResult', () => {
    it('任务存在时返回', async () => {
      taskDao.getTask.mockResolvedValue({ id: 't1', status: 2 });
      expect(await imageService.getTaskResult('t1', 1)).toEqual({ id: 't1', status: 2 });
    });

    it('任务不存在抛出 404', async () => {
      taskDao.getTask.mockResolvedValue(null);
      await expect(imageService.getTaskResult('bad', 1)).rejects.toThrow('任务不存在');
    });
  });

  describe('listMyTasks', () => {
    it('返回分页任务列表', async () => {
      taskDao.listUserTasks.mockResolvedValue([{ id: 't1' }]);
      taskDao.countUserTasks.mockResolvedValue(5);
      const r = await imageService.listMyTasks(1, { page: 1, pageSize: 20 });
      expect(r.list).toHaveLength(1);
      expect(r.total).toBe(5);
    });
  });
});
