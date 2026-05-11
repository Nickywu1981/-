/**
 * Enterprise Routes — 企业/代理端 API 路由
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 *
 * 路由前缀: /api/enterprise
 * 认证: 企业端 JWT (aud=enterprise)
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { enterpriseOnly } from '../platform/authCenter.js';
import { roleGuard } from '../middleware/rbac.js';
import { authLimiter, paymentLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/enterpriseController.js';

const router = Router();

// ==================== 公开路由（无需认证） ====================

// 企业入驻 — 限流防批量注册
router.post('/register', authLimiter, ctrl.registerEnterprise);

// 企业登录 — 限流防暴力破解
router.post('/login', authLimiter, ctrl.loginEnterprise);

// 企业套餐列表（公开查看）
router.get('/plans', ctrl.listPlans);

// ==================== 企业管理员路由 ====================

// 企业信息
router.get('/profile', authMiddleware, enterpriseOnly, ctrl.getProfile);
router.put('/profile', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), ctrl.updateProfile);

// 子账号管理
router.get('/users', authMiddleware, enterpriseOnly, ctrl.listUsers);
router.post('/users', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), ctrl.addUser);
router.put('/users/:id', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), ctrl.updateUser);
router.delete('/users/:id', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), ctrl.removeUser);

// 仪表盘 & 用量
router.get('/dashboard', authMiddleware, enterpriseOnly, ctrl.getDashboard);
router.get('/usage', authMiddleware, enterpriseOnly, ctrl.getUsage);

// 白标配置
router.get('/whitelabel', authMiddleware, enterpriseOnly, ctrl.getWhiteLabel);
router.put('/whitelabel', authMiddleware, enterpriseOnly, roleGuard('enterprise_admin'), ctrl.updateWhiteLabel);

export default router;
