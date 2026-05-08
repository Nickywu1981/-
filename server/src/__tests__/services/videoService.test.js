import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/taskDao.js');
vi.mock('../../service/creditService.js');

import * as videoService from '../../services/videoService.js';
import * as taskDao from '../../dao/taskDao.js';
import * as creditService from '../../service/creditService.js';

describe('videoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('submitImg2Video', () => {
    it('扣除点数并创建任务', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('task-v1');
      const r = await videoService.submitImg2Video(1, { imageUrl: '/a.png', style: 'fast', duration: 15 });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'img2video');
      expect(r.taskId).toBe('task-v1');
    });
  });

  describe('submitMulti2Video', () => {
    it('扣除 multi2video 点数', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('task-v2');
      const r = await videoService.submitMulti2Video(1, { imageUrls: ['/a.png', '/b.png'], style: 'fashion' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'multi2video');
      expect(r.taskId).toBe('task-v2');
    });
  });

  describe('submitActionTransfer', () => {
    it('扣除动作迁移点数', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('task-at');
      const r = await videoService.submitActionTransfer(1, { sourceImageUrl: '/a.png', actionVideoUrl: '/v.mp4' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'action_transfer');
      expect(r.taskId).toBe('task-at');
    });
  });

  describe('submitDigitalHuman', () => {
    it('扣除数字人点数', async () => {
      creditService.consumeCredit.mockResolvedValue(undefined);
      taskDao.createTask.mockResolvedValue('task-dh');
      const r = await videoService.submitDigitalHuman(1, { script: 'hello', voice: 'female', avatar: 'default' });
      expect(creditService.consumeCredit).toHaveBeenCalledWith(1, 'digital_human');
      expect(r.taskId).toBe('task-dh');
    });
  });

  describe('getTaskResult', () => {
    it('委托 DAO 查询', async () => {
      taskDao.getTask.mockResolvedValue({ id: 't1', status: 2 });
      expect(await videoService.getTaskResult('t1', 1)).toEqual({ id: 't1', status: 2 });
    });
  });

  describe('listMyTasks', () => {
    it('返回分页', async () => {
      taskDao.listUserTasks.mockResolvedValue([]);
      taskDao.countUserTasks.mockResolvedValue(0);
      const r = await videoService.listMyTasks(1, {});
      expect(r.list).toHaveLength(0);
    });
  });
});
