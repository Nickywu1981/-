import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { enterpriseOnly } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/commerceController.js';

const router = Router({ mergeParams: true });

const orderQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'completed', 'refunded', 'cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  keyword: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20),
});

router.use(rateLimiter, enterpriseOnly);

// 企业端订单列表（仅查看旗下客户订单）
router.get('/', _validate(orderQuerySchema, 'query'), ctrl.listOrders);

// 订单详情
router.get('/:id', ctrl.getOrderDetail);

// 订单统计（概览卡片）
router.get('/stats/summary', ctrl.getOrderStats);

export default router;
