import { Router } from 'express';
import { z } from 'zod';
import { listRules, getRule, createRule, updateRule, deleteRule } from '../controller/geoRulesController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';

const geoSchema = z.object({
  rule_name: z.string().min(1).max(100),
  country_codes: z.array(z.string().min(2).max(2)).min(1),
  platform_codes: z.array(z.string()).optional(),
  locale: z.string().max(10).optional().nullable(),
  blocked_models: z.array(z.string()).optional().nullable(),
  review_level: z.number().int().min(0).max(5).optional(),
  output_constraints: z.record(z.unknown()).optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
  enabled: z.number().int().min(0).max(1).optional(),
  description: z.string().max(500).optional(),
});

const updateGeoSchema = z.object({
  rule_name: z.string().min(1).max(100).optional(),
  country_codes: z.array(z.string().min(2).max(2)).min(1).optional(),
  platform_codes: z.array(z.string()).optional(),
  locale: z.string().max(10).optional().nullable(),
  blocked_models: z.array(z.string()).optional().nullable(),
  review_level: z.number().int().min(0).max(5).optional(),
  output_constraints: z.record(z.unknown()).optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
  enabled: z.number().int().min(0).max(1).optional(),
  description: z.string().max(500).optional(),
});

const adminRouter = Router();
adminRouter.get('/', authMiddleware, rateLimiter, adminAuth, listRules);
adminRouter.get('/:id', authMiddleware, rateLimiter, adminAuth, getRule);
adminRouter.post('/', authMiddleware, rateLimiter, adminAuth, validate(geoSchema), createRule);
adminRouter.put('/:id', authMiddleware, rateLimiter, adminAuth, validate(updateGeoSchema), updateRule);
adminRouter.delete('/:id', authMiddleware, rateLimiter, adminAuth, deleteRule);

export { adminRouter };
