import * as channelDao from '../dao/channelDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 渠道关系管理 ====================

export async function listChannels(tenantId, query) {
  return channelDao.findRelationsByTenant(tenantId, query);
}

export async function getChannelDetail(tenantId, id) {
  const rel = await channelDao.findRelationById(id);
  if (!rel || rel.tenant_id !== tenantId) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return rel;
}

export async function applyChannel(tenantId, { agentCode }) {
  const parent = await channelDao.findTenantByAgentCode(agentCode);
  if (!parent) throw new BusinessError(ERROR_CODE.PARAM_INVALID);

  const parentId = parent.id;
  if (parentId === tenantId) throw new BusinessError(ERROR_CODE.PARAM_ERROR);

  const dup = await channelDao.findRelationByPair(parentId, tenantId);
  if (dup) throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);

  return channelDao.createRelation({ tenantId: parentId, childTenantId: tenantId, level: 1 });
}

export async function auditChannel(tenantId, id, { status, auditRemark }) {
  const rel = await channelDao.findRelationById(id);
  if (!rel || rel.tenant_id !== tenantId) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return channelDao.auditRelation(id, tenantId, { status, auditRemark });
}

export async function getDownstreamAgents(tenantId) {
  return channelDao.findDownstreamAgents(tenantId);
}

// ==================== 分润政策 ====================

export async function listPolicies(tenantId) {
  return channelDao.listPolicies(tenantId);
}

export async function createPolicy(tenantId, data) {
  return channelDao.createPolicy({ ...data, tenantId });
}

export async function updatePolicy(tenantId, id, data) {
  const policy = await channelDao.getPolicyById(id, tenantId);
  if (!policy) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return channelDao.updatePolicy(id, tenantId, data);
}

// ==================== 渠道业绩 ====================

export async function getPerformance(tenantId, query) {
  return channelDao.getPerformance(tenantId, query);
}

export async function getPerformanceSummary(tenantId, startDate, endDate) {
  return channelDao.getPerformanceSummary(tenantId, startDate, endDate);
}
