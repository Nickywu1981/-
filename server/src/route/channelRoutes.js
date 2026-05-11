import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as validate } from '../utils/validate.js';
import { authMiddleware, enterpriseOnly } from '../middleware/auth.middleware.js';
import { roleGuard } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/channelController.js';

const router = Router();

// ==================== Zod Schemas ====================

const applySchema = z.object({
  agentCode: z.string().min(3).max(50),
});

const auditSchema = z.object({
  status: z.enum(['active', 'rejected', 'suspended']),
  auditRemark: z.string().max(500).optional(),
});

const policySchema = z.object({
  name: z.string().min(2).max(100),
  targetLevel: z.coerce.number().int().min(1).max(3).optional().default(1),
  commissionRate: z.coerce.number().min(0).max(100),
  minRevenue: z.coerce.number().min(0).optional().default(0),
  maxCap: z.coerce.number().min(0).optional().nullable(),
  productTypes: z.array(z.string()).optional(),
  settlementCycle: z.enum(['realtime', 'daily', 'weekly', 'monthly']).optional().default('monthly'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const policyUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  minRevenue: z.coerce.number().min(0).optional(),
  maxCap: z.coerce.number().min(0).optional().nullable(),
  settlementCycle: z.enum(['realtime', 'daily', 'weekly', 'monthly']).optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).strict();

const perfQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  childTenantId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20),
});

// ==================== 全局中间件 ====================
router.use(authMiddleware, rateLimiter, enterpriseOnly);

// ==================== 渠道关系 ====================

router.get('/relations', ctrl.listChannels);
router.get('/relations/:id', ctrl.getChannelDetail);
router.post('/relations', csrfProtection, validate(applySchema), ctrl.applyChannel);
router.put('/relations/:id/audit', roleGuard('enterprise_admin'), csrfProtection, validate(auditSchema), ctrl.auditChannel);
router.get('/downstream', ctrl.getDownstreamAgents);

// ==================== 分润政策 ====================

router.get('/policies', ctrl.listPolicies);
router.post('/policies', roleGuard('enterprise_admin'), csrfProtection, validate(policySchema), ctrl.createPolicy);
router.put('/policies/:id', roleGuard('enterprise_admin'), csrfProtection, validate(policyUpdateSchema), ctrl.updatePolicy);

// ==================== 渠道业绩 ====================

router.get('/performance', validate(perfQuerySchema, 'query'), ctrl.getPerformance);
router.get('/performance/summary', ctrl.getPerformanceSummary);

export default router;
