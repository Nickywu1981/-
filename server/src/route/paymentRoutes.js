import { Router } from 'express';
import { getPlans, createOrder, getOrderStatus, sandboxPay, checkPaymentResult, getBillingHistory } from '../controller/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  planType: z.number().int().min(1).max(3),
  payChannel: z.enum(['wechat', 'alipay', 'unionpay']).optional(),
});

const reqsnParamSchema = z.object({
  reqsn: z.string().min(1, '缺少订单号'),
});

// 公开
router.get('/plans', cacheMiddleware(600), asyncHandler(getPlans));

// 需登录
router.post('/create-order', paymentLimiter, authMiddleware, validate(createOrderSchema), asyncHandler(createOrder));
router.get('/order/:reqsn', authMiddleware, validate(reqsnParamSchema, 'params'), asyncHandler(getOrderStatus));
router.get('/result/:reqsn', authMiddleware, validate(reqsnParamSchema, 'params'), asyncHandler(checkPaymentResult));
router.post('/sandbox-pay/:reqsn', paymentLimiter, authMiddleware, validate(reqsnParamSchema, 'params'), asyncHandler(sandboxPay));
router.get('/billing', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(getBillingHistory));
router.get('/orders', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(getBillingHistory));

export default router;
