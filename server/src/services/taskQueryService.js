/**
 * 共享任务查询工厂 — 消除 advancedImageService / advancedVideoService 中的重复代码
 */
import { BusinessError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export function makeTaskQueries({ getTask, listUserTasks, countUserTasks }) {
  async function getTaskResult(taskId, userId) {
    const task = await getTask(taskId, userId);
    if (!task) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
    return task;
  }

  async function listMyTasks(userId, { status, type, page, pageSize }) {
    const [list, total] = await Promise.all([
      listUserTasks(userId, { status, type, page, pageSize }),
      countUserTasks(userId, { status, type }),
    ]);
    return { list, total, page, pageSize };
  }

  return { getTaskResult, listMyTasks };
}
