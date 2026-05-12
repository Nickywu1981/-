import { Router } from 'express';
import { getPlans, createOrder, getOrderStatus, sandboxPay, checkPaymentResult, getBillingHistory } from '../controller/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
// paymentLimiter applied globally in app.js: router.use('/api/payment', paymentLimiter, paymentRoutes)
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  planType: z.number().int().min(1).max(3),
  payChannel: z.enum(['wechat', 'alipay', 'unionpay']).optional(),
});

const reqsnParamSchema = z.object({
  reqsn: z.string().min(1, '缺少订单号').max(50),
});

// 公开
router.get('/plans', cacheMiddleware(600), getPlans);

// 需登录
router.post('/create-order', authMiddleware, validate(createOrderSchema), createOrder);
router.get('/order/:reqsn', authMiddleware, validate(reqsnParamSchema, 'params'), getOrderStatus);
router.get('/result/:reqsn', authMiddleware, validate(reqsnParamSchema, 'params'), checkPaymentResult);
router.post('/sandbox-pay/:reqsn', authMiddleware, validate(reqsnParamSchema, 'params'), sandboxPay);
router.get('/billing', authMiddleware, validate(paginationSchema, 'query'), getBillingHistory);
router.get('/orders', authMiddleware, validate(paginationSchema, 'query'), getBillingHistory);

export default router;
