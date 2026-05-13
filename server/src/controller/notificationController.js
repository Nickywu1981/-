import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as notificationService from '../services/notificationService.js';
import { success, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listNotifications = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const data = await notificationService.getNotifications(req.user.id, { page, pageSize });
    return listResult(res, data);
  });

export const getUnreadCount = wrapController(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user.id);
    return success(res, { count });
  });

export const markOneRead = wrapController(async (req, res) => {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return success(res, {}, '已标为已读');
  });

export const markAllRead = wrapController(async (req, res) => {
    await notificationService.markAllAsRead(req.user.id);
    return success(res, {}, '全部已读');
  });

export const sendNotification = wrapController(async (req, res) => {
    const { userId, type, title, content } = req.body;
    if (!userId || !title || !content) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    const id = await notificationService.sendToUser({ userId, type: type || 'system', title, content });
    return success(res, { id }, '发送成功');
  });

export const deleteNotification = wrapController(async (req, res) => {
    const ok = await notificationService.deleteById(req.params.id, req.user.id);
    if (!ok) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return success(res, {}, '已删除');
  });

export const listAllNotifications = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 20 });
    const { userId, type } = req.query;
    const data = await notificationService.listAll({ userId: userId ? +userId : undefined, type, page, pageSize });
    return listResult(res, data);
  });
