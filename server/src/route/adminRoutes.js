import { Router } from 'express';
import { getDashboardStats, listAllUsers, updateUserStatus, batchUpdateUserStatus, listAllTasks, listAllPlans, updatePlan, createPlan, deletePlan, getOperationLogs, checkContentRisk, approveTask, rejectTask, listAllOrders, deleteOrder, listCreditRecords, refundCredit, listSensitiveWords, addSensitiveWord, deleteSensitiveWord, retryTask, pauseTask, resumeTask, cancelTask, listAllNotifications, sendNotification, deleteNotification, updateUser } from '../controller/adminController.js';
import { adminListTemplates, adminSaveTemplate, adminReviewTemplate, adminDeleteTemplate } from '../controller/adminPromptController.js';
import { listPending, getApprovalStats, getApprovalLogs, approve, reject, suspend, reinstate } from '../controller/enterpriseController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate, idSchema, paginationSchema, numericParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const idParamSchema = numericParamSchema('id');
const userIdParamSchema = numericParamSchema('userId');
const planIdParamSchema = numericParamSchema('planId');
const orderIdParamSchema = numericParamSchema('orderId');

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

router.use(adminLimiter, authMiddleware, adminAuth);

// 看板
router.get('/stats', getDashboardStats);
router.get('/dashboard', getDashboardStats);
// 用户
router.get('/users', validate(paginationSchema, 'query'), listAllUsers);
router.put('/users/:id', validate(idParamSchema, 'params'), validate(updateUserSchema), updateUser);
router.put('/users/:userId/status', validate(userIdParamSchema, 'params'), validate(userStatusSchema), updateUserStatus);
router.put('/users/batch-status', validate(batchUserStatusSchema), batchUpdateUserStatus);
// 任务
router.get('/tasks', validate(paginationSchema, 'query'), listAllTasks);
router.post('/tasks/:taskId/approve', validate(taskActionParamsSchema, 'params'), approveTask);
router.post('/tasks/:taskId/reject', validate(taskActionParamsSchema, 'params'), rejectTask);
router.post('/tasks/:taskId/retry', validate(taskActionParamsSchema, 'params'), retryTask);
router.post('/tasks/:taskId/pause', validate(taskActionParamsSchema, 'params'), pauseTask);
router.post('/tasks/:taskId/cancel', validate(taskActionParamsSchema, 'params'), cancelTask);
router.post('/tasks/:taskId/resume', validate(taskActionParamsSchema, 'params'), resumeTask);
// 套餐
router.get('/plans', validate(paginationSchema, 'query'), listAllPlans);
router.post('/plans', validate(createPlanSchema), createPlan);
router.put('/plans/:planId', validate(planIdParamSchema, 'params'), validate(planSchema), updatePlan);
router.delete('/plans/:planId', validate(planIdParamSchema, 'params'), deletePlan);
// 日志
router.get('/logs', validate(paginationSchema, 'query'), getOperationLogs);
router.get('/orders', validate(paginationSchema, 'query'), listAllOrders);
router.delete('/orders/:orderId', validate(orderIdParamSchema, 'params'), deleteOrder);
// 风控
router.post('/check-content', validate(checkContentSchema), checkContentRisk);
router.get('/sensitive-words', validate(paginationSchema, 'query'), listSensitiveWords);
router.post('/sensitive-words', validate(sensitiveWordSchema), addSensitiveWord);
router.delete('/sensitive-words/:id', validate(idParamSchema, 'params'), deleteSensitiveWord);
// 提示词
router.get('/prompts', validate(paginationSchema, 'query'), adminListTemplates);
router.post('/prompts', validate(adminPromptSchema), adminSaveTemplate);
router.put('/prompts/:id/review', validate(idParamSchema, 'params'), validate(promptReviewSchema), adminReviewTemplate);
router.delete('/prompts/:id', validate(idParamSchema, 'params'), adminDeleteTemplate);
// 积分
router.get('/credits', validate(paginationSchema, 'query'), listCreditRecords);
router.post('/credits/refund', validate(refundSchema), refundCredit);
// 通知管理
router.get('/notifications', validate(paginationSchema, 'query'), listAllNotifications);
router.post('/notifications/send', validate(sendNotificationSchema), sendNotification);
router.delete('/notifications/:id', validate(idParamSchema, 'params'), deleteNotification);

// 企业入驻审批 (Phase 2: 2026-05-12)
const approvalIdSchema = numericParamSchema('id');
const rejectSchema = z.object({ reason: z.string().min(4, '驳回原因至少4个字符').max(500) });
const suspendSchema = z.object({ reason: z.string().max(500).optional() });

router.get('/enterprises/pending', validate(paginationSchema, 'query'), listPending);
router.get('/enterprises/approval-stats', getApprovalStats);
router.get('/enterprises/:id/approval-logs', validate(approvalIdSchema, 'params'), validate(paginationSchema, 'query'), getApprovalLogs);
router.post('/enterprises/:id/approve', validate(approvalIdSchema, 'params'), approve);
router.post('/enterprises/:id/reject', validate(approvalIdSchema, 'params'), validate(rejectSchema), reject);
router.post('/enterprises/:id/suspend', validate(approvalIdSchema, 'params'), validate(suspendSchema), suspend);
router.post('/enterprises/:id/reinstate', validate(approvalIdSchema, 'params'), reinstate);

export default router;
