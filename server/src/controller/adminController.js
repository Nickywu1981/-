import * as commerce from '../services/commerceService.js';
import * as creditService from '../services/creditService.js';
import * as logService from '../services/logService.js';
import * as notificationService from '../services/notificationService.js';
import * as sensitiveWordService from '../services/sensitiveWordService.js';
import { success, listResult, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';
import db from '../dao/db.js';

// ==================== 数据看板 ====================

export async function getDashboardStats(_req, res, next) {
  try {
    const data = await commerce.getDashboardStats();
    return success(res, data);
  } catch (err) { next(err); }
}

// ==================== 用户管理 ====================

export async function listAllUsers(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const keyword = (req.query.keyword || '').trim();
    const { status, planType } = req.query;
    const data = await commerce.listAllUsers({ page, pageSize, keyword, status, planType });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (![0, 1].includes(status)) return error(res, ERROR_CODE.PARAM_INVALID, '状态值无效（0启用/1禁用）');
    await commerce.updateUserStatus(req.params.userId, status);
    return success(res, {}, '用户状态已更新');
  } catch (err) { next(err); }
}

export async function batchUpdateUserStatus(req, res, next) {
  try {
    const { ids, status } = req.body;
    const result = await commerce.batchUpdateUserStatus(ids, status);
    return success(res, { affected: result.affected }, `已${status === 1 ? '禁用' : '启用'} ${result.affected} 个用户`);
  } catch (err) { next(err); }
}

// ==================== 任务管理 ====================

export async function listAllTasks(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, status, type, typeGroup, reviewStatus } = req.query;
    const data = await commerce.listAllTasks({ page, pageSize, userId, status, type, typeGroup, reviewStatus });
    return listResult(res, data);
  } catch (err) { next(err); }
}

// ==================== 套餐管理 ====================

export async function listAllPlans(_req, res, next) {
  try {
    const data = await commerce.getAllPlans();
    return success(res, data);
  } catch (err) { next(err); }
}

export async function updatePlan(req, res, next) {
  try {
    const data = await commerce.updatePlan(req.params.planId, req.body);
    return success(res, data, '套餐更新成功');
  } catch (err) { next(err); }
}

// ==================== 操作日志 ====================

export async function getOperationLogs(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, action } = req.query;
    const data = await commerce.getOperationLogs({ page, pageSize, userId, action });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function listAllOrders(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, planType } = req.query;
    const data = await commerce.listAllOrders({ page, pageSize, userId, planType });
    return listResult(res, data);
  } catch (err) { next(err); }
}

// ==================== 风控 ====================

export async function checkContentRisk(req, res, next) {
  try {
    const { content, type } = req.body;
    if (!content || !type) return error(res, ERROR_CODE.PARAM_MISSING, 'content 和 type 为必填');
    const blocked = commerce.containsBannedKeywords(content);
    return success(res, { blocked, keyword: blocked ? '包含敏感词' : '' });
  } catch (err) { next(err); }
}

export async function listSensitiveWords(req, res, next) {
  try {
    const rows = await sensitiveWordService.listSensitiveWords();
    return success(res, { list: rows });
  } catch (err) { next(err); }
}

export async function addSensitiveWord(req, res, next) {
  try {
    const { word } = req.body;
    if (!word) return error(res, ERROR_CODE.PARAM_MISSING, '请输入敏感词');
    await sensitiveWordService.addSensitiveWord(req.body.word, req.body.category);
    return success(res, {}, '已添加');
  } catch (err) { next(err); }
}

export async function deleteSensitiveWord(req, res, next) {
  try {
    await sensitiveWordService.deleteSensitiveWord(+req.params.id);
    return success(res, {}, '已删除');
  } catch (err) { next(err); }
}

// ==================== 任务重试/暂停/续跑 ====================

export async function retryTask(req, res, next) {
  try {
    await commerce.retryTask(req.params.taskId);
    return success(res, {}, '已加入重试队列');
  } catch (err) { next(err); }
}

export async function pauseTask(req, res, next) {
  try {
    await commerce.pauseTask(req.params.taskId);
    return success(res, {}, '已暂停');
  } catch (err) { next(err); }
}

