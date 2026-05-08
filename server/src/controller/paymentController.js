import * as payment from '../services/paymentService.js';
import * as allinpayService from '../services/allinpayService.js';
import { success, listResult, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 套餐列表（公开） ====================

export async function getPlans(_req, res, next) {
  try {
    return success(res, payment.getPlans());
  } catch (err) { next(err); }
}

// ==================== 创建支付订单（通联聚合支付） ====================

export async function createOrder(req, res, next) {
  try {
    const { planType, payChannel = 'wechat' } = req.body;
    if (!planType || ![1, 2, 3].includes(planType)) {
      return error(res, ERROR_CODE.PARAM_INVALID, '请选择有效套餐（1=月卡/2=季卡/3=年卡）');
    }
    const data = await payment.createPaymentOrder(req.user.id, { planType, payChannel });
    return success(res, data, '订单创建成功');
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

// ==================== 查询订单状态 ====================

export async function getOrderStatus(req, res, next) {
  try {
    const data = await payment.getOrder(req.params.reqsn);
    return success(res, data);
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

// ==================== 检查支付结果（前端轮询用） ====================

export async function checkPaymentResult(req, res, next) {
  try {
    const data = await allinpayService.queryOrder(req.params.reqsn);
    if (!data) return error(res, ERROR_CODE.PAY_ORDER_NOT_FOUND, '订单不存在');
    return success(res, data);
  } catch (err) { next(err); }
}

// ==================== 沙箱支付（仅开发环境） ====================

export async function sandboxPay(req, res, next) {
  try {
    const data = await payment.sandboxPay(req.params.reqsn);
    return success(res, data, '支付成功，会员已开通');
  } catch (err) {
    if (err.statusCode) return error(res, err.statusCode, err.message);
    next(err);
  }
}

// ==================== 账单 ====================

export async function getBillingHistory(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const rows = await payment.getBillingHistory(req.user.id);
    return listResult(res, { rows, total: rows.length, page: page || 1, pageSize: pageSize || 20 });
  } catch (err) { next(err); }
}
