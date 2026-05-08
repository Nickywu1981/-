import { Router } from 'express';
import { getPlans, createOrder, getOrderStatus, sandboxPay, checkPaymentResult, getBillingHistory } from '../controller/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  planType: z.number().int().min(1).max(3),
  payChannel: z.enum(['wechat', 'alipay', 'unionpay']).optional(),
});

// 公开
router.get('/plans', cacheMiddleware(600), asyncHandler(getPlans));

// 需登录
router.post('/create-order', authMiddleware, validate(createOrderSchema), asyncHandler(createOrder));
router.get('/order/:reqsn', authMiddleware, asyncHandler(getOrderStatus));
router.get('/result/:reqsn', authMiddleware, asyncHandler(checkPaymentResult));
router.post('/sandbox-pay/:reqsn', authMiddleware, asyncHandler(sandboxPay));
router.get('/billing', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(getBillingHistory));
router.get('/orders', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(getBillingHistory));

export default router;
