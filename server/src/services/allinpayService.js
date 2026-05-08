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
import logger from '../utils/logger.js';

const PLANS = {
  1: { name: '月卡', price: 29, days: 30, credits: 100 },
  2: { name: '季卡', price: 69, days: 90, credits: 200 },
  3: { name: '年卡', price: 199, days: 365, credits: 500 },
};

// ==================== 创建统一下单 ====================

export async function createUnifiedOrder({ userId, orderType, businessId, amount, payChannel, body, remark }) {
  if (!userId || !amount || !payChannel) {
    throw Object.assign(new Error('缺少必要参数'), { statusCode: 400 });
  }

  const validChannels = ['wechat', 'alipay', 'unionpay'];
  if (!validChannels.includes(payChannel)) {
    throw Object.assign(new Error('支付渠道无效'), { statusCode: 400 });
  }

  const reqsn = `MOV${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const trxamt = Math.round(amount * 100); // 元转分
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);

  // 1. 写入本地订单
  await allinpayDao.create({
    reqsn, orderType, businessId: businessId || reqsn, userId, amount, trxamt, payChannel, expireTime,
  });

  // 2. 调用通联统一下单
  const result = await allinpaySDK.unifiedOrder({
    trxamt, reqsn,
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
    throw new Error('签名验证失败');
  }

  // 3. 幂等检查
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

  if (order.status !== 0) {
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
