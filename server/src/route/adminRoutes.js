import { Router } from 'express';
import { getDashboardStats, listAllUsers, updateUserStatus, batchUpdateUserStatus, listAllTasks, listAllPlans, updatePlan, createPlan, deletePlan, getOperationLogs, checkContentRisk, approveTask, rejectTask, listAllOrders, deleteOrder, listCreditRecords, refundCredit, listAiCallLogs, getAiCallStats, listSensitiveWords, addSensitiveWord, deleteSensitiveWord, retryTask, pauseTask, resumeTask, listAllNotifications, sendNotification, deleteNotification, updateUser } from '../controller/adminController.js';
import { adminListTemplates, adminSaveTemplate, adminReviewTemplate, adminDeleteTemplate } from '../controller/adminPromptController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idSchema, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const userStatusSchema = z.object({
  userId: idSchema,
  status: z.union([z.literal(0), z.literal(1)]),
});
const batchUserStatusSchema = z.object({
  userIds: z.array(idSchema).min(1).max(500),
  status: z.union([z.literal(0), z.literal(1)]),
});
const taskIdSchema = z.object({ taskId: idSchema });
const planIdSchema = z.object({ planId: idSchema });
const planSchema = z.object({
  planId: idSchema,
  name: z.string().min(1).max(100).optional(),
  price: z.coerce.number().positive().optional(),
  credits: z.coerce.number().int().min(0).optional(),
});
const checkContentSchema = z.object({
  content: z.string().min(1, '内容不能为空').max(10000),
  type: z.enum(['text', 'image', 'video']),
});
const sensitiveWordSchema = z.object({
  word: z.string().min(1, '敏感词不能为空').max(100),
  category: z.string().max(50).optional(),
});
const refundSchema = z.object({
  recordId: idSchema,
  remark: z.string().max(500).optional(),
});
const updateUserSchema = z.object({
  nickname: z.string().max(100).optional(),
  email: z.string().email().max(200).optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
});
const createPlanSchema = z.object({
  name: z.string().min(1, '套餐名称不能为空').max(100),
  price: z.coerce.number().min(0).optional(),
  credits: z.coerce.number().int().min(0).optional(),
  duration_days: z.coerce.number().int().min(1).optional(),
  plan_type: z.coerce.number().int().min(0).optional(),
});
const sendNotificationSchema = z.object({
  userId: idSchema,
  type: z.string().max(50).optional(),
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空'),
});

// 看板
router.get('/stats', authMiddleware, adminAuth, asyncHandler(getDashboardStats));
router.get('/dashboard', authMiddleware, adminAuth, asyncHandler(getDashboardStats));
// 用户
router.get('/users', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllUsers));
router.put('/users/:id', authMiddleware, adminAuth, validate(updateUserSchema), asyncHandler(updateUser));
router.put('/users/:userId/status', authMiddleware, adminAuth, asyncHandler(updateUserStatus));
router.put('/users/batch-status', authMiddleware, adminAuth, validate(batchUserStatusSchema), asyncHandler(batchUpdateUserStatus));
// 任务
router.get('/tasks', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllTasks));
router.post('/tasks/:taskId/approve', authMiddleware, adminAuth, asyncHandler(approveTask));
router.post('/tasks/:taskId/reject', authMiddleware, adminAuth, asyncHandler(rejectTask));
router.post('/tasks/:taskId/retry', authMiddleware, adminAuth, asyncHandler(retryTask));
router.post('/tasks/:taskId/pause', authMiddleware, adminAuth, asyncHandler(pauseTask));
router.post('/tasks/:taskId/cancel', authMiddleware, adminAuth, asyncHandler(pauseTask));
router.post('/tasks/:taskId/resume', authMiddleware, adminAuth, asyncHandler(resumeTask));
// 套餐
router.get('/plans', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllPlans));
router.post('/plans', authMiddleware, adminAuth, validate(createPlanSchema), asyncHandler(createPlan));
router.put('/plans/:planId', authMiddleware, adminAuth, validate(planSchema), asyncHandler(updatePlan));
router.delete('/plans/:planId', authMiddleware, adminAuth, asyncHandler(deletePlan));
// 日志
router.get('/logs', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(getOperationLogs));
router.get('/orders', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllOrders));
router.delete('/orders/:orderId', authMiddleware, adminAuth, asyncHandler(deleteOrder));
// 风控
router.post('/check-content', authMiddleware, validate(checkContentSchema), asyncHandler(checkContentRisk));
router.get('/sensitive-words', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listSensitiveWords));
router.post('/sensitive-words', authMiddleware, adminAuth, validate(sensitiveWordSchema), asyncHandler(addSensitiveWord));
router.delete('/sensitive-words/:id', authMiddleware, adminAuth, asyncHandler(deleteSensitiveWord));
// 提示词
router.get('/prompts', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(adminListTemplates));
router.post('/prompts', authMiddleware, adminAuth, asyncHandler(adminSaveTemplate));
router.put('/prompts/:id/review', authMiddleware, adminAuth, asyncHandler(adminReviewTemplate));
router.delete('/prompts/:id', authMiddleware, adminAuth, asyncHandler(adminDeleteTemplate));
// 积分
router.get('/credits', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listCreditRecords));
router.post('/credits/refund', authMiddleware, adminAuth, validate(refundSchema), asyncHandler(refundCredit));
// AI日志
router.get('/ai-logs', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAiCallLogs));
router.get('/ai-logs/stats', authMiddleware, adminAuth, asyncHandler(getAiCallStats));
// 通知管理
router.get('/notifications', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllNotifications));
router.post('/notifications/send', authMiddleware, adminAuth, validate(sendNotificationSchema), asyncHandler(sendNotification));
router.delete('/notifications/:id', authMiddleware, adminAuth, asyncHandler(deleteNotification));

export default router;
