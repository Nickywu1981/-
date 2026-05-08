import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idSchema } from '../utils/validate.js';
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

router.get('/rates', asyncHandler(rechargeController.getRates));
router.get('/', authMiddleware, asyncHandler(rechargeController.listUserOrders));
router.get('/orders', authMiddleware, asyncHandler(rechargeController.listUserOrders));
router.post('/create', authMiddleware, validate(createOrderSchema), asyncHandler(rechargeController.createOrder));
router.get('/result/:reqsn', authMiddleware, asyncHandler(rechargeController.checkPaymentResult));
router.post('/callback/:channel', asyncHandler(rechargeController.handleCallback));
router.get('/admin/orders', authMiddleware, adminAuth, asyncHandler(rechargeController.listAllOrders));
router.post('/admin/refund/:orderNo', authMiddleware, adminAuth, validate(refundSchema), asyncHandler(rechargeController.refundOrder));

export default router;
