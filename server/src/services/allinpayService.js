/**
 * 通联支付业务编排层
 *
 * 负责：创建统一下单 → 回调履约 → 订单查询
 * 回调处理必须幂等：同一 reqsn+trxid 重复回调仅处理一次
 */
import crypto from 'crypto';
import allinpayDao from '../dao/allinpayDao.js';
import * as allinpaySDK from '../utils/allinpaySDK.js';
import membershipDao from '../dao/membershipDao.js';
import rechargeDao from '../dao/rechargeDao.js';
import * as creditDao from '../dao/creditDao.js';
import * as notificationService from './notificationService.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ORDER_STATUS } from '../constants/domainStatus.js';

const PLANS = {
  1: { name: '月卡', price: 29, days: 30, credits: 100 },
  2: { name: '季卡', price: 69, days: 90, credits: 200 },
  3: { name: '年卡', price: 199, days: 365, credits: 500 },
};

// ==================== 创建统一下单 ====================

export async function createUnifiedOrder({ userId, orderType, businessId, amount, payChannel, body, remark }) {
  if (!userId || !amount || !payChannel) {
    throw new BusinessError(400, '缺少必要参数');
  }

  const validChannels = ['wechat', 'alipay', 'unionpay'];
  if (!validChannels.includes(payChannel)) {
    throw new BusinessError(400, '支付渠道无效');
  }

  const reqsn = `MOV${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const trxamt = Math.round(amount * 100); // 元转分
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);

  // 1. 写入本地订单
  await allinpayDao.create({
    reqsn, orderType, businessId: businessId || reqsn, userId, amount, trxamt, payChannel, expireTime,
  });

  // 2. 调用通联统一下单（含 payChannel 映射 paytype）
  const result = await allinpaySDK.unifiedOrder({
    trxamt, reqsn,
    payChannel,
    body: body || (orderType === 'membership' ? 'Movio会员购买' : 'Movio虾币充值'),
    remark: remark || '',
  });

  logger.info('[Allinpay] 统一下单成功', { reqsn, payUrl: result.payUrl });

  return {
    reqsn,
    payUrl: result.payUrl,
    trxid: result.trxid,
    expireTime,
  };
}

// ==================== 回调履约 ====================

export async function handleNotify(body) {
  const { reqsn, trxid } = body;

  // 1. 记录回调日志（幂等 — 总是插入）
  await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 0, processStatus: 0 });

  // 2. 验签
  const verified = allinpaySDK.verifyNotify(body);
  if (!verified) {
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 2, processStatus: 2, processMsg: '签名验证失败' });
    throw new BusinessError(400, '签名验证失败');
  }

  // 3. 幂等检查 + 分布式锁
  const lockKey = `notify_lock:${reqsn}`;
  let locked = false;
  try {
    const redis = await import('../dao/redis.js');
    const r = await redis.default.getRedis();
    if (r) {
      locked = await r.set(lockKey, '1', { NX: true, EX: 120 });
      if (!locked) {
        logger.info('[Allinpay] 回调并发冲突，跳过', { reqsn, trxid });
        return true;
      }
    }
  } catch { /* Redis 不可用，继续执行 */ }

  const alreadyProcessed = await allinpayDao.isCallbackProcessed(reqsn, trxid || '');
  if (alreadyProcessed) {
    logger.info('[Allinpay] 回调已处理，跳过', { reqsn, trxid });
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 1, processMsg: '已处理(幂等)' });
    return true;
  }

  // 4. 查询本地订单
  const order = await allinpayDao.getByReqsn(reqsn);
  if (!order) {
    logger.warn('[Allinpay] 回调订单不存在', { reqsn });
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 2, processMsg: '订单不存在' });
    return false;
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    logger.info('[Allinpay] 订单非待支付状态', { reqsn, status: order.status });
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 1, processMsg: `订单状态已为${order.status}` });
    return true;
  }

  // 5. 判断支付结果
  const paySuccess = String(body.trxstatus) === '0000' || String(body.status) === '1' || body.trxstatus === '0000';
  if (!paySuccess) {
    await allinpayDao.markFailed(reqsn);
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 1, processMsg: '支付失败' });
    return true;
  }

  // 6. 标记支付成功 (P0-4: 走 allinpayDao)
  await allinpayDao.markPaid(reqsn, trxid || '', body);

  if (order.order_type === 'membership') {
    await fulfillMembership(order);
  } else if (order.order_type === 'recharge') {
    await fulfillRecharge(order);
  }

  logger.info('[Allinpay] 回调履约成功', { reqsn, orderType: order.order_type });

  // 发送用户通知
  try {
    let title, content;
    if (order.order_type === 'membership') {
      const plan = Object.values(PLANS).find(p => p.price === Number(order.amount));
      title = '支付成功 — 会员已开通';
      content = plan
        ? `您已成功购买${plan.name}，获赠${plan.credits}积分，有效期${plan.days}天。`
        : `您已成功开通会员，支付￥${(order.amount / 100).toFixed(2)}。`;
    } else {
      const creditAmount = order.amount > 1000 ? Math.round(order.amount / 10) : order.amount;
      title = '支付成功 — 积分已到账';
      content = `您已成功充值${creditAmount}积分，支付￥${(order.amount / 100).toFixed(2)}。`;
    }
    await notificationService.sendNotification(order.user_id, { type: 'payment', title, content });
  } catch (e) { logger.warn('[Allinpay] 通知发送失败', { userId: order.user_id, error: e.message }); }

  await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 1, processMsg: '处理成功' });
  return true;
}

// ==================== 会员履约 (P0-4: 走 membershipDao) ====================

async function fulfillMembership(order) {
  const plan = Object.values(PLANS).find(p => p.price === Number(order.amount));
  if (!plan) { logger.warn('[Allinpay] 未匹配到会员套餐', { amount: order.amount }); return; }

  const days = plan.days;
  const credits = plan.credits;
  const planType = Number(Object.keys(PLANS).find(k => PLANS[k].price === plan.price)) || 1;
  const now = new Date();
  const endTime = new Date(now.getTime() + days * 86400000);

  const existing = await membershipDao.findByUserId(order.user_id);
  const creditBefore = existing ? existing.credit_balance : 0;

  if (existing) {
    const currentEnd = existing.end_time ? new Date(existing.end_time) : now;
    if (currentEnd > now) endTime.setTime(currentEnd.getTime() + days * 86400000);
  }

  await membershipDao.upsert(order.user_id, { plan_type: planType, credit_balance: creditBefore + credits, end_time: endTime, start_time: now });

  await creditDao.insertConsumptionLog({
    userId: order.user_id,
    type: 3,
    action: `purchase_plan_${planType}`,
    creditBefore,
    creditAfter: creditBefore + credits,
    consumed: plan.price,
    remark: `${plan.name} — 通联支付 ${order.reqsn}`,
    requestId: order.reqsn,
    status: 1,
  });

  logger.info('[Allinpay] 会员履约完成', {
    userId: order.user_id, planType, days, credits, creditAfter: creditBefore + credits, endTime,
  });
}

// ==================== 充值履约 (P0-4: 走 membershipDao + rechargeDao) ====================

async function fulfillRecharge(order) {
  const rechargeOrder = await rechargeDao.getByOrderNo(order.business_id);
  if (!rechargeOrder) { logger.warn('[Allinpay] 充值订单不存在', { businessId: order.business_id }); return; }

  const existing = await membershipDao.findByUserId(order.user_id);
  const creditBefore = existing ? existing.credit_balance : 0;

  await rechargeDao.markPaid(order.business_id, order.trxid || order.reqsn);
  await membershipDao.upsert(order.user_id, { credit_balance: creditBefore + rechargeOrder.coin_amount });

  await creditDao.insertConsumptionLog({
    userId: order.user_id,
    type: 3,
    action: 'recharge_coins',
    creditBefore,
    creditAfter: creditBefore + rechargeOrder.coin_amount,
    consumed: Number(rechargeOrder.amount),
    remark: `虾币充值 ${rechargeOrder.coin_amount}个 — 通联支付 ${order.reqsn}`,
    requestId: order.reqsn,
    status: 1,
  });

  logger.info('[Allinpay] 充值履约完成', {
    userId: order.user_id, amount: rechargeOrder.amount, credits: rechargeOrder.coin_amount,
  });
}

// ==================== 查询订单 ====================

export async function queryOrder(reqsn) {
  const order = await allinpayDao.getByReqsn(reqsn);
  if (!order) return null;

  return {
    reqsn: order.reqsn,
    trxid: order.trxid,
    status: order.status,
    amount: Number(order.amount),
    payChannel: order.pay_channel,
    expireTime: order.expire_time,
    payTime: order.pay_time,
    createTime: order.create_time,
  };
}
