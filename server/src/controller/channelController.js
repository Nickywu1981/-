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
  const body = req.validated;
  const id = await channelService.applyChannel(req.tenantId, body);
  return { id, code: ERROR_CODE.CHANNEL_APPLY_SUBMITTED, message: 'Application submitted, pending review' };
});

export const auditChannel = wrapController(async (req) => {
  const body = req.validated;
  await channelService.auditChannel(req.tenantId, req.params.id, body);
  return { code: ERROR_CODE.CHANNEL_AUDIT_DONE, message: 'Audit completed' };
});

export const getDownstreamAgents = wrapController(async (req) => {
  return channelService.getDownstreamAgents(req.tenantId);
});

export const listPolicies = wrapController(async (req) => {
  return channelService.listPolicies(req.tenantId);
});

export const createPolicy = wrapController(async (req) => {
  const body = req.validated;
  const id = await channelService.createPolicy(req.tenantId, body);
  return { id, code: ERROR_CODE.CHANNEL_POLICY_CREATED, message: 'Commission policy created' };
});

export const updatePolicy = wrapController(async (req) => {
  const body = req.validated;
  await channelService.updatePolicy(req.tenantId, req.params.id, body);
  return { code: ERROR_CODE.CHANNEL_POLICY_UPDATED, message: 'Commission policy updated' };
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
