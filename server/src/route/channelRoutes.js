import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { enterpriseOnly } from '../middleware/auth.middleware.js';
import { roleGuard } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';
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

// ==================== 渠道关系 ====================

router.get('/relations', authMiddleware, enterpriseOnly, ctrl.listChannels);
router.get('/relations/:id', authMiddleware, enterpriseOnly, ctrl.getChannelDetail);
router.post('/relations', authMiddleware, enterpriseOnly, csrfProtection, validate(applySchema), ctrl.applyChannel);
router.put('/relations/:id/audit', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), csrfProtection, validate(auditSchema), ctrl.auditChannel);
router.get('/downstream', authMiddleware, enterpriseOnly, ctrl.getDownstreamAgents);

// ==================== 分润政策 ====================

router.get('/policies', authMiddleware, enterpriseOnly, ctrl.listPolicies);
router.post('/policies', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), csrfProtection, validate(policySchema), ctrl.createPolicy);
router.put('/policies/:id', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), csrfProtection, validate(policyUpdateSchema), ctrl.updatePolicy);

// ==================== 渠道业绩 ====================

router.get('/performance', authMiddleware, enterpriseOnly, validate(perfQuerySchema, 'query'), ctrl.getPerformance);
router.get('/performance/summary', authMiddleware, enterpriseOnly, ctrl.getPerformanceSummary);

export default router;
