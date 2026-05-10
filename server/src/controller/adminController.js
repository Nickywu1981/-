import { wrapController } from '../utils/wrapController.js';
import * as commerce from '../services/commerceService.js';
import * as creditService from '../services/creditService.js';
import * as logService from '../services/logService.js';
import * as notificationService from '../services/notificationService.js';
import * as sensitiveWordService from '../services/sensitiveWordService.js';
import * as userService from '../services/userService.js';
import { success, listResult, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

// ==================== 数据看板 ====================

export const getDashboardStats = wrapController(async (_req, res, next) => {
    const data = await commerce.getDashboardStats();
    return success(res, data);
  } catch (err) { next(err); }
}

// ==================== 用户管理 ====================

export const listAllUsers = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const keyword = (req.query.keyword || '').trim();
    const { status, planType } = req.query;
    const data = await commerce.listAllUsers({ page, pageSize, keyword, status, planType });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export const updateUserStatus = wrapController(async (req, res, next) => {
    const { status } = req.body;
    if (![0, 1].includes(status)) return error(res, ERROR_CODE.PARAM_INVALID, '状态值无效（0启用/1禁用）');
    await commerce.updateUserStatus(req.params.userId, status);
    return success(res, {}, '用户状态已更新');
  } catch (err) { next(err); }
}

export const batchUpdateUserStatus = wrapController(async (req, res, next) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, ERROR_CODE.PARAM_INVALID, 'ids 必须为非空数组');
    if (![0, 1].includes(status)) return error(res, ERROR_CODE.PARAM_INVALID, '状态值无效（0启用/1禁用）');
    const result = await commerce.batchUpdateUserStatus(ids, status);
    return success(res, { affected: result.affected }, `已${status === 1 ? '禁用' : '启用'} ${result.affected} 个用户`);
  } catch (err) { next(err); }
}

// ==================== 任务管理 ====================

export const listAllTasks = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, status, type, typeGroup, reviewStatus } = req.query;
    const data = await commerce.listAllTasks({ page, pageSize, userId, status, type, typeGroup, reviewStatus });
    return listResult(res, data);
  } catch (err) { next(err); }
}

// ==================== 套餐管理 ====================

export const listAllPlans = wrapController(async (_req, res, next) => {
    const data = await commerce.getAllPlans();
    return success(res, data);
  } catch (err) { next(err); }
}

export const updatePlan = wrapController(async (req, res, next) => {
    const data = await commerce.updatePlan(req.params.planId, req.body);
    return success(res, data, '套餐更新成功');
  } catch (err) { next(err); }
}

// ==================== 操作日志 ====================

export const getOperationLogs = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, action } = req.query;
    const data = await commerce.getOperationLogs({ page, pageSize, userId, action });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export const listAllOrders = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, planType } = req.query;
    const data = await commerce.listAllOrders({ page, pageSize, userId, planType });
    return listResult(res, data);
  } catch (err) { next(err); }
}

// ==================== 风控 ====================

export const checkContentRisk = wrapController(async (req, res, next) => {
    const { content, type } = req.body;
    if (!content || !type) return error(res, ERROR_CODE.PARAM_MISSING, 'content 和 type 为必填');
    const blocked = commerce.containsBannedKeywords(content);
    return success(res, { blocked, keyword: blocked ? '包含敏感词' : '' });
  } catch (err) { next(err); }
}

export const listSensitiveWords = wrapController(async (req, res, next) => {
    const rows = await sensitiveWordService.listSensitiveWords();
    return success(res, { list: rows });
  } catch (err) { next(err); }
}

export const addSensitiveWord = wrapController(async (req, res, next) => {
    const { word } = req.body;
    if (!word) return error(res, ERROR_CODE.PARAM_MISSING, '请输入敏感词');
    await sensitiveWordService.addSensitiveWord(req.body.word, req.body.category, req.body.level);
    return success(res, {}, '已添加');
  } catch (err) { next(err); }
}

