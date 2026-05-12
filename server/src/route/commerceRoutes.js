import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as validate } from '../utils/validate.js';
import { authMiddleware, enterpriseOnly } from '../middleware/auth.middleware.js';
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

router.use(authMiddleware, rateLimiter, enterpriseOnly);

// 企业端订单列表（仅查看旗下客户订单）
router.get('/', validate(orderQuerySchema, 'query'), (req, res) => ctrl.listOrders(req, res));

// 订单详情
router.get('/:id', (req, res) => ctrl.getOrderDetail(req, res));

// 订单统计（概览卡片）
router.get('/stats/summary', (req, res) => ctrl.getOrderStats(req, res));

export default router;
