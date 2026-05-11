/**
 * Enterprise Routes — 企业/代理端 API 路由
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 *
 * 路由前缀: /api/enterprise
 * 认证: 企业端 JWT (aud=enterprise)
 * CSRF: 双重提交 Cookie 模式 (setCsrfCookie + csrfProtection)
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware, enterpriseOnly } from '../middleware/auth.middleware.js';
import { roleGuard } from '../middleware/rbac.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { setCsrfCookie, csrfProtection } from '../middleware/csrf.js';
import * as ctrl from '../controller/enterpriseController.js';

const router = Router();

// ==================== Zod Schemas ====================

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/, '企业编码仅允许小写字母、数字、下划线和连字符'),
  contactName: z.string().min(2).max(50),
  contactPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式无效'),
  contactEmail: z.string().email().max(254),
  password: z.string().min(8).max(128),
  type: z.enum(['enterprise', 'agency']).optional(),
  logo: z.string().max(500).optional(),
  domain: z.string().max(253).optional(),
});

const loginSchema = z.object({
  account: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

const addUserSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式无效'),
  email: z.string().email().max(254).optional(),
  password: z.string().min(8).max(128),
  nickname: z.string().min(2).max(50),
  role: z.enum(['enterprise_user', 'enterprise_admin']).optional(),
});

const updateUserSchema = z.object({
  nickname: z.string().min(2).max(50).optional(),
  email: z.string().email().max(254).optional(),
  role: z.enum(['enterprise_user', 'enterprise_admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
}).strict();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  contactName: z.string().min(2).max(50).optional(),
  contactPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式无效').optional(),
  contactEmail: z.string().email().max(254).optional(),
}).strict();

const updateWhiteLabelSchema = z.object({
  logo: z.string().max(500).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '主色格式无效').optional(),
  domain: z.string().max(253).optional(),
  siteName: z.string().max(100).optional(),
}).strict();

const usageQuerySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20),
});

// ==================== 公开路由（无需认证） ====================

// 企业入驻 — 限流 + 校验 + CSRF
router.post('/register', authLimiter, csrfProtection, _validate(registerSchema), ctrl.registerEnterprise);

// 企业登录 — 限流 + 校验 + CSRF
router.post('/login', authLimiter, setCsrfCookie, _validate(loginSchema), ctrl.loginEnterprise);

// 企业退出 — 吊销所有 token
router.post('/logout', authMiddleware, enterpriseOnly, ctrl.logoutEnterprise);

// 企业套餐列表（公开查看）
router.get('/plans', ctrl.listPlans);

// ==================== 企业管理员路由 ====================
router.use(authMiddleware, enterpriseOnly);

// 企业信息 — CSRF 保护所有变更操作
router.get('/profile', ctrl.getProfile);
router.put('/profile', roleGuard('enterprise_admin'), csrfProtection, _validate(updateProfileSchema), ctrl.updateProfile);

// 子账号管理
router.get('/users', ctrl.listUsers);
router.post('/users', roleGuard('enterprise_admin'), csrfProtection, _validate(addUserSchema), ctrl.addUser);
router.put('/users/:id', roleGuard('enterprise_admin'), csrfProtection, _validate(updateUserSchema), ctrl.updateUser);
router.delete('/users/:id', roleGuard('enterprise_admin'), csrfProtection, ctrl.removeUser);

// 仪表盘 & 用量（读操作无需 CSRF）
router.get('/dashboard', ctrl.getDashboard);
router.get('/usage', _validate(usageQuerySchema), ctrl.getUsage);

// 白标配置
router.get('/whitelabel', ctrl.getWhiteLabel);
router.put('/whitelabel', roleGuard('enterprise_admin'), csrfProtection, _validate(updateWhiteLabelSchema), ctrl.updateWhiteLabel);

export default router;
