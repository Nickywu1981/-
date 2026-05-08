import * as rechargeService from '../services/rechargeService.js';
import * as allinpayService from '../services/allinpayService.js';
import { success, error } from '../utils/response.js';

export async function getRates(req, res) {
  success(res, rechargeService.getRates());
}

export async function createOrder(req, res) {
  try {
    const { amount, channel } = req.body;
    const data = await rechargeService.createOrder(req.user.id, req.tenantId, req.ip, { amount, payChannel: channel || 'wechat' });
    success(res, data, '订单已创建');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function handleCallback(req, res) {
  try {
    await rechargeService.handleCallback(req.params.channel, req.body);
    res.send('success');
  } catch (e) { console.error('[Callback Error]', e); res.send('fail'); }
}

export async function checkPaymentResult(req, res) {
  try {
    const data = await allinpayService.queryOrder(req.params.reqsn);
    if (!data) return error(res, 404, '订单不存在');
    success(res, data);
  } catch (e) { error(res, 500, e.message); }
}

export async function listUserOrders(req, res) {
  try {
    const rows = await rechargeService.listUserOrders(req.user.id, req.tenantId);
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function listAllOrders(req, res) {
  try {
    const rows = await rechargeService.listAllOrders();
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function refundOrder(req, res) {
  try {
    await rechargeService.refundOrder(req.params.orderNo);
    success(res, null, '退款成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}
