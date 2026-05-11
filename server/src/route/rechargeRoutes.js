import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { paymentLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as rechargeController from '../controller/rechargeController.js';

const router = Router();

const createOrderSchema = z.object({
  amount: z.number().int().min(1),
  channel: z.enum(['wechat', 'alipay', 'unionpay']).optional(),
});
const refundSchema = z.object({
  reason: z.string().max(500).optional(),
});

const callbackChannelSchema = z.object({
  channel: z.enum(['wechat', 'alipay', 'unionpay']),
});
const reqsnParamSchema = z.object({ reqsn: z.string().min(1) });
const orderNoParamSchema = z.object({ orderNo: z.string().min(1) });

router.get('/rates', rechargeController.getRates);
router.get('/', authMiddleware, rechargeController.listUserOrders);
router.get('/orders', authMiddleware, rechargeController.listUserOrders);
router.post('/create', paymentLimiter, authMiddleware, validate(createOrderSchema), rechargeController.createOrder);
router.get('/result/:reqsn', authMiddleware, validate(reqsnParamSchema, 'params'), rechargeController.checkPaymentResult);
router.post('/callback/:channel', paymentLimiter, validate(callbackChannelSchema, 'params'), rechargeController.handleCallback);
router.get('/admin/orders', adminLimiter, authMiddleware, adminAuth, rechargeController.listAllOrders);
router.post('/admin/refund/:orderNo', paymentLimiter, authMiddleware, adminAuth, validate(orderNoParamSchema, 'params'), validate(refundSchema), rechargeController.refundOrder);

export default router;
