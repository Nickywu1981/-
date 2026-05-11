import * as channelService from '../services/channelService.js';
import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';

const getTenantId = (req) => {
  const tenantId = req.user?.entId || req.user?.tenantId;
  if (!tenantId) throw new BusinessError(401, '认证已过期，请重新登录');
  return tenantId;
};

export const listChannels = wrapController(async (req) => {
  const query = req.validated || req.query;
  const { page, pageSize, status } = query;
  return channelService.listChannels(getTenantId(req), { page, pageSize, status });
});

export const getChannelDetail = wrapController(async (req) => {
  return channelService.getChannelDetail(getTenantId(req), req.params.id);
});

export const applyChannel = wrapController(async (req) => {
  const body = req.validated || req.body;
  const id = await channelService.applyChannel(getTenantId(req), body);
  return { id, message: '申请已提交，等待审核' };
});

export const auditChannel = wrapController(async (req) => {
  const body = req.validated || req.body;
  await channelService.auditChannel(getTenantId(req), req.params.id, body);
  return { message: '审核完成' };
});

export const getDownstreamAgents = wrapController(async (req) => {
  return channelService.getDownstreamAgents(getTenantId(req));
});

export const listPolicies = wrapController(async (req) => {
  return channelService.listPolicies(getTenantId(req));
});

export const createPolicy = wrapController(async (req) => {
  const body = req.validated || req.body;
  const id = await channelService.createPolicy(getTenantId(req), body);
  return { id, message: '分润政策创建成功' };
});

export const updatePolicy = wrapController(async (req) => {
  const body = req.validated || req.body;
  await channelService.updatePolicy(getTenantId(req), req.params.id, body);
  return { message: '分润政策更新成功' };
});

export const getPerformance = wrapController(async (req) => {
  const query = req.validated || req.query;
  const { page, pageSize, startDate, endDate, childTenantId } = query;
  return channelService.getPerformance(getTenantId(req), {
    page, pageSize, startDate, endDate, childTenantId,
  });
});

export const getPerformanceSummary = wrapController(async (req) => {
  const query = req.validated || req.query;
  const { startDate, endDate } = query;
  if (!startDate || !endDate) throw new BusinessError(400, '请提供统计起止日期');
  return channelService.getPerformanceSummary(getTenantId(req), startDate, endDate);
});
