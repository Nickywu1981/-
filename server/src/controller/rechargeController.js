import { wrapController } from '../utils/wrapController.js';
import * as rechargeService from '../services/rechargeService.js';
import * as allinpayService from '../services/allinpayService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const getRates = wrapController(async (req, res) => {
  success(res, rechargeService.getRates());
});

export const createOrder = wrapController(async (req, res) => {
    const { amount, channel } = req.body;
    const data = await rechargeService.createOrder(req.user.id, req.tenantId, req.ip, { amount, payChannel: channel || 'wechat' });
    success(res, data, '订单已创建');
})

export const handleCallback = wrapController(async (req, res) => {
    await rechargeService.handleCallback(req.params.channel, req.body);
    res.send('success');
})

export const checkPaymentResult = wrapController(async (req, res) => {
    const data = await allinpayService.queryOrder(req.params.reqsn);
    if (!data) return error(res, ERROR_CODE.NOT_FOUND, '订单不存在');
    success(res, data);
})

export const listUserOrders = wrapController(async (req, res) => {
    const rows = await rechargeService.listUserOrders(req.user.id, req.tenantId);
    success(res, rows);
})

export const listAllOrders = wrapController(async (req, res) => {
    const rows = await rechargeService.listAllOrders();
    success(res, rows);
})

export const refundOrder = wrapController(async (req, res) => {
    await rechargeService.refundOrder(req.params.orderNo);
    success(res, null, '退款成功');
})
