/**
 * 支付服务
 *
 * 通联支付聚合收银台：创建订单 → 返回 H5 支付链接 → 回调通知 → 开通会员
 */
import { ORDER_STATUS } from '../constants/domainStatus.js';
import { BusinessError } from '../utils/businessError.js';
import * as allinpayService from '../services/allinpayService.js';
import pool from '../dao/db.js';
import allinpayConfig from '../config/allinpay.js';
import logger from '../utils/logger.js';

const PLANS = {
  1: { name: '月卡', price: 29, days: 30, credits: 100 },
  2: { name: '季卡', price: 69, days: 90, credits: 200 },
  3: { name: '年卡', price: 199, days: 365, credits: 500 },
};

export function getPlans() {
  return Object.entries(PLANS).map(([k, v]) => ({ planType: Number(k), ...v }));
}

// ==================== 创建支付订单（通联聚合支付） ====================

export async function createPaymentOrder(userId, { planType, payChannel = 'wechat' }) {
  const plan = PLANS[planType];
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
  try {
    const [rows] = await pool.query(
      'SELECT * FROM allinpay_order WHERE user_id = ? AND status = 1 ORDER BY create_time DESC LIMIT 50',
      [userId],
    );
    return rows;
  } catch {
    return [];
  }
}
