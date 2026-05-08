import { Router } from 'express';
import { getMembership, freezeCredit, confirmCredit, rollbackCredit, listRecords, listAllRecords, adminRefund, checkIn, checkInStatus, shareReward, creditHistory, creditBalance } from '../controller/creditController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const freezeSchema = z.object({
  taskId: idSchema,
  credits: z.coerce.number().int().min(1, '算力至少为1'),
  remark: z.string().max(500).optional(),
});
const confirmSchema = z.object({ taskId: idSchema });
const rollbackSchema = z.object({ taskId: idSchema, reason: z.string().max(500).optional() });
const adminRefundSchema = z.object({
  userId: idSchema,
  credits: z.coerce.number().int().min(1, '退还算力至少为1'),
  reason: z.string().max(500).optional(),
});

router.get('/membership', authMiddleware, asyncHandler(getMembership));
router.get('/records', authMiddleware, asyncHandler(listRecords));
router.post('/freeze', authMiddleware, validate(freezeSchema), asyncHandler(freezeCredit));
router.post('/confirm', authMiddleware, validate(confirmSchema), asyncHandler(confirmCredit));
router.post('/rollback', authMiddleware, validate(rollbackSchema), asyncHandler(rollbackCredit));
router.get('/admin/records', authMiddleware, adminAuth, asyncHandler(listAllRecords));
router.post('/admin/refund', authMiddleware, adminAuth, validate(adminRefundSchema), asyncHandler(adminRefund));

// 签到与奖励
router.post('/checkin', authMiddleware, asyncHandler(checkIn));
router.get('/checkin/status', authMiddleware, asyncHandler(checkInStatus));
router.post('/share-reward', authMiddleware, asyncHandler(shareReward));
router.get('/history', authMiddleware, asyncHandler(creditHistory));
router.get('/balance', authMiddleware, asyncHandler(creditBalance));

export default router;
