import { Router } from 'express';
import { getDashboardStats, listAllUsers, updateUserStatus, batchUpdateUserStatus, listAllTasks, listAllPlans, updatePlan, createPlan, deletePlan, getOperationLogs, checkContentRisk, approveTask, rejectTask, listAllOrders, deleteOrder, listCreditRecords, refundCredit, listAiCallLogs, getAiCallStats, listSensitiveWords, addSensitiveWord, deleteSensitiveWord, retryTask, pauseTask, resumeTask, cancelTask, listAllNotifications, sendNotification, deleteNotification, updateUser } from '../controller/adminController.js';
import { adminListTemplates, adminSaveTemplate, adminReviewTemplate, adminDeleteTemplate } from '../controller/adminPromptController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate, idSchema, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const numericParam = (name) => z.object({ [name]: z.string().regex(/^\d+$/).transform(Number) });
const idParamSchema = numericParam('id');
const userIdParamSchema = numericParam('userId');
const planIdParamSchema = numericParam('planId');
const orderIdParamSchema = numericParam('orderId');

const batchUserStatusSchema = z.object({
  ids: z.array(idSchema).min(1).max(500),
  status: z.union([z.literal(0), z.literal(1)]),
});
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
  level: z.coerce.number().int().min(1).max(2).default(1),
});
const refundSchema = z.object({
  recordId: idSchema,
  remark: z.string().max(500).optional(),
});
const updateUserSchema = z.object({
  nickname: z.string().max(100).optional(),
  email: z.string().email().max(200).optional(),
  role: z.enum(['user', 'admin']).optional(),
});
const createPlanSchema = z.object({
  name: z.string().min(1, '套餐名称不能为空').max(100),
  price: z.coerce.number().min(0).max(999999).optional(),
  credits: z.coerce.number().int().min(0).max(1000000).optional(),
  duration_days: z.coerce.number().int().min(1).max(3650).optional(),
  plan_type: z.coerce.number().int().min(0).max(99).optional(),
});
const sendNotificationSchema = z.object({
  userId: idSchema,
  type: z.string().max(50).optional(),
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空').max(10000),
});
const userStatusSchema = z.object({
  status: z.union([z.literal(0), z.literal(1)]),
});
const taskActionParamsSchema = z.object({ taskId: z.coerce.number().int().positive('taskId 必须为正整数') });
const promptReviewSchema = z.object({
  status: z.coerce.number().int().min(0).max(2),
  reviewRemark: z.string().max(500).optional(),
});
const adminPromptSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  templateCode: z.string().max(100).optional(),
  category: z.string().min(1, '类别不能为空').max(50),
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().max(500).optional(),
  content: z.string().min(1, '内容不能为空').max(5000),
  variables: z.array(z.string()).optional(),
  modelType: z.enum(['text', 'image', 'video', 'multimodal']).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isPublic: z.coerce.number().int().min(0).max(1).optional(),
  status: z.coerce.number().int().min(0).max(2).optional(),
});

// 看板
router.get('/stats', authMiddleware, adminAuth, asyncHandler(getDashboardStats));
router.get('/dashboard', authMiddleware, adminAuth, asyncHandler(getDashboardStats));
// 用户
router.get('/users', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllUsers));
router.put('/users/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(updateUserSchema), asyncHandler(updateUser));
router.put('/users/:userId/status', adminLimiter, authMiddleware, adminAuth, validate(userIdParamSchema, 'params'), validate(userStatusSchema), asyncHandler(updateUserStatus));
router.put('/users/batch-status', adminLimiter, authMiddleware, adminAuth, validate(batchUserStatusSchema), asyncHandler(batchUpdateUserStatus));
// 任务
router.get('/tasks', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllTasks));
router.post('/tasks/:taskId/approve', adminLimiter, authMiddleware, adminAuth, validate(taskActionParamsSchema, 'params'), asyncHandler(approveTask));
router.post('/tasks/:taskId/reject', adminLimiter, authMiddleware, adminAuth, validate(taskActionParamsSchema, 'params'), asyncHandler(rejectTask));
router.post('/tasks/:taskId/retry', adminLimiter, authMiddleware, adminAuth, validate(taskActionParamsSchema, 'params'), asyncHandler(retryTask));
router.post('/tasks/:taskId/pause', adminLimiter, authMiddleware, adminAuth, validate(taskActionParamsSchema, 'params'), asyncHandler(pauseTask));
router.post('/tasks/:taskId/cancel', adminLimiter, authMiddleware, adminAuth, validate(taskActionParamsSchema, 'params'), asyncHandler(cancelTask));
router.post('/tasks/:taskId/resume', adminLimiter, authMiddleware, adminAuth, validate(taskActionParamsSchema, 'params'), asyncHandler(resumeTask));
// 套餐
router.get('/plans', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllPlans));
router.post('/plans', adminLimiter, authMiddleware, adminAuth, validate(createPlanSchema), asyncHandler(createPlan));
router.put('/plans/:planId', adminLimiter, authMiddleware, adminAuth, validate(planIdParamSchema, 'params'), validate(planSchema), asyncHandler(updatePlan));
router.delete('/plans/:planId', adminLimiter, authMiddleware, adminAuth, validate(planIdParamSchema, 'params'), asyncHandler(deletePlan));
// 日志
router.get('/logs', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(getOperationLogs));
router.get('/orders', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllOrders));
router.delete('/orders/:orderId', adminLimiter, authMiddleware, adminAuth, validate(orderIdParamSchema, 'params'), asyncHandler(deleteOrder));
// 风控
router.post('/check-content', adminLimiter, authMiddleware, adminAuth, validate(checkContentSchema), asyncHandler(checkContentRisk));
router.get('/sensitive-words', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listSensitiveWords));
router.post('/sensitive-words', adminLimiter, authMiddleware, adminAuth, validate(sensitiveWordSchema), asyncHandler(addSensitiveWord));
router.delete('/sensitive-words/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(deleteSensitiveWord));
// 提示词
router.get('/prompts', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(adminListTemplates));
router.post('/prompts', adminLimiter, authMiddleware, adminAuth, validate(adminPromptSchema), asyncHandler(adminSaveTemplate));
router.put('/prompts/:id/review', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(promptReviewSchema), asyncHandler(adminReviewTemplate));
router.delete('/prompts/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(adminDeleteTemplate));
// 积分
router.get('/credits', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listCreditRecords));
router.post('/credits/refund', adminLimiter, authMiddleware, adminAuth, validate(refundSchema), asyncHandler(refundCredit));
// AI日志
router.get('/ai-logs', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAiCallLogs));
router.get('/ai-logs/stats', authMiddleware, adminAuth, asyncHandler(getAiCallStats));
// 通知管理
router.get('/notifications', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(listAllNotifications));
router.post('/notifications/send', adminLimiter, authMiddleware, adminAuth, validate(sendNotificationSchema), asyncHandler(sendNotification));
router.delete('/notifications/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(deleteNotification));

export default router;