export async function resumeTask(req, res, next) {
  try {
    await commerce.resumeTask(req.params.taskId);
    return success(res, {}, '已恢复');
  } catch (err) { next(err); }
}

// ==================== 任务审核 ====================

export async function approveTask(req, res, next) {
  try {
    await commerce.approveTask(req.params.taskId);
    return success(res, {}, '已批准');
  } catch (err) { next(err); }
}

export async function rejectTask(req, res, next) {
  try {
    await commerce.rejectTask(req.params.taskId);
    return success(res, {}, '已驳回');
  } catch (err) { next(err); }
}

// ==================== 积分管理 ====================

export async function listCreditRecords(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, action } = req.query;
    const data = await creditService.listConsumptionRecords({ page, pageSize, userId, action, isAdmin: true });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function refundCredit(req, res, next) {
  try {
    const { recordId, remark } = req.body;
    if (!recordId) return error(res, ERROR_CODE.PARAM_MISSING, '缺少记录ID');
    await creditService.adminRefundCredit(recordId, remark || '管理员退款');
    return success(res, {}, '已退还');
  } catch (err) { next(err); }
}

// ==================== AI调用日志 ====================

export async function listAiCallLogs(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, type, status } = req.query;
    const data = await logService.listAiCallLogs({ page, pageSize, userId, type, status });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function getAiCallStats(req, res, next) {
  try {
    const data = await logService.getAiCallStats();
    return success(res, data);
  } catch (err) { next(err); }
}

// ==================== 通知管理 ====================

export async function listAllNotifications(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, type } = req.query;
    const data = await notificationService.listAll({ userId: userId ? +userId : undefined, type, page, pageSize });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function sendNotification(req, res, next) {
  try {
    const { userId, type, title, content } = req.body;
    if (!userId || !title || !content) return error(res, ERROR_CODE.PARAM_MISSING, '用户ID、标题和内容为必填');
    const id = await notificationService.sendToUser({ userId, type: type || 'system', title, content });
    return success(res, { id }, '通知已发送');
  } catch (err) { next(err); }
}

export async function deleteNotification(req, res, next) {
  try {
    await notificationService.deleteById(+req.params.id);
    return success(res, {}, '已删除');
  } catch (err) { next(err); }
}

// ==================== 用户编辑（通用） ====================

export async function updateUser(req, res, next) {
  try {
    const conn = await db.getConnection();
    try {
      const [users] = await conn.query('SELECT id FROM users WHERE id = ?', [+req.params.id]);
      if (users.length === 0) return error(res, 404, '用户不存在');

      const { nickname, email, role } = req.body;
      const updates = [];
      const params = [];
      if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
      if (email !== undefined) { updates.push('email = ?'); params.push(email); }
      if (role !== undefined) { updates.push('role = ?'); params.push(role); }
      if (updates.length === 0) return error(res, 400, '无更新字段');

      await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...params, +req.params.id]);
      return success(res, {}, '用户已更新');
    } finally { conn.release(); }
  } catch (err) { next(err); }
}

// ==================== 套餐创建/删除 ====================

export async function createPlan(req, res, next) {
  try {
    const { name, price, credits, duration_days, plan_type } = req.body;
    const conn = await db.getConnection();
    try {
      const [result] = await conn.query(
        'INSERT INTO payment_plan (name, price, credits, duration_days, plan_type) VALUES (?, ?, ?, ?, ?)',
        [name, price || 0, credits || 0, duration_days || 30, plan_type || 1],
      );
      return success(res, { id: result.insertId }, '套餐已创建');
    } finally { conn.release(); }
  } catch (err) { next(err); }
}

export async function deletePlan(req, res, next) {
  try {
    const conn = await db.getConnection();
    try {
      await conn.query('DELETE FROM payment_plan WHERE id = ?', [+req.params.planId]);
      return success(res, {}, '套餐已删除');
    } finally { conn.release(); }
  } catch (err) { next(err); }
}

// ==================== 订单删除 ====================

export async function deleteOrder(req, res, next) {
  try {
    const conn = await db.getConnection();
    try {
      await conn.query('DELETE FROM payment_order WHERE id = ?', [+req.params.orderId]);
      return success(res, {}, '订单已删除');
    } finally { conn.release(); }
  } catch (err) { next(err); }
}
