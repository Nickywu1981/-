import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as rechargeService from '../services/rechargeService.js';
import * as allinpayService from '../services/allinpayService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const getRates = wrapController(async () => {
  return rechargeService.getRates();
});

export const createOrder = wrapController(async (req) => {
    const { amount, channel } = req.validated;
    return rechargeService.createOrder(req.user.id, req.tenantId, req.ip, { amount, payChannel: channel || 'wechat' });
});

export const handleCallback = wrapController(async (req, res) => {
    await rechargeService.handleCallback(req.params.channel, req.body);
    res.send('success');
});

export const checkPaymentResult = wrapController(async (req) => {
    const data = await allinpayService.queryOrder(req.params.reqsn);
    if (!data) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return data;
});

export const listUserOrders = wrapController(async (req) => {
    return rechargeService.listUserOrders(req.user.id, req.tenantId);
});

export const listAllOrders = wrapController(async (req) => {
    // super_admin 看全量，普通admin只看自己租户
    const tenantId = req.user.role === 'super_admin' ? undefined : req.user.tenantId;
    return rechargeService.listAllOrders(tenantId);
});

export const refundOrder = wrapController(async (req) => {
    await rechargeService.refundOrder(req.params.orderNo);
    return null;
});
