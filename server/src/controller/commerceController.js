/**
 * Commerce Order Controller — 企业端订单管理
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as commerceDao from '../dao/commerceDao.js';

export const listOrders = wrapController(async (req, res) => {
  const { page = 1, pageSize = 20, status, startDate, endDate, keyword } = req.query;
  const data = await commerceDao.listEnterpriseOrders(req.tenantId, { page: +page, pageSize: +pageSize, status, startDate, endDate, keyword });
  return success(res, { list: data.list, total: data.total, page: +page, pageSize: +pageSize });
});

export const getOrderDetail = wrapController(async (req, res) => {
  const order = await commerceDao.getEnterpriseOrderById(req.params.id, req.tenantId);
  if (!order) throw new BusinessError(ERROR_CODE.NOT_FOUND, '订单不存在');
  return success(res, order);
});

export const getOrderStats = wrapController(async (req, res) => {
  const stats = await commerceDao.getEnterpriseOrderStats(req.tenantId);
  return success(res, stats);
});
