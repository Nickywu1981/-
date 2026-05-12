import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDao = {
  listTasks: vi.fn(),
  createTask: vi.fn(),
  cancelTask: vi.fn(),
  getTaskById: vi.fn(),
  updateTaskStatus: vi.fn(),
  tryStartTask: vi.fn(),
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
  listAllTasks: vi.fn(),
};

vi.mock('../../dao/automationDao.js', () => ({ default: mockDao }));

const {
  createTask,
  cancelTask,
  executeTask,
  createAccount,
  deleteAccount,
} = await import('../../services/automationService.js');

describe('automationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // —— createTask ——
  describe('createTask', () => {
    it('creates task for valid taskType and returns { id }', async () => {
      mockDao.createTask.mockResolvedValue(42);
      const result = await createTask('u1', 't1', { accountId: 1, taskType: 'product_on', taskConfig: { url: 'a' } });
      expect(mockDao.createTask).toHaveBeenCalledWith({
        tenantId: 't1', userId: 'u1', accountId: 1, taskType: 'product_on',
        taskConfig: '{"url":"a"}',
      });
      expect(result).toEqual({ id: 42 });
    });

    it('creates task with null taskConfig when undefined', async () => {
      mockDao.createTask.mockResolvedValue(1);
      await createTask('u1', 't1', { taskType: 'ship_order' });
      expect(mockDao.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ taskConfig: null }),
      );
    });

    it('throws 400 for invalid taskType', async () => {
      await expect(
        createTask('u1', 't1', { taskType: 'bad_type' }),
      ).rejects.toMatchObject({ message: '无效的任务类型', status: 400 });
    });

    it('accepts all 5 valid taskTypes', async () => {
      mockDao.createTask.mockResolvedValue(1);
      for (const tt of ['product_on', 'product_off', 'ship_order', 'reply_review', 'stock_check']) {
        await expect(createTask('u1', 't1', { taskType: tt })).resolves.toBeDefined();
      }
    });
  });

  // —— cancelTask ——
  describe('cancelTask', () => {
    it('returns true when DAO cancels successfully', async () => {
      mockDao.cancelTask.mockResolvedValue(true);
      const ok = await cancelTask(10, 'u1');
      expect(ok).toBe(true);
    });

    it('throws 400 when cancel returns falsy', async () => {
      mockDao.cancelTask.mockResolvedValue(false);
      await expect(cancelTask(99, 'u1')).rejects.toMatchObject({
        message: '任务不存在或不可取消', status: 400,
      });
    });
  });

  // —— executeTask ——
  describe('executeTask', () => {
    it('throws 404 when task not found', async () => {
      mockDao.getTaskById.mockResolvedValue(null);
      await expect(executeTask(999)).rejects.toMatchObject({
        message: '任务不存在', status: 404,
      });
    });

    it('updates status to 1 (running) and returns { taskId, status: 1 }', async () => {
      mockDao.getTaskById.mockResolvedValue({ id: 10, task_type: 'product_on', status: 0, user_id: undefined, tenant_id: undefined });
      mockDao.tryStartTask.mockResolvedValue(1);
      const result = await executeTask(10);
      expect(mockDao.tryStartTask).toHaveBeenCalledWith(10, undefined, undefined);
      expect(result).toEqual({ taskId: 10, status: 1 });
    });

    it('schedules async completion with task type label', async () => {
      vi.useFakeTimers();
      mockDao.getTaskById.mockResolvedValue({ id: 10, task_type: 'product_on', status: 0, user_id: undefined, tenant_id: undefined });
      mockDao.tryStartTask.mockResolvedValue(1);
      mockDao.updateTaskStatus.mockResolvedValue();
      await executeTask(10);
      await vi.runAllTimersAsync();
      expect(mockDao.updateTaskStatus).toHaveBeenCalledWith(10, undefined, undefined, 2, expect.objectContaining({
        endTime: true,
        resultJson: expect.stringContaining('商品上架完成'),
      }));
      vi.useRealTimers();
    });

    it('handles unknown task_type with generic label in async', async () => {
      vi.useFakeTimers();
      mockDao.getTaskById.mockResolvedValue({ id: 10, task_type: 'unknown_type', status: 0, user_id: undefined, tenant_id: undefined });
      mockDao.tryStartTask.mockResolvedValue(1);
      mockDao.updateTaskStatus.mockResolvedValue();
      await executeTask(10);
      await vi.runAllTimersAsync();
      expect(mockDao.updateTaskStatus).toHaveBeenCalledWith(10, undefined, undefined, 2, expect.objectContaining({
        resultJson: expect.stringContaining('执行完成'),
      }));
      vi.useRealTimers();
    });

    it('sets status=3 on async failure', async () => {
      vi.useFakeTimers();
      mockDao.getTaskById.mockResolvedValue({ id: 10, task_type: 'product_on', status: 0, user_id: undefined, tenant_id: undefined });
      mockDao.tryStartTask.mockResolvedValue(1);
      mockDao.updateTaskStatus.mockRejectedValueOnce(new Error('crash'));
      await executeTask(10);
      await vi.runAllTimersAsync();
      expect(mockDao.updateTaskStatus).toHaveBeenCalledWith(10, undefined, undefined, 3, { errorMsg: 'crash' });
      vi.useRealTimers();
    });
  });

  // —— createAccount ——
  describe('createAccount', () => {
    it('throws 400 when platform is missing', async () => {
      await expect(
        createAccount('u1', 't1', { username: 'u', password: 'p' }),
      ).rejects.toMatchObject({ message: '平台、用户名和密码不能为空', status: 400 });
    });

    it('throws 400 when username is missing', async () => {
      await expect(
        createAccount('u1', 't1', { platform: 'taobao', password: 'p' }),
      ).rejects.toMatchObject({ message: '平台、用户名和密码不能为空', status: 400 });
    });

    it('throws 400 when password is missing', async () => {
      await expect(
        createAccount('u1', 't1', { platform: 'taobao', username: 'u' }),
      ).rejects.toMatchObject({ message: '平台、用户名和密码不能为空', status: 400 });
    });

    it('AES-encrypts password before DAO call', async () => {
      mockDao.createAccount.mockResolvedValue(7);
      await createAccount('u1', 't1', { platform: 'taobao', storeName: '店A', username: 'admin', password: 'secret123' });
      expect(mockDao.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedPassword: expect.stringMatching(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/),
        }),
      );
    });

    it('returns { id } on success', async () => {
      mockDao.createAccount.mockResolvedValue(7);
      const result = await createAccount('u1', 't1', { platform: 'jd', username: 'u', password: 'p' });
      expect(result).toEqual({ id: 7 });
    });
  });

  // —— deleteAccount ——
  describe('deleteAccount', () => {
    it('delegates to DAO and returns true', async () => {
      mockDao.deleteAccount.mockResolvedValue();
      const result = await deleteAccount(5, 'u1');
      expect(mockDao.deleteAccount).toHaveBeenCalledWith(5, 'u1');
      expect(result).toBe(true);
    });
  });
});