export const deleteSensitiveWord = wrapController(async (req, res, next) => {
    await sensitiveWordService.deleteSensitiveWord(+req.params.id);
    return success(res, {}, '已删除');
  } catch (err) { next(err); }
}

// ==================== 任务重试/暂停/续跑 ====================

export const retryTask = wrapController(async (req, res, next) => {
    await commerce.retryTask(req.params.taskId);
    return success(res, {}, '已加入重试队列');
  } catch (err) { next(err); }
}

export const pauseTask = wrapController(async (req, res, next) => {
    await commerce.pauseTask(req.params.taskId);
    return success(res, {}, '已暂停');
  } catch (err) { next(err); }
}

export const resumeTask = wrapController(async (req, res, next) => {
    await commerce.resumeTask(req.params.taskId);
    return success(res, {}, '已恢复');
  } catch (err) { next(err); }
}

export const cancelTask = wrapController(async (req, res, next) => {
    await commerce.cancelTask(req.params.taskId);
    return success(res, {}, '已取消');
  } catch (err) { next(err); }
}

// ==================== 任务审核 ====================

export const approveTask = wrapController(async (req, res, next) => {
    await commerce.approveTask(req.params.taskId);
    return success(res, {}, '已批准');
  } catch (err) { next(err); }
}

export const rejectTask = wrapController(async (req, res, next) => {
    await commerce.rejectTask(req.params.taskId);
    return success(res, {}, '已驳回');
  } catch (err) { next(err); }
}

// ==================== 积分管理 ====================

export const listCreditRecords = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, action } = req.query;
    const data = await creditService.listConsumptionRecords({ page, pageSize, userId, action, isAdmin: true });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export const refundCredit = wrapController(async (req, res, next) => {
    const { recordId, remark } = req.body;
    if (!recordId) return error(res, ERROR_CODE.PARAM_MISSING, '缺少记录ID');
    await creditService.adminRefundCredit(recordId, remark || '管理员退款');
    return success(res, {}, '已退还');
  } catch (err) { next(err); }
}

// ==================== AI调用日志 ====================

export const listAiCallLogs = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, type, status } = req.query;
    const data = await logService.listAiCallLogs({ page, pageSize, userId, type, status });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export const getAiCallStats = wrapController(async (req, res, next) => {
    const data = await logService.getAiCallStats();
    return success(res, data);
  } catch (err) { next(err); }
}

// ==================== 通知管理 ====================

export const listAllNotifications = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const { userId, type } = req.query;
    const data = await notificationService.listAll({ userId: userId ? +userId : undefined, type, page, pageSize });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export const sendNotification = wrapController(async (req, res, next) => {
    const { userId, type, title, content } = req.body;
    if (!userId || !title || !content) return error(res, ERROR_CODE.PARAM_MISSING, '用户ID、标题和内容为必填');
    const id = await notificationService.sendToUser({ userId, type: type || 'system', title, content });
    return success(res, { id }, '通知已发送');
  } catch (err) { next(err); }
}

export const deleteNotification = wrapController(async (req, res, next) => {
    await notificationService.deleteById(+req.params.id);
    return success(res, {}, '已删除');
  } catch (err) { next(err); }
}

// ==================== 用户编辑（通用） ====================

export const updateUser = wrapController(async (req, res, next) => {
    const user = await userService.adminUpdateUser(+req.params.id, req.body);
    return success(res, user, '用户已更新');
  } catch (err) { next(err); }
}

// ==================== 套餐创建/删除 ====================

export const createPlan = wrapController(async (req, res, next) => {
    const data = await commerce.createPlan(req.body);
    return success(res, data, '套餐已创建');
  } catch (err) { next(err); }
}

export const deletePlan = wrapController(async (req, res, next) => {
    await commerce.deletePlan(+req.params.planId);
    return success(res, {}, '套餐已删除');
  } catch (err) { next(err); }
}

// ==================== 订单删除 ====================

export const deleteOrder = wrapController(async (req, res, next) => {
    await commerce.deleteOrder(+req.params.orderId);
    return success(res, {}, '订单已删除');
  } catch (err) { next(err); }
}
