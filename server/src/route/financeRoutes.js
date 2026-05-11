/**
 * Finance Routes — 财务路由
 *
 * Phase 2: 财务核心 (2026-05-11)
 *
 * 路由前缀: /api/enterprise/finance
 * 认证: 企业端 JWT (aud=enterprise)
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware, enterpriseOnly, requireAgent } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { setCsrfCookie, csrfProtection } from '../middleware/csrf.js';
import * as ctrl from '../controller/financeController.js';

const router = Router();

// ==================== Zod Schemas ====================

const bankAccountSchema = z.object({
  accountType: z.enum(['bank', 'alipay', 'wechat']),
  accountName: z.string().min(2).max(50),
  accountNo: z.string().min(10).max(50),
  bankName: z.string().max(100).optional(),
  bankBranch: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

const withdrawalSchema = z.object({
  amount: z.number().positive('提现金额必须大于0'),
  bankAccountId: z.number().int().positive().optional(),
});

const commissionPolicySchema = z.object({
  level1Rate: z.number().min(0).max(100).optional(),
  level2Rate: z.number().min(0).max(100).optional(),
  minWithdrawal: z.number().min(1).optional(),
  settlementCycle: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
});

// ==================== 收款账户 ====================
router.get('/bank-accounts', authMiddleware, enterpriseOnly, ctrl.listBankAccounts);
router.post('/bank-account', authMiddleware, enterpriseOnly, paymentLimiter, csrfProtection, _validate(bankAccountSchema), ctrl.addBankAccount);
router.delete('/bank-accounts/:id', authMiddleware, enterpriseOnly, paymentLimiter, csrfProtection, ctrl.removeBankAccount);

// ==================== 账户流水 ====================
router.get('/ledger', authMiddleware, enterpriseOnly, ctrl.listLedger);

// ==================== 结算记录 ====================
router.get('/settlement', authMiddleware, enterpriseOnly, ctrl.listSettlements);
router.get('/settlement/:id', authMiddleware, enterpriseOnly, ctrl.getSettlementDetail);

// ==================== 佣金收益（仅代理） ====================
router.get('/earnings', authMiddleware, enterpriseOnly, requireAgent, ctrl.listEarnings);

// ==================== 提现（仅代理） ====================
router.get('/withdrawal', authMiddleware, enterpriseOnly, requireAgent, ctrl.listWithdrawals);
router.post('/withdrawal', authMiddleware, enterpriseOnly, requireAgent, paymentLimiter, csrfProtection, _validate(withdrawalSchema), ctrl.createWithdrawal);
router.get('/withdrawal/:id', authMiddleware, enterpriseOnly, requireAgent, ctrl.getWithdrawalDetail);

// ==================== 分润政策（仅代理） ====================
router.get('/policy', authMiddleware, enterpriseOnly, requireAgent, ctrl.getCommissionPolicy);
router.put('/policy', authMiddleware, enterpriseOnly, requireAgent, requireRole('agent_admin'), paymentLimiter, csrfProtection, _validate(commissionPolicySchema), ctrl.updateCommissionPolicy);

// ==================== 财务仪表盘 ====================
router.get('/dashboard', authMiddleware, enterpriseOnly, setCsrfCookie, ctrl.getFinanceDashboard);

export default router;
