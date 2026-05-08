import * as notificationService from '../services/notificationService.js';
import { success, listResult, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

export async function listNotifications(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const data = await notificationService.getNotifications(req.user.id, { page, pageSize });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return success(res, { count });
  } catch (err) { next(err); }
}

export async function markOneRead(req, res, next) {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return success(res, {}, '已标为已读');
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return success(res, {}, '全部已读');
  } catch (err) { next(err); }
}

export async function sendNotification(req, res, next) {
  try {
    const { userId, type, title, content } = req.body;
    if (!userId || !title || !content) return error(res, 400, '缺少必要参数');
    const id = await notificationService.sendToUser({ userId, type: type || 'system', title, content });
    return success(res, { id }, '发送成功');
  } catch (err) { next(err); }
}

export async function deleteNotification(req, res, next) {
  try {
    await notificationService.deleteById(req.params.id);
    return success(res, {}, '已删除');
  } catch (err) { next(err); }
}

export async function listAllNotifications(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 20 });
    const { userId, type } = req.query;
    const data = await notificationService.listAll({ userId: userId ? +userId : undefined, type, page, pageSize });
    return listResult(res, data);
  } catch (err) { next(err); }
}
