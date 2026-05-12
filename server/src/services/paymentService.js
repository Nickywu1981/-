/**
 * 支付服务
 *
 * 通联支付聚合收银台：创建订单 → 返回 H5 支付链接 → 回调通知 → 开通会员
 */
import { ORDER_STATUS } from '../constants/domainStatus.js';
import { BusinessError } from '../utils/businessError.js';
import * as allinpayService from '../services/allinpayService.js';
import allinpayDao from '../dao/allinpayDao.js';
import allinpayConfig from '../config/allinpay.js';
import logger from '../utils/logger.js';

import * as creditDao from '../dao/creditDao.js';

let PLANS_CACHE = null;
let PLANS_CACHE_TS = 0;

async function loadPlansFromDB() {
  if (PLANS_CACHE && Date.now() - PLANS_CACHE_TS < 300000) return PLANS_CACHE;
  const rows = await creditDao.listActivePlans();
  PLANS_CACHE = {};
  for (const r of rows) {
    PLANS_CACHE[r.plan_type] = {
      name: r.name,
      price: Number(r.price),
      original_price: Number(r.original_price),
      credits: Number(r.credits),
      daily_credits: r.daily_credits ? Number(r.daily_credits) : null,
      save_days: r.save_days || 30,
    };
  }
  PLANS_CACHE_TS = Date.now();
  return PLANS_CACHE;
}

async function getPlansFromDB() {
  try {
    return await loadPlansFromDB();
  } catch (e) {
    logger.error('[Payment] 加载套餐失败', e.message);
    throw new BusinessError(503, '会员套餐信息暂时不可用，请稍后再试');
  }
}

export async function getPlans() {
  const dbPlans = await getPlansFromDB();
  return Object.entries(dbPlans).map(([k, v]) => ({ planType: Number(k), ...v }));
}

// ==================== 创建支付订单（通联聚合支付） ====================

export async function createPaymentOrder(userId, { planType, payChannel = 'wechat' }) {
  const dbPlans = await getPlansFromDB();
  const plan = dbPlans[planType];
  if (!plan) throw new BusinessError(400, '无效套餐');

  if (!['wechat', 'alipay', 'unionpay'].includes(payChannel)) throw new BusinessError(400, '支付方式仅支持 wechat / alipay / unionpay');

  const result = await allinpayService.createUnifiedOrder({
    userId,
    orderType: 'membership',
    businessId: '',
    amount: plan.price,
    payChannel,
    body: `Movio ${plan.name}`,
  });

  logger.info(`[Payment] 订单创建: ${result.reqsn} | 用户${userId} | ${plan.name} ¥${plan.price}`);

  return {
    reqsn: result.reqsn,
    payUrl: result.payUrl,
    amount: plan.price,
    planName: plan.name,
    payChannel,
    expireTime: result.expireTime,
  };
}

// ==================== 沙箱支付（仅沙箱模式可用） ====================

export async function sandboxPay(orderId) {
  if (process.env.NODE_ENV === 'production') throw new BusinessError(403, '沙箱支付不可在生产环境使用');
  if (!allinpayConfig.isSandbox) throw new BusinessError(403, '沙箱支付仅开发环境可用');

  const order = await allinpayService.queryOrder(orderId);
  if (!order) throw new BusinessError(404, '订单不存在');
  if (order.status !== ORDER_STATUS.PENDING) throw new BusinessError(400, `订单状态异常: ${order.status}`);

  // 模拟回调
  const mockBody = {
    reqsn: order.reqsn,
    trxid: `SANDBOX_${Date.now()}`,
    trxstatus: '0000',
    sign: '',
  };
  await allinpayService.handleNotify(mockBody);

  return { reqsn: order.reqsn, status: 'paid', planName: '沙箱测试' };
}

// ==================== 查询订单 ====================

export async function getOrder(reqsn) {
  const order = await allinpayService.queryOrder(reqsn);
  if (!order) throw new BusinessError(404, '订单不存在');
  return order;
}

// ==================== 账单 ====================

export async function getBillingHistory(userId) {
  return allinpayDao.getBillingHistory(userId);
}
