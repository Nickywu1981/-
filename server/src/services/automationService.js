import automationDao from '../dao/automationDao.js';
import { encrypt } from '../utils/crypto.js';
import { BusinessError } from '../utils/businessError.js';

const TASK_TYPES = ['product_on', 'product_off', 'ship_order', 'reply_review', 'stock_check'];
const TASK_LABELS = { product_on: '商品上架完成', product_off: '商品下架完成', ship_order: '发货完成', reply_review: '评价回复完成', stock_check: '库存检查完成' };

const runningTimers = new Map();

export async function listTasks(userId, tenantId, pagination = {}) {
  return automationDao.listTasks(userId, tenantId, pagination);
}

export async function createTask(userId, tenantId, { accountId, taskType, taskConfig }) {
  if (!TASK_TYPES.includes(taskType)) throw new BusinessError(400, '无效的任务类型');
  const id = await automationDao.createTask({
    tenantId, userId, accountId, taskType,
    taskConfig: taskConfig ? JSON.stringify(taskConfig) : null,
  });
  return { id };
}

export async function cancelTask(id, userId) {
  const timer = runningTimers.get(id);
  if (timer) { clearTimeout(timer); runningTimers.delete(id); }
  const ok = await automationDao.cancelTask(id, userId);
  if (!ok) throw new BusinessError(400, '任务不存在或不可取消');
  return true;
}

export async function executeTask(taskId, userId) {
  const task = await automationDao.getTaskById(taskId);
  if (!task) throw new BusinessError(404, '任务不存在');
  if (task.user_id !== userId) throw new BusinessError(403, '无权执行该任务');

  const affected = await automationDao.tryStartTask(taskId, task.user_id, task.tenant_id);
  if (affected === 0) throw new BusinessError(400, '任务状态不允许执行');

  const timer = setTimeout(async () => {
    runningTimers.delete(taskId);
    try {
      const current = await automationDao.getTaskById(taskId);
      if (!current || current.status === 4) return;

      await automationDao.updateTaskStatus(taskId, current.user_id, current.tenant_id, 2, {
        endTime: true,
        resultJson: JSON.stringify({ message: TASK_LABELS[task.task_type] || '执行完成' }),
        screenshotUrl: `/uploads/screenshots/task_${taskId}.png`,
      });
    } catch (e) {
      await automationDao.updateTaskStatus(taskId, task.user_id, task.tenant_id, 3, { errorMsg: e.message });
    }
  }, 2000);
  runningTimers.set(taskId, timer);

  return { taskId, status: 1 };
}

// Account management
export async function listAccounts(userId, tenantId, pagination = {}) {
  return automationDao.listAccounts(userId, tenantId, pagination);
}

export async function createAccount(userId, tenantId, { platform, storeName, username, password }) {
  if (!platform || !username || !password) throw new BusinessError(400, '平台、用户名和密码不能为空');
  const encrypted = encrypt(password);
  const id = await automationDao.createAccount({ tenantId, userId, platform, storeName, username, encryptedPassword: encrypted });
  return { id };
}

export async function deleteAccount(id, userId) {
  await automationDao.deleteAccount(id, userId);
  return true;
}

// Admin
export async function listAllTasks() {
  return automationDao.listAllTasks();
}
