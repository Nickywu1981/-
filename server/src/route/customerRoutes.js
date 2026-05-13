/**
 * Customer Routes — 客户管理路由
 *
 * Phase 7: 客户管理模块 (2026-05-11)
 *
 * 挂载点: /api/enterprise/customers (由 app.js 提供前缀)
 * 认证: 企业端 JWT (aud=enterprise)
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 } from '../utils/validate.js';
import { authMiddleware, enterpriseOnly } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/customerController.js';

const router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

const tagUserSchema = z.object({
  userId: z.number().int().positive(),
});

const batchTagSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1).max(500),
});

router.use(enterpriseOnly);
router.use(rateLimiter);

// 客户查询 (挂载后: GET /api/enterprise/customers)
router.get('/', ctrl.listCustomers);
router.get('/stats', ctrl.getCustomerStats);
router.get('/:id', ctrl.getCustomerDetail);

// 标签管理 (挂载后: GET/POST /api/enterprise/customers/tags)
router.get('/tags', ctrl.listTags);
router.post('/tags', validateV4(createTagSchema), ctrl.createTag);
router.put('/tags/:id', validateV4(updateTagSchema), ctrl.updateTag);
router.delete('/tags/:id', ctrl.deleteTag);

// 打标操作
router.post('/tags/:tagId/customers', validateV4(tagUserSchema), ctrl.tagCustomer);
router.delete('/tags/:tagId/customers', validateV4(tagUserSchema), ctrl.untagCustomer);
router.post('/tags/:tagId/batch', validateV4(batchTagSchema), ctrl.batchTagCustomers);

export default router;
