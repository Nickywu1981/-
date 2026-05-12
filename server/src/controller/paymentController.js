import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as payment from '../services/paymentService.js';
import * as allinpayService from '../services/allinpayService.js';
import { success, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 套餐列表（公开） ====================

export const getPlans = wrapController(async (_req, res, next) => {
    return success(res, payment.getPlans());
  });

// ==================== 创建支付订单（通联聚合支付） ====================

export const createOrder = wrapController(async (req, res, next) => {
    const { planType, payChannel = 'wechat' } = req.body;
    if (!planType || ![1, 2, 3].includes(planType)) {
      throw new BusinessError(ERROR_CODE.PARAM_INVALID, '请选择有效套餐（1=月卡/2=季卡/3=年卡）');
    }
    const data = await payment.createPaymentOrder(req.user.id, { planType, payChannel });
    return success(res, data, '订单创建成功');
  });

// ==================== 查询订单状态 ====================

export const getOrderStatus = wrapController(async (req, res, next) => {
    const data = await payment.getOrder(req.params.reqsn);
    return success(res, data);
  });

// ==================== 检查支付结果（前端轮询用） ====================

export const checkPaymentResult = wrapController(async (req, res, next) => {
    const data = await allinpayService.queryOrder(req.params.reqsn);
    if (!data) throw new BusinessError(ERROR_CODE.PAY_ORDER_NOT_FOUND, '订单不存在');
    return success(res, data);
  });

// ==================== 沙箱支付（仅开发环境） ====================

export const sandboxPay = wrapController(async (req, res, next) => {
    const data = await payment.sandboxPay(req.params.reqsn);
    return success(res, data, '支付成功，会员已开通');
  });

// ==================== 账单 ====================

export const getBillingHistory = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query);
    const rows = await payment.getBillingHistory(req.user.id);
    return listResult(res, { rows, total: rows.length, page: page || 1, pageSize: pageSize || 20 });
  });
