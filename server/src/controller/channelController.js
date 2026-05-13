import * as channelService from '../services/channelService.js';
import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listChannels = wrapController(async (req) => {
  const query = req.validated || req.query;
  const { page, pageSize, status } = query;
  return channelService.listChannels(req.tenantId, { page, pageSize, status });
});

export const getChannelDetail = wrapController(async (req) => {
  return channelService.getChannelDetail(req.tenantId, req.params.id);
});

export const applyChannel = wrapController(async (req) => {
  const body = req.validated || req.body;
  const id = await channelService.applyChannel(req.tenantId, body);
  return { id, message: '申请已提交，等待审核' };
});

export const auditChannel = wrapController(async (req) => {
  const body = req.validated || req.body;
  await channelService.auditChannel(req.tenantId, req.params.id, body);
  return { message: '审核完成' };
});

export const getDownstreamAgents = wrapController(async (req) => {
  return channelService.getDownstreamAgents(req.tenantId);
});

export const listPolicies = wrapController(async (req) => {
  return channelService.listPolicies(req.tenantId);
});

export const createPolicy = wrapController(async (req) => {
  const body = req.validated || req.body;
  const id = await channelService.createPolicy(req.tenantId, body);
  return { id, message: '分润政策创建成功' };
});

export const updatePolicy = wrapController(async (req) => {
  const body = req.validated || req.body;
  await channelService.updatePolicy(req.tenantId, req.params.id, body);
  return { message: '分润政策更新成功' };
});

export const getPerformance = wrapController(async (req) => {
  const query = req.validated || req.query;
  const { page, pageSize, startDate, endDate, childTenantId } = query;
  return channelService.getPerformance(req.tenantId, {
    page, pageSize, startDate, endDate, childTenantId,
  });
});

export const getPerformanceSummary = wrapController(async (req) => {
  const query = req.validated || req.query;
  const { startDate, endDate } = query;
  if (!startDate || !endDate) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  return channelService.getPerformanceSummary(req.tenantId, startDate, endDate);
});
