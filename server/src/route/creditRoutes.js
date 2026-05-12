import { Router } from 'express';
import { getMembership, freezeCredit, confirmCredit, rollbackCredit, listRecords, listAllRecords, adminRefund, checkIn, checkInStatus, shareReward, creditHistory, creditBalance } from '../controller/creditController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { paymentLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { validate, idSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const freezeSchema = z.object({
  requestId: z.string().min(1, 'requestId 不能为空').max(50),
  action: z.string().min(1, 'action 不能为空').max(30),
  batchCount: z.coerce.number().int().min(1).optional(),
  isNight: z.coerce.boolean().optional(),
});
const confirmSchema = z.object({ requestId: z.string().min(1, 'requestId 不能为空').max(50) });
const rollbackSchema = z.object({
  requestId: z.string().optional(),
  recordId: idSchema.optional(),
  remark: z.string().max(500).optional(),
});
const adminRefundSchema = z.object({
  recordId: idSchema,
  remark: z.string().max(500).optional(),
});

router.get('/membership', authMiddleware, getMembership);
router.get('/records', authMiddleware, listRecords);
router.post('/freeze', paymentLimiter, authMiddleware, validate(freezeSchema), freezeCredit);
router.post('/confirm', paymentLimiter, authMiddleware, validate(confirmSchema), confirmCredit);
router.post('/rollback', paymentLimiter, authMiddleware, validate(rollbackSchema), rollbackCredit);
router.get('/admin/records', adminLimiter, authMiddleware, adminAuth, listAllRecords);
router.post('/admin/refund', adminLimiter, authMiddleware, adminAuth, validate(adminRefundSchema), adminRefund);

// 签到与奖励
router.post('/checkin', paymentLimiter, authMiddleware, checkIn);
router.get('/checkin/status', authMiddleware, checkInStatus);
router.post('/share-reward', paymentLimiter, authMiddleware, shareReward);
router.get('/history', authMiddleware, creditHistory);
router.get('/balance', authMiddleware, creditBalance);

export default router;
