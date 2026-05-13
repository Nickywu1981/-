/**
 * 通联支付业务编排层
 *
 * 负责：创建统一下单 → 回调履约 → 订单查询
 * 回调处理必须幂等：同一 reqsn+trxid 重复回调仅处理一次
 */
import crypto from 'crypto';
import { withTransaction } from '../dao/transaction.js';
import allinpayDao from '../dao/allinpayDao.js';
import * as allinpaySDK from '../utils/allinpaySDK.js';
import membershipDao from '../dao/membershipDao.js';
import rechargeDao from '../dao/rechargeDao.js';
import * as creditDao from '../dao/creditDao.js';
import * as notificationService from './notificationService.js';
import { settleCommission } from './distribution.service.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ORDER_STATUS } from '../constants/domainStatus.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 注意：会员套餐详情从 database membership_plan 表读取
// 此处仅保留 plan_type → name 的静态映射供回调日志使用
// 积分/价格由 getPlanByType(planType) 实时查询数据库
const PLAN_NAMES = {
  1: '月卡',
  2: '季卡',
  3: '年卡',
};

// ==================== 创建统一下单 ====================

export async function createUnifiedOrder({ userId, orderType, businessId, amount, payChannel, body, remark }) {
  if (!userId || !amount || !payChannel) {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }

  const validChannels = ['wechat', 'alipay', 'unionpay'];
  if (!validChannels.includes(payChannel)) {
    throw new BusinessError(ERROR_CODE.PARAM_INVALID);
  }

  const reqsn = `MOV${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const trxamt = Math.round(amount * 100); // 元转分
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);

  // 1. 写入本地订单
  await allinpayDao.create({
    reqsn, orderType, businessId: businessId || reqsn, userId, amount, trxamt, payChannel, expireTime,
  });

  // 2. 调用通联统一下单（失败时标记本地订单为失败，防止孤儿订单）
  let result;
  try {
    result = await allinpaySDK.unifiedOrder({
      trxamt, reqsn,
      payChannel,
      body: body || (orderType === 'membership' ? 'Movio会员购买' : 'Movio虾币充值'),
      remark: remark || '',
    });
  } catch (err) {
    await allinpayDao.markFailed(reqsn).catch(e => logger.error('[Allinpay] markFailed 失败', { reqsn, error: e.message }));
    throw err;
  }

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

  // 1. 先验签（防恶意回调污染数据库）
  const verified = await allinpaySDK.verifyNotify(body);
  if (!verified) {
    logger.warn('[Allinpay] 回调签名验证失败', { reqsn, trxid });
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 0, processStatus: 2, processMsg: '签名验证失败' });
    throw new BusinessError(ERROR_CODE.PAY_SIGN_FAILED);
  }

  // 2. 记录回调日志（验签通过后才入库）
  await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 0 });

  // 3. 幂等检查 + 分布式锁
  const lockKey = `notify_lock:${reqsn}`;
  let locked = false;
  try {
    const { getRedis } = await import('../dao/redis.js');
    const r = await getRedis();
    if (r) {
      locked = await r.set(lockKey, '1', { NX: true, EX: 120 });
      if (!locked) {
        logger.info('[Allinpay] 回调并发冲突，跳过', { reqsn, trxid });
        return true;
      }
    }
  } catch (e) { logger.warn('[Allinpay] Redis 锁失败，继续执行', { message: e.message }); }

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

  // 5. 判断支付结果 + 金额校验
  const rawTrxamt = Number(body.trxamt);
  const rawAmount = Number(body.amount);
  const callbackAmount = Number.isFinite(rawTrxamt) ? rawTrxamt / 100 : (Number.isFinite(rawAmount) ? rawAmount : 0);
  const orderAmount = Number(order.amount);
  if (!Number.isFinite(orderAmount)) {
    logger.error('[Allinpay] 订单金额非法', { reqsn, amount: order.amount });
    await allinpayDao.markFailed(reqsn);
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 2, processMsg: `订单金额非法: ${order.amount}` });
    return false;
  }
  if (callbackAmount > 0 && Math.abs(callbackAmount - orderAmount) > 0.01) {
    logger.error('[Allinpay] 回调金额与订单金额不匹配', { reqsn, callbackAmount, orderAmount });
    await allinpayDao.markFailed(reqsn);
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 2, processMsg: `金额不匹配: 回调${callbackAmount} != 订单${orderAmount}` });
    return false;
  }

  const paySuccess = String(body.trxstatus) === '0000' || String(body.status) === '1' || body.trxstatus === '0000';
  if (!paySuccess) {
    await allinpayDao.markFailed(reqsn);
    await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 1, processMsg: '支付失败' });
    return true;
  }

  // 6. 事务包裹：标记支付 + 履约发放（防数据损坏）
  let skipped = false;
  try {
    await withTransaction(async (conn) => {
      const affected = await allinpayDao.markPaid(reqsn, trxid || '', body, conn);
      if (affected === 0) {
        skipped = true;
        throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);
      }

      if (order.order_type === 'membership') {
        await fulfillMembership(order, conn);
      } else if (order.order_type === 'recharge') {
        await fulfillRecharge(order, conn);
      }
    });
  } catch (e) {
    if (skipped) {
      logger.info('[Allinpay] 订单已被并发回调处理，跳过履约', { reqsn });
      return true;
    }
    logger.error('[Allinpay] 回调履约失败，已回滚', { reqsn, orderType: order.order_type, error: e.message });
    throw e;
  }

  logger.info('[Allinpay] 回调履约成功', { reqsn, orderType: order.order_type });

  // 发送用户通知
  try {
    let title, content;
    if (order.order_type === 'membership') {
      let planType = Number(order.plan_type) || 0;
      if (!planType) {
        const amount = Number(order.amount);
        if (amount <= 29) planType = 1;
        else if (amount <= 69) planType = 2;
        else if (amount <= 199) planType = 3;
      }
      const planName = PLAN_NAMES[planType] || '会员';
      const dbPlan = await creditDao.getPlanByType(planType);
      title = '支付成功 — 会员已开通';
      content = dbPlan
        ? `您已成功购买${dbPlan.name || planName}，获赠${dbPlan.credits}积分，有效期${dbPlan.save_days}天。`
        : `您已成功开通${planName}，支付￥${Number(order.amount).toFixed(2)}。`;
    } else {
      // 充值: 读取实际充值套餐比例
      const rechargeOrder = await rechargeDao.getByOrderNo(order.business_id);
      const creditAmount = rechargeOrder ? rechargeOrder.coin_amount : Math.round((Number(order.amount) || 0) * 10);
      title = '支付成功 — 积分已到账';
      content = `您已成功充值${creditAmount}积分，支付￥${Number(order.amount).toFixed(2)}。`;
    }
    await notificationService.sendNotification(order.user_id, { type: 'payment', title, content });
  } catch (e) { logger.warn('[Allinpay] 通知发送失败', { userId: order.user_id, error: e.message }); }

  // Phase 2: 会员/充值支付成功后自动结算分销佣金
  try {
    const amount = Number(order.amount) || 0;
    if (amount > 0) {
      const settled = await settleCommission(order.user_id, order.id || order.business_id, amount);
      if (settled.length > 0) {
        logger.info('[Allinpay] 佣金结算完成', { orderId: order.id, commissions: settled.length });
      }
    }
  } catch (e) { logger.warn('[Allinpay] 佣金结算失败（非阻塞）', { userId: order.user_id, error: e.message }); }

  await allinpayDao.logNotify({ reqsn, trxid, notifyBody: JSON.stringify(body), signVerified: 1, processStatus: 1, processMsg: '处理成功' });
  return true;
}

// ==================== 会员履约 (P0-4: 走 membershipDao) ====================

async function fulfillMembership(order, conn) {
  let planType = Number(order.plan_type) || 0;
  if (!planType) {
    const allPlans = await creditDao.listActivePlans();
    const orderAmt = Number(order.amount);
    const matched = Number.isFinite(orderAmt) ? allPlans.find(p => Math.abs(Number(p.price) - orderAmt) < 0.01) : undefined;
    if (matched) planType = matched.plan_type;
  }

  const dbPlan = await creditDao.getPlanByType(planType);
  if (!dbPlan) { logger.warn('[Allinpay] 未匹配到会员套餐', { amount: order.amount, planType }); return; }

  const credits = Number(dbPlan.credits) || 0;
  const saveDays = dbPlan.save_days || 30;
  const now = new Date();
  const endTime = new Date(now.getTime() + saveDays * 86400000);

  const existing = await membershipDao.findByUserId(order.user_id);
  if (existing) {
    const currentEnd = existing.end_time ? new Date(existing.end_time) : now;
    if (currentEnd > now) endTime.setTime(currentEnd.getTime() + saveDays * 86400000);
  }

  // 存储过程：先 upsert 结构（不覆盖点数），再原子递增点数
  await membershipDao.upsert(order.user_id, { plan_type: planType, credit_balance: 0, end_time: endTime, start_time: now }, conn);
  if (credits > 0) await creditDao.updateCreditBalance(order.user_id, credits, conn);

  // 读取最终余额写日志（通过事务连接确保读到已提交的写入）
  const updated = await membershipDao.findByUserId(order.user_id, conn);
  const creditBefore = (updated?.credit_balance || 0) - credits;
  const creditAfter = updated?.credit_balance || 0;

  await creditDao.insertConsumptionLog({
    userId: order.user_id,
    type: 3,
    action: `purchase_plan_${planType}`,
    creditBefore,
    creditAfter,
    consumed: Number(dbPlan.price),
    remark: `${dbPlan.name} — 通联支付 ${order.reqsn}`,
    requestId: order.reqsn,
    status: 1,
  });

  logger.info('[Allinpay] 会员履约完成', {
    userId: order.user_id, planType, credits, creditAfter, endTime,
  });
}

// ==================== 充值履约 (P0-4: 走 membershipDao + rechargeDao) ====================

async function fulfillRecharge(order, conn) {
  const rechargeOrder = await rechargeDao.getByOrderNo(order.business_id);
  if (!rechargeOrder) { logger.warn('[Allinpay] 充值订单不存在', { businessId: order.business_id }); return; }

  // 确保 membership 记录存在，再原子递增点数
  await membershipDao.upsert(order.user_id, { credit_balance: 0 }, conn);
  await rechargeDao.markPaid(order.business_id, order.trxid || order.reqsn, conn);
  await creditDao.updateCreditBalance(order.user_id, rechargeOrder.coin_amount, conn);

  // 读取最终余额写日志
  const updated = await membershipDao.findByUserId(order.user_id, conn);
  const creditBefore = (updated?.credit_balance || 0) - rechargeOrder.coin_amount;
  const creditAfter = updated?.credit_balance || 0;

  await creditDao.insertConsumptionLog({
    userId: order.user_id,
    type: 3,
    action: 'recharge_coins',
    creditBefore,
    creditAfter,
    consumed: Number(rechargeOrder.amount),
    remark: `虾币充值 ${rechargeOrder.coin_amount}个 — 通联支付 ${order.reqsn}`,
    requestId: order.reqsn,
    status: 1,
  }, conn);

  logger.info('[Allinpay] 充值履约完成', {
    userId: order.user_id, amount: rechargeOrder.amount, credits: rechargeOrder.coin_amount,
  });
}

// ==================== 查询订单 ====================

export async function queryOrder(reqsn) {
  const order = await allinpayDao.getByReqsn(reqsn);
  if (!order) return null;

  // 防竞态：检查 Redis 锁，callbcak 处理中时返回中间态避免脏读
  let callbackInProgress = false;
  try {
    const { getRedis } = await import('../dao/redis.js');
    const redis = getRedis();
    if (redis) {
      const lock = await redis.get(`notify_lock:${reqsn}`);
      callbackInProgress = !!lock;
    }
  } catch (e) { logger.warn('[Allinpay] Redis unavailable, skip callback lock', { error: e.message }); }

  return {
    reqsn: order.reqsn,
    trxid: order.trxid,
    status: callbackInProgress ? 2 : order.status,  // 2=processing
    amount: Number(order.amount),
    payChannel: order.pay_channel,
    expireTime: order.expire_time,
    payTime: order.pay_time,
    createTime: order.create_time,
  };
}
