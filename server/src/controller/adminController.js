import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as commerce from '../services/commerceService.js';
import * as creditService from '../services/creditService.js';
import * as logService from '../services/logService.js';
import * as notificationService from '../services/notificationService.js';
import * as sensitiveWordService from '../services/sensitiveWordService.js';
import * as userService from '../services/userService.js';
import { success, listResult } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

// ==================== 数据看板 ====================

export const getDashboardStats = wrapController(async (_req, res, next) => {
    const data = await commerce.getDashboardStats();
    return success(res, data);
  });

// ==================== 用户管理 ====================

export const listAllUsers = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const keyword = (req.query.keyword || '').trim();
    const { status, planType } = req.query;
    const data = await commerce.listAllUsers({ page, pageSize, keyword, status, planType });
    return listResult(res, data);
  });

export const updateUserStatus = wrapController(async (req, res) => {
    const { status } = req.body;
    if (![0, 1].includes(status)) throw new BusinessError(ERROR_CODE.PARAM_INVALID);
    await commerce.updateUserStatus(req.params.userId, status, req.user?.tenantId);
    return success(res, {}, '用户状态已更新');
  });

export const batchUpdateUserStatus = wrapController(async (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new BusinessError(ERROR_CODE.PARAM_INVALID);
    if (![0, 1].includes(status)) throw new BusinessError(ERROR_CODE.PARAM_INVALID);
    const result = await commerce.batchUpdateUserStatus(ids, status, req.user?.tenantId);
    return success(res, { affected: result.affected }, `已${status === 1 ? '禁用' : '启用'} ${result.affected} 个用户`);
  });

// ==================== 任务管理 ====================

export const listAllTasks = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, status, type, typeGroup, reviewStatus } = req.query;
    const data = await commerce.listAllTasks({ page, pageSize, userId, status, type, typeGroup, reviewStatus });
    return listResult(res, data);
  });

// ==================== 套餐管理 ====================

export const listAllPlans = wrapController(async (_req, res, next) => {
    const data = await commerce.getAllPlans();
    return success(res, data);
  });

export const updatePlan = wrapController(async (req, res) => {
    const data = await commerce.updatePlan(req.params.planId, req.body);
    return success(res, data, '套餐更新成功');
  });

// ==================== 操作日志 ====================

export const getOperationLogs = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, action } = req.query;
    const data = await commerce.getOperationLogs({ page, pageSize, userId, action });
    return listResult(res, data);
  });

export const listAllOrders = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, planType } = req.query;
    const data = await commerce.listAllOrders({ page, pageSize, userId, planType });
    return listResult(res, data);
  });

// ==================== 风控 ====================

export const checkContentRisk = wrapController(async (req, res) => {
    const { content, type } = req.body;
    if (!content || !type) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const result = await sensitiveWordService.checkText(content);
    return success(res, { blocked: result.block || result.review, hits: result.hits });
  });

export const listSensitiveWords = wrapController(async (req, res) => {
    const rows = await sensitiveWordService.listSensitiveWords();
    return success(res, { list: rows });
  });

export const addSensitiveWord = wrapController(async (req, res) => {
    const { word } = req.body;
    if (!word) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    await sensitiveWordService.addSensitiveWord(req.body.word, req.body.category, req.body.level);
    return success(res, {}, '已添加');
  });

export const deleteSensitiveWord = wrapController(async (req, res) => {
    await sensitiveWordService.deleteSensitiveWord(+req.params.id);
    return success(res, {}, '已删除');
  });

// ==================== 任务重试/暂停/续跑 ====================

export const retryTask = wrapController(async (req, res) => {
    await commerce.retryTask(req.params.taskId, req.user?.tenantId);
    return success(res, {}, '已加入重试队列');
  });

export const pauseTask = wrapController(async (req, res) => {
    await commerce.pauseTask(req.params.taskId, req.user?.tenantId);
    return success(res, {}, '已暂停');
  });

export const resumeTask = wrapController(async (req, res) => {
    await commerce.resumeTask(req.params.taskId, req.user?.tenantId);
    return success(res, {}, '已恢复');
  });

export const cancelTask = wrapController(async (req, res) => {
    await commerce.cancelTask(req.params.taskId, req.user?.tenantId);
    return success(res, {}, '已取消');
  });

// ==================== 任务审核 ====================

export const approveTask = wrapController(async (req, res) => {
    await commerce.approveTask(req.params.taskId, req.user?.tenantId);
    return success(res, {}, '已批准');
  });

export const rejectTask = wrapController(async (req, res) => {
    await commerce.rejectTask(req.params.taskId, req.user?.tenantId);
    return success(res, {}, '已驳回');
  });

// ==================== 积分管理 ====================

export const listCreditRecords = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, action } = req.query;
    const data = await creditService.listConsumptionRecords({ page, pageSize, userId, action, isAdmin: true });
    return listResult(res, data);
  });

export const refundCredit = wrapController(async (req, res) => {
    const { recordId, remark } = req.body;
    if (!recordId) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    await creditService.adminRefundCredit(recordId, remark || '管理员退款');
    return success(res, {}, '已退还');
  });

// ==================== AI调用日志 ====================

export const listAiCallLogs = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, type, status } = req.query;
    const data = await logService.listAiCallLogs({ page, pageSize, userId, type, status });
    return listResult(res, data);
  });

export const getAiCallStats = wrapController(async (req, res) => {
    const data = await logService.getAiCallStats();
    return success(res, data);
  });

// ==================== 通知管理 ====================

export const listAllNotifications = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, type } = req.query;
    const data = await notificationService.listAll({ userId: userId ? +userId : undefined, type, page, pageSize });
    return listResult(res, data);
  });

export const sendNotification = wrapController(async (req, res) => {
    const { userId, type, title, content } = req.body;
    if (!userId || !title || !content) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const id = await notificationService.sendToUser({ userId, type: type || 'system', title, content });
    return success(res, { id }, '通知已发送');
  });

export const deleteNotification = wrapController(async (req, res) => {
    await notificationService.deleteById(+req.params.id);
    return success(res, {}, '已删除');
  });

// ==================== 用户编辑（通用） ====================

export const updateUser = wrapController(async (req, res) => {
    const user = await userService.adminUpdateUser(+req.params.id, req.body);
    return success(res, user, '用户已更新');
  });

// ==================== 套餐创建/删除 ====================

export const createPlan = wrapController(async (req, res) => {
    const data = await commerce.createPlan(req.body);
    return success(res, data, '套餐已创建');
  });

export const deletePlan = wrapController(async (req, res) => {
    await commerce.deletePlan(+req.params.planId);
    return success(res, {}, '套餐已删除');
  });

// ==================== 订单删除 ====================

export const deleteOrder = wrapController(async (req, res) => {
    await commerce.deleteOrder(+req.params.orderId, req.user?.tenantId);
    return success(res, {}, '订单已删除');
  });
