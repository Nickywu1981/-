import rechargeDao from '../dao/rechargeDao.js';
import * as allinpayService from '../services/allinpayService.js';
import * as creditDao from '../dao/creditDao.js';
import crypto from 'crypto';
import pool from '../dao/db.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { RECHARGE_PAY_STATUS } from '../constants/domainStatus.js';

export function getRates() {
  return [
    { amount: 10, coin: 100, label: '10元=100虾币', tag: '' },
    { amount: 50, coin: 550, label: '50元=550虾币', tag: '送50' },
    { amount: 100, coin: 1200, label: '100元=1200虾币', tag: '送200' },
    { amount: 200, coin: 2500, label: '200元=2500虾币', tag: '送500' },
    { amount: 500, coin: 7000, label: '500元=7000虾币', tag: '送2000' },
  ];
}

export async function createOrder(userId, tenantId, clientIp, { amount, payChannel }) {
  const rates = rechargeDao.COIN_RATES;
  if (!amount || !rates[String(amount)]) throw new BusinessError(400, '无效的充值金额');
  if (!['wechat', 'alipay', 'unionpay'].includes(payChannel)) throw new BusinessError(400, '支付方式无效');

  const orderNo = 'RC' + Date.now() + crypto.randomBytes(4).toString('hex');
  const coinAmount = rates[String(amount)];

  // 创建充值订单
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);
  await rechargeDao.create({ tenantId, userId, orderNo, amount, coinAmount, payChannel, clientIp, expireTime });

  // 调通联支付创建统一下单（失败时需回滚充值订单）
  try {
    const result = await allinpayService.createUnifiedOrder({
      userId, orderType: 'recharge', businessId: orderNo, amount, payChannel,
      body: `Movio虾币充值${amount}元`,
    });
    return { orderNo, amount, coinAmount, payChannel, payUrl: result.payUrl, reqsn: result.reqsn, expireTime };
  } catch (e) {
    await rechargeDao.markFailed(orderNo);
    throw e;
  }
}

export async function handleCallback(channel, body) {
  // 旧版 mock 回调兼容 → 透传给 allinpayService
  return allinpayService.handleNotify(body);
}

export async function listUserOrders(userId, tenantId) {
  return rechargeDao.listByUser(userId, tenantId);
}

export async function listAllOrders() {
  return rechargeDao.listAll();
}

export async function refundOrder(orderNo) {
  // 在事务内 SELECT FOR UPDATE 防止并发退款
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query('SELECT * FROM recharge_order WHERE order_no = ? FOR UPDATE', [orderNo]);
    if (!order || order.pay_status !== RECHARGE_PAY_STATUS.PAID) {
      await conn.rollback();
      throw new BusinessError(404, '订单不存在或未支付');
    }

    await rechargeDao.markRefunded(orderNo);
    await creditDao.updateCreditBalance(order.user_id, -order.coin_amount, conn);
    await creditDao.insertConsumptionLog({
      userId: order.user_id, type: 3, action: 'refund',
      creditBefore: null, creditAfter: null, consumed: -order.coin_amount,
      remark: `充值退款 — 订单 ${orderNo}`, requestId: orderNo, status: 2,
    }, conn);
    await conn.commit();
    logger.info('[Recharge] 退款完成', { orderNo, userId: order.user_id, coinAmount: order.coin_amount });
  } catch (e) {
    await conn.rollback();
    logger.error('[Recharge] 退款失败', { orderNo, error: e.message });
    throw new BusinessError(500, '退款处理失败');
  } finally {
    conn.release();
  }
  return true;
}
