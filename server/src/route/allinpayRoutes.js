import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import * as notifyController from '../controller/allinpayNotifyController.js';

const router = Router();

// 通联支付异步回调 —— 无认证、无 CSRF、无 Zod 校验
// 原因：第三方支付平台回调格式不受我方控制，添加 Schema 校验可能导致
// 平台格式变更时误拒绝有效回调，造成资金对账异常
// 安全措施：paymentLimiter 防止回调地址被恶意洪水攻击
router.post('/notify', paymentLimiter, asyncHandler(notifyController.handleNotify));

export default router;
