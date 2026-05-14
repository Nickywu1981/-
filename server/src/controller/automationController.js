import { wrapController } from '../utils/wrapController.js';
import * as automationService from '../services/automationService.js';
import { success } from '../utils/response.js';

export const listTasks = wrapController(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 20, 100);
    const rows = await automationService.listTasks(req.user.id, req.tenantId, { page, pageSize });
    success(res, rows);
});

export const createTask = wrapController(async (req, res) => {
    const data = await automationService.createTask(req.user.id, req.tenantId, req.validated);
    success(res, data, '任务已创建');
});

export const cancelTask = wrapController(async (req, res) => {
    await automationService.cancelTask(req.params.id, req.user.id, req.user.tenantId);
    success(res, null, '任务已取消');
});

export const executeTask = wrapController(async (req, res) => {
    const data = await automationService.executeTask(req.params.taskId, req.user.id, req.user.tenantId);
    success(res, data, '任务执行中');
});

// Accounts
export const listAccounts = wrapController(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 20, 100);
    const rows = await automationService.listAccounts(req.user.id, req.tenantId, { page, pageSize });
    success(res, rows);
});

export const createAccount = wrapController(async (req, res) => {
    const data = await automationService.createAccount(req.user.id, req.tenantId, req.validated);
    success(res, data, '账号已添加');
});

export const deleteAccount = wrapController(async (req, res) => {
    await automationService.deleteAccount(req.params.id, req.user.id, req.user.tenantId);
    success(res, null, '账号已删除');
});

// Admin
export const listAllTasks = wrapController(async (req, res) => {
    const rows = await automationService.listAllTasks();
    success(res, rows);
});
