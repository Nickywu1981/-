import rechargeDao from '../dao/rechargeDao.js';
import * as allinpayService from '../services/allinpayService.js';
import crypto from 'crypto';

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
  if (!amount || !rates[String(amount)]) throw Object.assign(new Error('无效的充值金额'), { statusCode: 400 });
  if (!['wechat', 'alipay', 'unionpay'].includes(payChannel)) throw Object.assign(new Error('支付方式无效'), { statusCode: 400 });

  const orderNo = 'RC' + Date.now() + crypto.randomBytes(4).toString('hex');
  const coinAmount = rates[String(amount)];

  // 创建充值订单
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);
  await rechargeDao.create({ tenantId, userId, orderNo, amount, coinAmount, payChannel, clientIp, expireTime });

  // 调通联支付创建统一下单
  const result = await allinpayService.createUnifiedOrder({
    userId, orderType: 'recharge', businessId: orderNo, amount, payChannel,
    body: `Movio虾币充值${amount}元`,
  });

  return { orderNo, amount, coinAmount, payChannel, payUrl: result.payUrl, reqsn: result.reqsn, expireTime };
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
  const order = await rechargeDao.getByOrderNo(orderNo);
  if (!order || order.pay_status !== 1) throw Object.assign(new Error('订单不存在或未支付'), { statusCode: 404 });
  await rechargeDao.markRefunded(orderNo);
  return true;
}
