import { success } from '../utils/response.js';
import { wrapController } from '../utils/wrapController.js';
import * as customerService from '../services/customerService.js';

export const listCustomers = wrapController(async (req, res) => {
  const result = await customerService.getCustomerList(req.tenantId, req.query);
  return success(res, result);
});

export const getCustomerDetail = wrapController(async (req, res) => {
  const data = await customerService.getCustomerDetail(req.tenantId, Number(req.params.id));
  return success(res, data);
});

export const getCustomerStats = wrapController(async (req, res) => {
  const data = await customerService.getCustomerStats(req.tenantId);
  return success(res, data);
});

export const createTag = wrapController(async (req, res) => {
  const data = await customerService.createTag(req.tenantId, req.body);
  return success(res, data, '标签已创建');
});

export const listTags = wrapController(async (req, res) => {
  const data = await customerService.listTags(req.tenantId);
  return success(res, data);
});

export const updateTag = wrapController(async (req, res) => {
  const data = await customerService.updateTag(req.tenantId, Number(req.params.id), req.body);
  return success(res, data, '标签已更新');
});

export const deleteTag = wrapController(async (req, res) => {
  await customerService.deleteTag(req.tenantId, Number(req.params.id));
  return success(res, null, '标签已删除');
});

export const tagCustomer = wrapController(async (req, res) => {
  await customerService.tagCustomer(req.tenantId, Number(req.params.tagId), Number(req.body.userId));
  return success(res, null, '已打标');
});

export const untagCustomer = wrapController(async (req, res) => {
  await customerService.untagCustomer(req.tenantId, Number(req.params.tagId), Number(req.body.userId));
  return success(res, null, '已取消打标');
});

export const batchTagCustomers = wrapController(async (req, res) => {
  await customerService.batchTagCustomers(req.tenantId, Number(req.params.tagId), req.body.userIds);
  return success(res, null, '批量打标完成');
});
