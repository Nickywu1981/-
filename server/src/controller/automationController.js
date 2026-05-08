import * as automationService from '../services/automationService.js';
import { success, error } from '../utils/response.js';

export async function listTasks(req, res) {
  try {
    const rows = await automationService.listTasks(req.user.id, req.tenantId);
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function createTask(req, res) {
  try {
    const data = await automationService.createTask(req.user.id, req.tenantId, req.body);
    success(res, data, '任务已创建');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function cancelTask(req, res) {
  try {
    await automationService.cancelTask(req.params.id, req.user.id);
    success(res, null, '任务已取消');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function executeTask(req, res) {
  try {
    const data = await automationService.executeTask(req.params.taskId);
    success(res, data, '任务执行中');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

// Accounts
export async function listAccounts(req, res) {
  try {
    const rows = await automationService.listAccounts(req.user.id, req.tenantId);
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function createAccount(req, res) {
  try {
    const data = await automationService.createAccount(req.user.id, req.tenantId, req.body);
    success(res, data, '账号已添加');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function deleteAccount(req, res) {
  try {
    await automationService.deleteAccount(req.params.id, req.user.id);
    success(res, null, '账号已删除');
  } catch (e) { error(res, 500, e.message); }
}

// Admin
export async function listAllTasks(req, res) {
  try {
    const rows = await automationService.listAllTasks();
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}
