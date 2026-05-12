import * as notificationDao from '../dao/notificationDao.js';

/**
 * 发送通知 — 供其他 Service 内部调用
 */
export async function sendNotification(userId, { type = 'system', title, content }) {
  return notificationDao.insertNotification({ userId, type, title, content });
}

export async function getNotifications(userId, { page = 1, pageSize = 20 }) {
  const [list, total] = await Promise.all([
    notificationDao.listByUser(userId, { page, pageSize }),
    notificationDao.countByUser(userId),
  ]);
  return { list, total, page, pageSize };
}

export async function markAsRead(notificationId, userId) {
  await notificationDao.markAsRead(notificationId, userId);
}

export async function markAllAsRead(userId) {
  await notificationDao.markAllAsRead(userId);
}

export async function getUnreadCount(userId) {
  return notificationDao.getUnreadCount(userId);
}

// ==================== 管理后台 ====================

export async function listAll({ userId, type, page = 1, pageSize = 20 }) {
  const [list, total] = await Promise.all([
    notificationDao.listAll({ userId, type, page, pageSize }),
    notificationDao.countAll({ userId, type }),
  ]);
  return { list, total, page, pageSize };
}

export async function sendToUser({ userId, type = 'system', title, content }) {
  return notificationDao.insertNotification({ userId, type, title, content });
}

export async function deleteById(id, userId) {
  return notificationDao.deleteNotification(id, userId);
}
