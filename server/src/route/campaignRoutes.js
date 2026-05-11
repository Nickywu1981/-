import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';
import * as ctrl from '../controller/campaignController.js';

const router = Router();
const idParam = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

// ---- Campaign ----
const campaignSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['promotion','coupon','event','announcement']).default('promotion'),
  description: z.string().max(2000).optional(),
  cover_url: z.string().max(500).optional(),
  rules: z.unknown().optional(),
  reward_type: z.string().max(50).optional(),
  reward_value: z.coerce.number().int().min(0).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.coerce.number().int().min(0).max(3).default(1),
  target_audience: z.string().max(50).default('all'),
  tenant_id: z.coerce.number().int().optional(),
  sort_order: z.coerce.number().int().default(0),
});

router.get('/campaigns', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(ctrl.listCampaigns));
router.get('/campaigns/:id', authMiddleware, adminAuth, validate(idParam, 'params'), asyncHandler(ctrl.getCampaign));
router.post('/campaigns', adminLimiter, authMiddleware, adminAuth, validate(campaignSchema), asyncHandler(ctrl.createCampaign));
router.put('/campaigns/:id', adminLimiter, authMiddleware, adminAuth, validate(idParam, 'params'), validate(campaignSchema.partial()), asyncHandler(ctrl.updateCampaign));
router.delete('/campaigns/:id', adminLimiter, authMiddleware, adminAuth, validate(idParam, 'params'), asyncHandler(ctrl.deleteCampaign));

// ---- Coupon ----
const couponSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  type: z.enum(['fixed','percent']).default('fixed'),
  value: z.coerce.number().min(0),
  min_order_amount: z.coerce.number().min(0).optional(),
  max_discount: z.coerce.number().min(0).optional(),
  total_quantity: z.coerce.number().int().min(0).default(0),
  per_user_limit: z.coerce.number().int().min(1).default(1),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.coerce.number().int().min(0).max(1).default(1),
  campaign_id: z.coerce.number().int().optional(),
});

router.get('/coupons', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(ctrl.listCoupons));
router.get('/coupons/:id', authMiddleware, adminAuth, validate(idParam, 'params'), asyncHandler(ctrl.getCoupon));
router.post('/coupons', adminLimiter, authMiddleware, adminAuth, validate(couponSchema), asyncHandler(ctrl.createCoupon));
router.put('/coupons/:id', adminLimiter, authMiddleware, adminAuth, validate(idParam, 'params'), validate(couponSchema.partial()), asyncHandler(ctrl.updateCoupon));
router.delete('/coupons/:id', adminLimiter, authMiddleware, adminAuth, validate(idParam, 'params'), asyncHandler(ctrl.deleteCoupon));
router.get('/user-coupons', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(ctrl.listUserCoupons));

// ---- Announcement ----
const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  type: z.enum(['system','activity','maintenance','notice']).default('notice'),
  level: z.coerce.number().int().min(1).max(3).default(1),
  is_pinned: z.coerce.number().int().min(0).max(1).default(0),
  target_audience: z.string().max(50).default('all'),
  publish_time: z.string().optional(),
  status: z.coerce.number().int().min(0).max(2).default(0),
});

router.get('/announcements', authMiddleware, adminAuth, validate(paginationSchema, 'query'), asyncHandler(ctrl.listAnnouncements));
router.get('/announcements/:id', authMiddleware, adminAuth, validate(idParam, 'params'), asyncHandler(ctrl.getAnnouncement));
router.post('/announcements', adminLimiter, authMiddleware, adminAuth, validate(announcementSchema), asyncHandler(ctrl.createAnnouncement));
router.put('/announcements/:id', adminLimiter, authMiddleware, adminAuth, validate(idParam, 'params'), validate(announcementSchema.partial()), asyncHandler(ctrl.updateAnnouncement));
router.delete('/announcements/:id', adminLimiter, authMiddleware, adminAuth, validate(idParam, 'params'), asyncHandler(ctrl.deleteAnnouncement));

export default router;
